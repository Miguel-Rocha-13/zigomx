/**
***********************************************************************
    Backend ziGO (Google Apps Script + Google Sheets)

    Este archivo NO se sirve desde el sitio: se pega en el editor de
    Apps Script de la hoja de cálculo y se publica como aplicación web
    (Ejecutar como: yo · Acceso: cualquier persona).

    Qué hace:
    - Recibe los eventos anónimos de tráfico del sitio y los comentarios
      de la encuesta y del buzón (cualquier visitante puede escribir).
    - Entrega las estadísticas SOLO a los correos autorizados, que entran
      con un token de 6 dígitos enviado a su propio buzón.
    - Pide un token nuevo para descargar y para borrar; borrar queda
      reservado al rol "admin".

    Todo viaja por POST con cuerpo JSON en texto plano. El GET no
    devuelve datos: así nadie puede leer las estadísticas con la URL.
***********************************************************************
 */

/*============================================================
    0. CONFIGURACIÓN
============================================================*/
const CONFIG = {
  HOJA_EVENTOS: 'Eventos_Trafico',
  HOJA_COMENTARIOS: 'Buzon_Comentarios',
  HOJA_BITACORA: 'Bitacora_Admin',

  // Únicos correos que pueden ver el panel. "admin" además puede borrar.
  USUARIOS: {
    'miguel.rochab@zigomx.com': { rol: 'admin', nombre: 'Miguel' },
    'angel.rochab@zigomx.com': { rol: 'consulta', nombre: 'Ángel' },
    'skar@zigomx.com': { rol: 'consulta', nombre: 'Escarlet' }
  },

  // A quién se le avisa por correo cuando llega algo al buzón de quejas y sugerencias
  CORREOS_BUZON: ['angel.rochab@zigomx.com', 'miguel.rochab@zigomx.com'],

  MINUTOS_TOKEN: 10,
  MINUTOS_SESION: 60,
  INTENTOS_TOKEN: 5,
  TOKENS_POR_CUARTO_DE_HORA: 5,
  EVENTOS_POR_MINUTO: 400,

  // Ciudad de México dejó el horario de verano en 2022: UTC-6 todo el año
  DESFASE_MINUTOS: -360
};

const ENCABEZADOS_EVENTOS = [
  'Fecha_ISO', 'Tipo_Evento', 'Pagina', 'Fuente_Trafico', 'Referrer', 'Detalle', 'Dispositivo',
  'Fuente_Detalle', 'Campana', 'Pais', 'Region', 'Ciudad', 'Navegador', 'Sistema', 'Idioma',
  'Pantalla', 'Visitante', 'Sesion', 'Visitante_Nuevo', 'Valor'
];

const ENCABEZADOS_COMENTARIOS = [
  'Fecha_ISO', 'Folio', 'Categoria', 'Calificacion', 'Nombre', 'Mensaje', 'Pagina', 'Estado'
];

const ENCABEZADOS_BITACORA = ['Fecha_ISO', 'Correo', 'Accion', 'Detalle'];

const EVENTOS_PERMITIDOS = [
  'sesion_nueva', 'page_view', 'salida_pagina', 'busqueda', 'prueba_ar', 'diagnostico_rostro_ia',
  'consentimiento_camara', 'modalidad_cita', 'conversion_whatsapp', 'conversion_telegram',
  'conversion_llamada', 'conversion_agenda', 'conversion_buzonQuejas', 'conversion_capturasAR',
  'conversion_redSocial'
];

const FUENTES_PERMITIDAS = ['Directo', 'Buscadores', 'Redes sociales', 'Otros sitios', 'Campañas'];

/*============================================================
    1. UTILIDADES: RESPUESTA, SANITIZACIÓN Y HOJAS
============================================================*/
function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Deja un valor listo para una celda: recorta la longitud y neutraliza los textos
 * que Sheets interpretaría como fórmula (=, +, -, @), para que nadie pueda inyectar
 * fórmulas desde un formulario público.
 */
function limpiarCelda(valor, maxLen) {
  let texto = String(valor === null || valor === undefined ? '' : valor).replace(/[\u0000-\u001f]/g, ' ').trim();
  if (maxLen && texto.length > maxLen) texto = texto.slice(0, maxLen);
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto;
}

function escaparHtml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Devuelve la hoja pedida. Si no existe la crea, y si existe con menos columnas
 * (hojas de la versión anterior) completa los encabezados sin tocar los datos.
 */
function obtenerHoja(nombre, encabezados) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  const nueva = !hoja;
  if (nueva) hoja = libro.insertSheet(nombre);
  if (nueva || hoja.getLastColumn() < encabezados.length) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function leerFilas(nombre, encabezados) {
  const hoja = obtenerHoja(nombre, encabezados);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  return hoja.getRange(2, 1, ultima - 1, encabezados.length).getValues();
}

function aFecha(valor) {
  if (valor instanceof Date) return valor;
  const fecha = new Date(String(valor));
  return isNaN(fecha.getTime()) ? null : fecha;
}

/** Fecha desplazada a la hora de Ciudad de México; se lee con los métodos getUTC*. */
function horaLocal(fecha) {
  return new Date(fecha.getTime() + CONFIG.DESFASE_MINUTOS * 60000);
}

function sha256(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function anotarBitacora(correo, accion, detalle) {
  obtenerHoja(CONFIG.HOJA_BITACORA, ENCABEZADOS_BITACORA)
    .appendRow([new Date().toISOString(), correo, accion, limpiarCelda(detalle || '', 200)]);
}

/*============================================================
    2. ENTRADAS DE LA APLICACIÓN WEB
============================================================*/
function doGet() {
  return responder({ ok: true, servicio: 'ziGO', version: 3 });
}

function doPost(e) {
  try {
    const crudo = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    if (crudo.length > 20000) return responder({ ok: false, error: 'Solicitud demasiado grande' });
    const datos = JSON.parse(crudo);

    switch (datos.accion) {
      case 'evento': return responder(registrarEvento(datos));
      case 'feedback': return responder(registrarComentario(datos));
      case 'solicitar_token': return responder(solicitarToken(datos));
      case 'verificar_token': return responder(iniciarSesion(datos));
      case 'estadisticas': return responder(entregarEstadisticas(datos));
      case 'exportar': return responder(exportarDatos(datos));
      case 'borrar': return responder(borrarDatos(datos));
      case 'cerrar_sesion': return responder(cerrarSesion(datos));
      default: return responder({ ok: false, error: 'Acción no reconocida' });
    }
  } catch (err) {
    console.error(err);
    return responder({ ok: false, error: 'Solicitud no válida' });
  }
}

/*============================================================
    3. ESCRITURA PÚBLICA: EVENTOS DE TRÁFICO Y COMENTARIOS
============================================================*/

/** Freno contra inundaciones: descarta eventos cuando se supera el tope por minuto. */
function hayCupoDeEventos() {
  const cache = CacheService.getScriptCache();
  const clave = 'evt_' + Math.floor(Date.now() / 60000);
  const usados = Number(cache.get(clave) || 0);
  if (usados >= CONFIG.EVENTOS_POR_MINUTO) return false;
  cache.put(clave, String(usados + 1), 120);
  return true;
}

function registrarEvento(d) {
  const tipo = limpiarCelda(d.tipo, 40);
  if (EVENTOS_PERMITIDOS.indexOf(tipo) === -1) return { ok: false, error: 'Tipo de evento no válido' };
  if (!hayCupoDeEventos()) return { ok: true };

  const fuente = FUENTES_PERMITIDAS.indexOf(d.fuente) === -1 ? 'Directo' : d.fuente;
  const valor = Math.max(0, Math.min(86400, Number(d.valor) || 0));

  obtenerHoja(CONFIG.HOJA_EVENTOS, ENCABEZADOS_EVENTOS).appendRow([
    new Date().toISOString(),
    tipo,
    limpiarCelda(d.pagina || 'index.html', 60),
    fuente,
    limpiarCelda(d.referrer, 200),
    limpiarCelda(d.detalle, 160),
    limpiarCelda(d.dispositivo || 'Escritorio', 20),
    limpiarCelda(d.fuenteDetalle, 60),
    limpiarCelda(d.campana, 80),
    limpiarCelda(d.pais || 'Desconocido', 60),
    limpiarCelda(d.region, 60),
    limpiarCelda(d.ciudad, 60),
    limpiarCelda(d.navegador, 30),
    limpiarCelda(d.sistema, 30),
    limpiarCelda(d.idioma, 12),
    limpiarCelda(d.pantalla, 12),
    limpiarCelda(d.visitante, 40),
    limpiarCelda(d.sesion, 40),
    d.nuevo ? 'Si' : 'No',
    valor
  ]);
  return { ok: true };
}

function registrarComentario(d) {
  // El campo "hp" es una trampa invisible: solo lo rellenan los bots
  if (d.hp) return { ok: true, folio: '' };
  if (!hayCupoDeEventos()) return { ok: false, error: 'Intenta de nuevo en un minuto' };

  const mensaje = limpiarCelda(d.mensaje, 800);
  const categoria = limpiarCelda(d.categoria || 'Encuesta', 60);
  const nombre = limpiarCelda(d.nombre || 'Anónimo', 80);
  const calificacion = Math.min(5, Math.max(1, Math.round(Number(d.calificacion) || 3)));
  const esBuzon = d.origen === 'buzon';
  if (esBuzon && !mensaje) return { ok: false, error: 'Escribe tu mensaje' };

  const ahora = new Date();
  const folio = 'ZIGO-' + Utilities.formatDate(ahora, 'America/Mexico_City', 'yyMMdd') + '-' +
    Utilities.getUuid().slice(0, 5).toUpperCase();

  obtenerHoja(CONFIG.HOJA_COMENTARIOS, ENCABEZADOS_COMENTARIOS).appendRow([
    ahora.toISOString(), folio, categoria, calificacion, nombre, mensaje, limpiarCelda(d.pagina, 60), 'Nuevo'
  ]);

  if (esBuzon) {
    try {
      MailApp.sendEmail({
        to: CONFIG.CORREOS_BUZON.join(','),
        subject: '[' + folio + '] ' + categoria + ' · Buzón ziGO',
        name: 'Buzón ziGO',
        htmlBody: '<h2 style="color:#01707F;">Nuevo mensaje en el buzón de ziGO</h2>' +
          '<p><b>Folio:</b> ' + folio + '<br><b>Tipo:</b> ' + escaparHtml(categoria) +
          '<br><b>Nombre:</b> ' + escaparHtml(nombre) + '<br><b>Página:</b> ' + escaparHtml(limpiarCelda(d.pagina, 60)) + '</p>' +
          '<p style="padding:12px;border-left:4px solid #01707F;background:#f2f8f9;">' + escaparHtml(mensaje) + '</p>'
      });
    } catch (err) {
      console.error('No se pudo enviar el aviso del buzón: ' + err);
    }
  }
  return { ok: true, folio: folio };
}

/*============================================================
    4. ACCESO AL PANEL: TOKEN POR CORREO Y SESIÓN
============================================================*/
function generarToken() {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Date.now() + Math.random());
  let numero = 0;
  for (let i = 0; i < 6; i++) numero = (numero * 256 + (bytes[i] & 0xff)) % 1000000;
  return ('000000' + numero).slice(-6);
}

function usuarioDe(correo) {
  const limpio = String(correo || '').trim().toLowerCase();
  return CONFIG.USUARIOS[limpio] ? { correo: limpio, rol: CONFIG.USUARIOS[limpio].rol, nombre: CONFIG.USUARIOS[limpio].nombre } : null;
}

function sesionValida(idSesion) {
  if (!idSesion || String(idSesion).length < 30) return null;
  const cache = CacheService.getScriptCache();
  const cruda = cache.get('ses_' + idSesion);
  if (!cruda) return null;
  cache.put('ses_' + idSesion, cruda, CONFIG.MINUTOS_SESION * 60);
  return JSON.parse(cruda);
}

/**
 * Envía un token de 6 dígitos al correo del usuario.
 * motivo "acceso" abre el panel; "exportar" y "borrar" confirman esas dos acciones
 * dentro de una sesión ya abierta. La respuesta es idéntica exista o no el correo,
 * para no revelar qué direcciones están autorizadas.
 */
function solicitarToken(d) {
  const respuestaNeutra = { ok: true, mensaje: 'Si el correo está autorizado, recibirá un token en unos segundos.' };
  const motivo = ['acceso', 'exportar', 'borrar'].indexOf(d.motivo) === -1 ? 'acceso' : d.motivo;

  let usuario;
  if (motivo === 'acceso') {
    usuario = usuarioDe(d.correo);
    if (!usuario) return respuestaNeutra;
  } else {
    usuario = sesionValida(d.sesion);
    if (!usuario) return { ok: false, error: 'La sesión expiró. Vuelve a entrar.', sesionExpirada: true };
    if (motivo === 'borrar' && usuario.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede borrar.' };
  }

  const cache = CacheService.getScriptCache();
  const claveLimite = 'lim_' + usuario.correo;
  const pedidos = Number(cache.get(claveLimite) || 0);
  if (pedidos >= CONFIG.TOKENS_POR_CUARTO_DE_HORA) {
    return { ok: false, error: 'Demasiadas solicitudes. Espera 15 minutos.' };
  }
  cache.put(claveLimite, String(pedidos + 1), 900);

  const token = generarToken();
  const claveToken = 'tok_' + motivo + '_' + usuario.correo;
  cache.put(claveToken, JSON.stringify({ hash: sha256(token + '|' + claveToken), intentos: 0 }), CONFIG.MINUTOS_TOKEN * 60);

  const textoMotivo = { acceso: 'entrar al panel de estadísticas', exportar: 'descargar las estadísticas', borrar: 'BORRAR las estadísticas' }[motivo];
  MailApp.sendEmail({
    to: usuario.correo,
    subject: 'Token ziGO: ' + token,
    name: 'ziGO Seguridad',
    htmlBody: '<div style="font-family:Arial,sans-serif;max-width:420px;">' +
      '<h2 style="color:#01707F;margin-bottom:4px;">Token de seguridad ziGO</h2>' +
      '<p>Hola ' + usuario.nombre + ', este es tu código para <b>' + textoMotivo + '</b>:</p>' +
      '<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#02102b;margin:12px 0;">' + token + '</p>' +
      '<p style="color:#555;">Vence en ' + CONFIG.MINUTOS_TOKEN + ' minutos y sirve una sola vez. ' +
      'Si tú no lo pediste, ignora este correo: nadie puede entrar sin el código.</p></div>'
  });
  return respuestaNeutra;
}

/** Comprueba un token y lo invalida. Devuelve true solo si coincide y no ha vencido. */
function consumirToken(motivo, correo, token) {
  const cache = CacheService.getScriptCache();
  const claveToken = 'tok_' + motivo + '_' + correo;
  const cruda = cache.get(claveToken);
  if (!cruda) return false;

  const guardado = JSON.parse(cruda);
  const coincide = guardado.hash === sha256(String(token || '').trim() + '|' + claveToken);
  if (coincide) {
    cache.remove(claveToken);
    return true;
  }
  guardado.intentos++;
  if (guardado.intentos >= CONFIG.INTENTOS_TOKEN) cache.remove(claveToken);
  else cache.put(claveToken, JSON.stringify(guardado), CONFIG.MINUTOS_TOKEN * 60);
  return false;
}

function iniciarSesion(d) {
  const usuario = usuarioDe(d.correo);
  if (!usuario || !consumirToken('acceso', usuario.correo, d.token)) {
    return { ok: false, error: 'Token incorrecto o vencido.' };
  }
  const idSesion = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('ses_' + idSesion, JSON.stringify(usuario), CONFIG.MINUTOS_SESION * 60);
  anotarBitacora(usuario.correo, 'Inicio de sesión', '');
  return { ok: true, sesion: idSesion, rol: usuario.rol, nombre: usuario.nombre };
}

function cerrarSesion(d) {
  if (d.sesion) CacheService.getScriptCache().remove('ses_' + d.sesion);
  return { ok: true };
}

/*============================================================
    5. LECTURA PROTEGIDA: ESTADÍSTICAS AGREGADAS
============================================================*/
function sumar(mapa, clave, cantidad) {
  const k = clave === '' || clave === null || clave === undefined ? 'Sin dato' : String(clave);
  mapa[k] = (mapa[k] || 0) + (cantidad === undefined ? 1 : cantidad);
}

function entregarEstadisticas(d) {
  const usuario = sesionValida(d.sesion);
  if (!usuario) return { ok: false, error: 'La sesión expiró. Vuelve a entrar.', sesionExpirada: true };

  // El panel pide un periodo en días (0 = todo el historial)
  const dias = Math.max(0, Math.min(3650, Number(d.dias) || 0));
  const desde = dias ? Date.now() - dias * 86400000 : 0;

  const r = {
    ok: true, rol: usuario.rol, nombre: usuario.nombre, generado: new Date().toISOString(), dias: dias,
    resumen: { sesiones: 0, visitantes: 0, paginasVistas: 0, nuevos: 0, recurrentes: 0, duracionMedia: 0, conversiones: 0, pruebasAR: 0, diagnosticos: 0, consentimientos: 0 },
    fuentes: { 'Directo': 0, 'Buscadores': 0, 'Redes sociales': 0, 'Otros sitios': 0, 'Campañas': 0 },
    buscadores: {}, redes: {}, sitios: {}, campanas: {},
    paises: {}, regiones: {}, ciudades: {},
    paginas: {}, tiempoPagina: {},
    dispositivos: {}, navegadores: {}, sistemas: {}, idiomas: {},
    porDia: {}, porHora: new Array(24).fill(0), porDiaSemana: new Array(7).fill(0),
    armazones: {}, rostros: {}, conversiones: {}, busquedas: {}, busquedasSinResultado: {}, modalidades: {},
    satisfaccion: { promedio: 0, total: 0, distribucion: [0, 0, 0, 0, 0] },
    comentarios: []
  };

  const visitantes = {};
  const segundosPagina = {};
  const salidasPagina = {};
  let segundosTotales = 0;
  let salidas = 0;

  leerFilas(CONFIG.HOJA_EVENTOS, ENCABEZADOS_EVENTOS).forEach(function (f) {
    const fecha = aFecha(f[0]);
    if (!fecha || fecha.getTime() < desde) return;
    const tipo = String(f[1]);
    const pagina = String(f[2] || 'index.html');
    const detalle = String(f[5] || '');
    const local = horaLocal(fecha);
    const dia = local.toISOString().slice(0, 10);

    if (tipo === 'sesion_nueva') {
      r.resumen.sesiones++;
      const fuente = FUENTES_PERMITIDAS.indexOf(String(f[3])) === -1 ? 'Directo' : String(f[3]);
      r.fuentes[fuente]++;
      const fuenteDetalle = String(f[7] || '');
      if (fuente === 'Buscadores') sumar(r.buscadores, fuenteDetalle);
      else if (fuente === 'Redes sociales') sumar(r.redes, fuenteDetalle);
      else if (fuente === 'Otros sitios') sumar(r.sitios, fuenteDetalle);
      else if (fuente === 'Campañas') sumar(r.campanas, String(f[8] || fuenteDetalle));

      sumar(r.paises, f[9] || 'Desconocido');
      if (f[10]) sumar(r.regiones, f[10] + ', ' + (f[9] || ''));
      if (f[11]) sumar(r.ciudades, f[11] + ', ' + (f[10] || f[9] || ''));
      sumar(r.dispositivos, f[6]);
      sumar(r.navegadores, f[12]);
      sumar(r.sistemas, f[13]);
      sumar(r.idiomas, f[14]);
      if (String(f[18]) === 'Si') r.resumen.nuevos++; else r.resumen.recurrentes++;
      if (f[16]) visitantes[f[16]] = true;

      if (!r.porDia[dia]) r.porDia[dia] = { sesiones: 0, vistas: 0 };
      r.porDia[dia].sesiones++;
      r.porHora[local.getUTCHours()]++;
      r.porDiaSemana[local.getUTCDay()]++;
    } else if (tipo === 'page_view') {
      r.resumen.paginasVistas++;
      sumar(r.paginas, pagina);
      if (!r.porDia[dia]) r.porDia[dia] = { sesiones: 0, vistas: 0 };
      r.porDia[dia].vistas++;
    } else if (tipo === 'salida_pagina') {
      const seg = Number(f[19]) || 0;
      sumar(segundosPagina, pagina, seg);
      sumar(salidasPagina, pagina);
      segundosTotales += seg;
      salidas++;
    } else if (tipo === 'prueba_ar') {
      r.resumen.pruebasAR++;
      sumar(r.armazones, detalle.split(' (')[0]);
    } else if (tipo === 'diagnostico_rostro_ia') {
      r.resumen.diagnosticos++;
      sumar(r.rostros, detalle);
    } else if (tipo === 'consentimiento_camara') {
      r.resumen.consentimientos++;
    } else if (tipo === 'busqueda') {
      sumar(r.busquedas, detalle.toLowerCase());
      if (Number(f[19]) === 0) sumar(r.busquedasSinResultado, detalle.toLowerCase());
    } else if (tipo === 'modalidad_cita') {
      sumar(r.modalidades, detalle);
    } else if (tipo.indexOf('conversion_') === 0) {
      r.resumen.conversiones++;
      sumar(r.conversiones, tipo.replace('conversion_', ''));
    }
  });

  r.resumen.visitantes = Object.keys(visitantes).length;
  r.resumen.duracionMedia = salidas ? Math.round(segundosTotales / salidas) : 0;
  Object.keys(segundosPagina).forEach(function (p) {
    r.tiempoPagina[p] = Math.round(segundosPagina[p] / salidasPagina[p]);
  });

  let sumaCalif = 0;
  leerFilas(CONFIG.HOJA_COMENTARIOS, ENCABEZADOS_COMENTARIOS).forEach(function (f) {
    const fecha = aFecha(f[0]);
    if (!fecha || fecha.getTime() < desde) return;
    const calif = Math.min(5, Math.max(1, Math.round(Number(f[3]) || 3)));
    r.satisfaccion.total++;
    r.satisfaccion.distribucion[calif - 1]++;
    sumaCalif += calif;
    r.comentarios.push({
      fecha: fecha.toISOString(), folio: String(f[1]), categoria: String(f[2]), calificacion: calif,
      nombre: String(f[4]), mensaje: String(f[5]), pagina: String(f[6]), estado: String(f[7] || 'Nuevo')
    });
  });
  r.satisfaccion.promedio = r.satisfaccion.total ? Math.round((sumaCalif / r.satisfaccion.total) * 10) / 10 : 0;
  r.comentarios = r.comentarios.reverse().slice(0, 300);
  return r;
}

/*============================================================
    6. ACCIONES CON TOKEN: DESCARGAR Y BORRAR
============================================================*/
function exportarDatos(d) {
  const usuario = sesionValida(d.sesion);
  if (!usuario) return { ok: false, error: 'La sesión expiró. Vuelve a entrar.', sesionExpirada: true };
  if (!consumirToken('exportar', usuario.correo, d.token)) return { ok: false, error: 'Token incorrecto o vencido.' };

  const aTexto = function (filas) {
    return filas.map(function (f) {
      return f.map(function (c) { return c instanceof Date ? c.toISOString() : c; });
    });
  };
  anotarBitacora(usuario.correo, 'Descarga de estadísticas', '');
  return {
    ok: true,
    eventos: [ENCABEZADOS_EVENTOS].concat(aTexto(leerFilas(CONFIG.HOJA_EVENTOS, ENCABEZADOS_EVENTOS))),
    comentarios: [ENCABEZADOS_COMENTARIOS].concat(aTexto(leerFilas(CONFIG.HOJA_COMENTARIOS, ENCABEZADOS_COMENTARIOS)))
  };
}

/**
 * Reinicia las estadísticas. Las hojas actuales no se destruyen: se renombran como
 * respaldo dentro del mismo libro, por si el borrado fue un error. Quien quiera
 * eliminarlas del todo puede borrar esas hojas de respaldo desde Google Sheets.
 */
function borrarDatos(d) {
  const usuario = sesionValida(d.sesion);
  if (!usuario) return { ok: false, error: 'La sesión expiró. Vuelve a entrar.', sesionExpirada: true };
  if (usuario.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede borrar.' };
  if (!consumirToken('borrar', usuario.correo, d.token)) return { ok: false, error: 'Token incorrecto o vencido.' };

  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  try {
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const sello = Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd_HHmmss');
    [CONFIG.HOJA_EVENTOS, CONFIG.HOJA_COMENTARIOS].forEach(function (nombre) {
      const hoja = libro.getSheetByName(nombre);
      if (hoja) hoja.setName('Respaldo_' + sello + '_' + nombre).hideSheet();
    });
    obtenerHoja(CONFIG.HOJA_EVENTOS, ENCABEZADOS_EVENTOS);
    obtenerHoja(CONFIG.HOJA_COMENTARIOS, ENCABEZADOS_COMENTARIOS);
    anotarBitacora(usuario.correo, 'Borrado de estadísticas', 'Respaldo_' + sello);
  } finally {
    candado.releaseLock();
  }
  return { ok: true };
}

/*============================================================
    7. PUESTA EN MARCHA (EJECUTAR UNA VEZ DESDE EL EDITOR)
============================================================*/

/**
 * Crea las hojas y dispara la pantalla de permisos de Google (hojas de cálculo y
 * envío de correo). Se ejecuta a mano una sola vez tras pegar este archivo.
 */
function configurar() {
  obtenerHoja(CONFIG.HOJA_EVENTOS, ENCABEZADOS_EVENTOS);
  obtenerHoja(CONFIG.HOJA_COMENTARIOS, ENCABEZADOS_COMENTARIOS);
  obtenerHoja(CONFIG.HOJA_BITACORA, ENCABEZADOS_BITACORA);
  MailApp.getRemainingDailyQuota();
  console.log('Listo. Ahora publica una versión nueva de la aplicación web.');
}
