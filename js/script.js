/**
***********************************************************************
    Script único de ziGO

    Cómo está organizado:
    0.  Configuración y catálogo de armazones
    1.  Utilidades compartidas
    2.  Analítica: registra visitas y eventos en Google Sheets
    3.  Fondo estelar                                  (todas las páginas)
    4.  Tema de color y panel de accesibilidad         (todas las páginas)
    5.  Botones flotantes arrastrables                 (todas las páginas)
    6.  Buscador interno                               (todas las páginas)
    7.  Buzón de quejas y encuesta de satisfacción     (todas las páginas)
    8.  Aviso y permiso de cámara                      (armazones y probador)
    9.  Motor de realidad aumentada                    (armazones y probador)
    10. Página pages/armazones.html
    11. Página pages/probador.html
    12. Página pages/agenda.html
    13. Página pages/admin.html
    14. Arranque
***********************************************************************
 */
'use strict';

/*============================================================
    0. CONFIGURACIÓN Y CATÁLOGO DE ARMAZONES
============================================================*/
const CONFIG_ZIGO = {
    whatsapp: '5215573839561',
    telegram: '+525573839561',
    telefono: '55 7383 9561',
    direccionConsultorio: 'Consultorio ziGO · Ciudad de México (dirección exacta confirmada al reservar cita)',

    // Aplicación web de Google Apps Script (_backend/Code.gs) que guarda y entrega las estadísticas
    servicioUrl: 'https://script.google.com/macros/s/AKfycbyoobdgG1Nvka_TFuRwsITOcuiWP3VSSHf5lBZ4azulikxjhdABsKCkGW_rj70uKmR9vQ/exec',

    // Ubicación aproximada (país, estado, ciudad) a partir de la IP; la IP nunca se guarda
    geoUrl: 'https://get.geojs.io/v1/ip/geo.json',

    // Motor de detección facial. La versión va fija y con huella de integridad para que
    // el navegador rechace el archivo si alguien lo altera en el servidor de distribución.
    faceMesh: {
        base: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/',
        integridad: 'sha384-nKiz5QrpRlMQLw5nrZcprT7N9vmmAcIgV8TuGuep4x91V4JIPsXa+D44Wxj0guoa'
    }
};

const EN_PAGINAS = window.location.pathname.includes('/pages/');
const RUTA_BASE = EN_PAGINAS ? '../' : './';
const PAGINA_ACTUAL = window.location.pathname.split('/').pop() || 'index.html';

/**
 * Catálogo único del sitio. Las tarjetas de armazones.html solo llevan el id (data-modelo);
 * detalles, probador y recomendaciones salen de aquí.
 *
 * ar: imagen frontal con fondo transparente que se dibuja sobre el rostro.
 *     Si un modelo no la tiene, se usa "archivo" y se le quita el fondo blanco al vuelo.
 * bisagraY: altura (0 arriba, 1 abajo) donde nacen las varillas en esa imagen.
 * colorVarilla: color con el que se dibujan las varillas.
 * medidas: calibre - puente - varilla en milímetros; de ahí sale el ancho real del frente.
 */
const CATALOGO_ARMAZONES = [
    { id: 'zigo-focus', nombre: 'ziGO Focus', archivo: 'img/armazones/1.webp', ar: 'img/armazones/ar/1.webp', bisagraY: 0.19, colorVarilla: '#5a3726', forma: 'Rectangular', material: 'Acetato Premium', categoria: 'premium', medidas: '52-18-140', rostros: ['Ovalado', 'Redondo', 'Corazón'], descripcion: 'Diseño ergonómico rectangular de acetato hipoalergénico, ideal para uso diario y todo tipo de graduaciones.' },
    { id: 'zigo-kinetic', nombre: 'ziGO Kinetic', archivo: 'img/armazones/2.webp', ar: 'img/armazones/ar/2.webp', bisagraY: 0.2, colorVarilla: '#91856e', forma: 'Geométrico', material: 'Titanio Ligero', categoria: 'premium', medidas: '54-17-142', rostros: ['Redondo', 'Ovalado', 'Diamante'], descripcion: 'Estructura ultrafina y flexible de titanio con plaquetas suaves que aporta ligereza y elegancia.' },
    { id: 'zigo-metro', nombre: 'ziGO Metro', archivo: 'img/armazones/3.webp', ar: 'img/armazones/ar/3.webp', bisagraY: 0.17, colorVarilla: '#c18585', forma: 'Redondeado', material: 'Acetato Urbano', categoria: 'urbano', medidas: '50-19-138', rostros: ['Cuadrado', 'Alargado', 'Diamante'], descripcion: 'Estilo moderno con líneas suaves redondeadas que armonizan y suavizan facciones angulares.' },
    { id: 'zigo-edge', nombre: 'ziGO Edge', archivo: 'img/armazones/4.webp', ar: 'img/armazones/ar/4.webp', bisagraY: 0.25, colorVarilla: '#1f1f1f', forma: 'Cuadrado', material: 'Polímero Resistente', categoria: 'deportivo', medidas: '53-17-140', rostros: ['Redondo', 'Ovalado'], descripcion: 'Máxima resistencia a impactos, ajuste firme y estructura cuadrada definida para actividad intensa.' },
    { id: 'zigo-urban', nombre: 'ziGO Urban', archivo: 'img/armazones/5.webp', ar: 'img/armazones/ar/5.webp', bisagraY: 0.3, colorVarilla: '#906b63', forma: 'Aviador', material: 'Aleación Metálica', categoria: 'urbano', medidas: '55-16-145', rostros: ['Cuadrado', 'Ovalado', 'Corazón'], descripcion: 'Perfil delgado, sofisticado y ligero en acero inoxidable con puente doble estilizado.' },
    { id: 'zigo-sport', nombre: 'ziGO Sport', archivo: 'img/armazones/6.webp', ar: 'img/armazones/ar/6.webp', bisagraY: 0.2, colorVarilla: '#9f797d', forma: 'Ovalado', material: 'TR90 Flexible', categoria: 'deportivo', medidas: '52-18-138', rostros: ['Cuadrado', 'Alargado'], descripcion: 'Diseño aerodinámico y antideslizante en TR90 ultraligero para movimiento constante.' },
    { id: 'zigo-nova', nombre: 'ziGO Nova', archivo: 'img/armazones/7.webp', ar: 'img/armazones/ar/7.webp', bisagraY: 0.17, colorVarilla: '#241d1f', forma: 'Minimalista', material: 'Diseño Minimalista', categoria: 'urbano', medidas: '51-18-140', rostros: ['Corazón', 'Cuadrado', 'Ovalado'], descripcion: 'Apariencia limpia y ligera semi-al aire que resalta la expresión natural del rostro.' },
    { id: 'zigo-flex', nombre: 'ziGO Flex', archivo: 'img/armazones/8.webp', ar: 'img/armazones/ar/8.webp', bisagraY: 0.24, colorVarilla: '#2d2d2b', forma: 'Rectangular', material: 'Bisagra Reforzada', categoria: 'deportivo', medidas: '53-18-142', rostros: ['Ovalado', 'Redondo'], descripcion: 'Sistema de bisagra flex de alta durabilidad con adaptación anatómica sin presión en sienes.' },
    { id: 'zigo-bold', nombre: 'ziGO Bold', archivo: 'img/armazones/9.webp', ar: 'img/armazones/ar/9.webp', bisagraY: 0.25, colorVarilla: '#333333', forma: 'Cuadrado', material: 'Estilo Contemporáneo', categoria: 'urbano', medidas: '52-19-140', rostros: ['Redondo', 'Ovalado'], descripcion: 'Armazón con presencia imponente, frente estructurado y equilibrio geométrico moderno.' }
];

const buscarArmazon = (id) => CATALOGO_ARMAZONES.find(a => a.id === id || a.nombre === id);

/*============================================================
    1. UTILIDADES COMPARTIDAS
============================================================*/

/** Convierte cualquier texto en texto seguro para insertar como HTML. */
function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const urlWhatsApp = (mensaje) => `https://wa.me/${CONFIG_ZIGO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
const urlTelegram = () => `https://t.me/${CONFIG_ZIGO.telegram}`;
const rutaSitio = (ruta) => RUTA_BASE + ruta.replace(/^(\.\.\/|\.\/)+/, '');

/** Lectura y escritura tolerantes: en modo privado o con almacenamiento bloqueado no deben romper la página. */
const Almacen = {
    leer(clave, sesion = false) {
        try { return (sesion ? sessionStorage : localStorage).getItem(clave); } catch (e) { return null; }
    },
    guardar(clave, valor, sesion = false) {
        try { (sesion ? sessionStorage : localStorage).setItem(clave, valor); } catch (e) {}
    },
    quitar(clave, sesion = false) {
        try { (sesion ? sessionStorage : localStorage).removeItem(clave); } catch (e) {}
    }
};

/**
 * Crea (una sola vez) una ventana modal y devuelve su capa exterior.
 * Se cierra con la X, con Escape o tocando fuera; el contenido lo pone cada módulo.
 */
function crearModal(id, claseContenido = '') {
    let capa = document.getElementById(id);
    if (capa) return capa;
    capa = document.createElement('div');
    capa.id = id;
    capa.className = 'modal-overlay oculto';
    capa.innerHTML = `<div class="modal-content ${claseContenido}" role="dialog" aria-modal="true"></div>`;
    capa.addEventListener('click', (e) => {
        if (e.target === capa || e.target.closest('[data-cerrar-modal]')) cerrarModal(capa);
    });
    document.body.appendChild(capa);
    return capa;
}

function abrirModal(capa) {
    capa.classList.remove('oculto');
    capa.querySelector('.modal-content')?.scrollTo(0, 0);
    (capa.querySelector('[autofocus]') || capa.querySelector('.modal-cerrar'))?.focus();
}

function cerrarModal(capa) {
    if (!capa || capa.classList.contains('oculto')) return;
    capa.classList.add('oculto');
    capa.dispatchEvent(new CustomEvent('zigo:cerrado'));
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const abiertos = document.querySelectorAll('.modal-overlay:not(.oculto)');
    if (abiertos.length) cerrarModal(abiertos[abiertos.length - 1]);
});

const BOTON_CERRAR_MODAL = '<button type="button" class="modal-cerrar" data-cerrar-modal aria-label="Cerrar">&times;</button>';

/** Descarga un archivo generado en el navegador. */
function descargarArchivo(nombre, url) {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
}

/*============================================================
    2. ANALÍTICA: VISITAS Y EVENTOS EN GOOGLE SHEETS
    Cada evento viaja al backend (_backend/Code.gs), que lo guarda
    en la hoja de cálculo. Nada se acumula en el navegador, por eso
    las cifras son las mismas desde cualquier dispositivo.
============================================================*/
const ZigoAnalitica = (() => {
    const CLAVE_VISITANTE = 'zigo_visitante';
    const CLAVE_SESION = 'zigo_sesion';

    const BUSCADORES = { google: 'Google', bing: 'Bing', yahoo: 'Yahoo', duckduckgo: 'DuckDuckGo', ecosia: 'Ecosia', baidu: 'Baidu', yandex: 'Yandex', brave: 'Brave Search', startpage: 'Startpage', qwant: 'Qwant' };
    const REDES = { facebook: 'Facebook', 'fb.com': 'Facebook', 'fb.me': 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', 't.co': 'X (Twitter)', twitter: 'X (Twitter)', 'x.com': 'X (Twitter)', whatsapp: 'WhatsApp', 'wa.me': 'WhatsApp', threads: 'Threads', youtube: 'YouTube', 'youtu.be': 'YouTube', linkedin: 'LinkedIn', 'lnkd.in': 'LinkedIn', pinterest: 'Pinterest', 't.me': 'Telegram', telegram: 'Telegram', messenger: 'Messenger', snapchat: 'Snapchat', reddit: 'Reddit' };
    const ASISTENTES = { chatgpt: 'ChatGPT', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', copilot: 'Copilot', claude: 'Claude' };

    // Los robots de buscadores también ejecutan el script; no cuentan como visitas
    const esRobot = navigator.webdriver || /bot|crawl|spider|lighthouse|headless|pagespeed/i.test(navigator.userAgent);
    const activa = !esRobot && PAGINA_ACTUAL !== 'admin.html' && Boolean(CONFIG_ZIGO.servicioUrl);
    const esPruebaLocal = window.location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

    let sesion = null;
    const entrada = Date.now();
    let salidaEnviada = false;

    function identificador() {
        return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 36);
    }

    /**
     * Clasifica de dónde llegó la visita:
     * Campañas (enlaces con utm_source o clics de anuncios), Buscadores, Redes sociales,
     * Otros sitios y Directo (tecleó la dirección, la tenía guardada o abrió un enlace sin origen).
     */
    function detectarFuente() {
        if (esPruebaLocal) return { fuente: 'Otros sitios', detalle: 'Pruebas locales', campana: '', referrer: '' };

        const parametros = new URLSearchParams(window.location.search);
        const utm = (parametros.get('utm_source') || '').toLowerCase();
        const campana = parametros.get('utm_campaign') || '';
        const nombreEn = (tabla, texto) => {
            const clave = Object.keys(tabla).find(k => texto.includes(k));
            return clave ? tabla[clave] : '';
        };

        if (parametros.get('gclid')) return { fuente: 'Campañas', detalle: 'Google Ads', campana: campana || 'Google Ads', referrer: '' };
        if (parametros.get('fbclid') && !utm) return { fuente: 'Redes sociales', detalle: 'Facebook / Instagram', campana, referrer: '' };
        if (utm) {
            const red = nombreEn(REDES, utm);
            if (campana || parametros.get('utm_medium')) return { fuente: 'Campañas', detalle: red || utm, campana: campana || utm, referrer: '' };
            if (red) return { fuente: 'Redes sociales', detalle: red, campana, referrer: '' };
            return { fuente: 'Campañas', detalle: utm, campana: utm, referrer: '' };
        }

        let host = '';
        try { host = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) {}
        if (!host || host === window.location.hostname.replace(/^www\./, '')) return { fuente: 'Directo', detalle: '', campana: '', referrer: '' };

        const buscador = nombreEn(BUSCADORES, host) || nombreEn(ASISTENTES, host);
        if (buscador) return { fuente: 'Buscadores', detalle: buscador, campana: '', referrer: host };
        const red = nombreEn(REDES, host);
        if (red) return { fuente: 'Redes sociales', detalle: red, campana: '', referrer: host };
        return { fuente: 'Otros sitios', detalle: host, campana: '', referrer: host };
    }

    function detectarEquipo() {
        const ua = navigator.userAgent;
        const tactil = navigator.maxTouchPoints > 1;
        const esTablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && tactil);
        const esCelular = !esTablet && /Mobi|iPhone|Android/i.test(ua);

        const navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
            : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? (navigator.brave ? 'Brave' : 'Chrome') : /Safari/.test(ua) ? 'Safari' : 'Otro';
        const sistema = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && tactil) ? 'iOS'
            : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Otro';

        return {
            dispositivo: esTablet ? 'Tablet' : esCelular ? 'Celular' : 'Escritorio',
            navegador,
            sistema,
            idioma: (navigator.language || '').slice(0, 5),
            pantalla: `${window.screen.width}x${window.screen.height}`
        };
    }

    /** País, estado y ciudad aproximados. Si el servicio no responde, se deduce el país por la zona horaria. */
    async function ubicar() {
        const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const zonasMexico = ['America/Mexico_City', 'America/Monterrey', 'America/Merida', 'America/Cancun', 'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Hermosillo', 'America/Mazatlan', 'America/Tijuana', 'America/Matamoros', 'America/Ojinaga', 'America/Bahia_Banderas'];
        const respaldo = { pais: zonasMexico.includes(zona) ? 'México' : 'Desconocido', region: '', ciudad: '' };
        try {
            const control = new AbortController();
            const limite = setTimeout(() => control.abort(), 2500);
            const respuesta = await fetch(CONFIG_ZIGO.geoUrl, { signal: control.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
            clearTimeout(limite);
            const geo = await respuesta.json();
            if (!geo || !geo.country) return respaldo;
            return { pais: geo.country === 'Mexico' ? 'México' : String(geo.country), region: String(geo.region || ''), ciudad: String(geo.city || '') };
        } catch (e) {
            return respaldo;
        }
    }

    /**
     * Envía un evento al backend. Va como texto plano y sin esperar respuesta
     * (keepalive) para que no se pierda aunque el visitante cambie de página.
     */
    function enviar(tipo, detalle = '', valor = 0) {
        if (!activa || !sesion) return;
        const cuerpo = JSON.stringify({
            accion: 'evento', tipo, detalle: String(detalle).slice(0, 160), valor,
            pagina: PAGINA_ACTUAL, fuente: sesion.fuente, fuenteDetalle: sesion.detalle, campana: sesion.campana,
            referrer: sesion.referrer, pais: sesion.pais, region: sesion.region, ciudad: sesion.ciudad,
            visitante: sesion.visitante, sesion: sesion.id, nuevo: sesion.nuevo, ...detectarEquipo()
        });
        try {
            fetch(CONFIG_ZIGO.servicioUrl, { method: 'POST', mode: 'no-cors', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: cuerpo }).catch(() => {});
        } catch (e) {}
    }

    /**
     * Petición con respuesta al backend (comentarios y panel de administración).
     * El tipo text/plain evita la verificación previa de CORS, que Apps Script no contesta.
     */
    async function llamar(accion, datos = {}) {
        const respuesta = await fetch(CONFIG_ZIGO.servicioUrl, {
            method: 'POST', credentials: 'omit', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ accion, ...datos })
        });
        return respuesta.json();
    }

    async function iniciar() {
        if (!activa) return;

        // Visitante: identificador al azar guardado en este navegador; no contiene datos personales
        let visitante = Almacen.leer(CLAVE_VISITANTE);
        const esNuevo = !visitante;
        if (esNuevo) {
            visitante = identificador();
            Almacen.guardar(CLAVE_VISITANTE, visitante);
        }

        // Sesión: dura lo que dure la pestaña. Solo la primera página de la sesión cuenta como visita.
        try { sesion = JSON.parse(Almacen.leer(CLAVE_SESION, true)); } catch (e) { sesion = null; }
        if (!sesion) {
            sesion = { id: identificador(), visitante, nuevo: esNuevo, ...detectarFuente(), ...(await ubicar()) };
            Almacen.guardar(CLAVE_SESION, JSON.stringify(sesion), true);
            enviar('sesion_nueva');
        }
        enviar('page_view');

        // Tiempo de permanencia: se manda una sola vez, cuando la página se oculta o se cierra
        const registrarSalida = () => {
            if (salidaEnviada) return;
            salidaEnviada = true;
            enviar('salida_pagina', '', Math.min(3600, Math.round((Date.now() - entrada) / 1000)));
        };
        window.addEventListener('pagehide', registrarSalida);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') registrarSalida(); });

        // Clics que cuentan como contacto o intención de cita
        document.addEventListener('click', (e) => {
            const enlace = e.target.closest('a[href]');
            if (!enlace) return;
            const href = enlace.getAttribute('href');
            if (href.includes('wa.me')) enviar('conversion_whatsapp');
            else if (href.includes('t.me')) enviar('conversion_telegram');
            else if (href.startsWith('tel:')) enviar('conversion_llamada');
            else if (href.includes('agenda.html')) enviar('conversion_agenda', enlace.textContent.trim().slice(0, 60));
            else if (enlace.dataset.red) enviar('conversion_redSocial', enlace.dataset.red);
        });
    }

    return { iniciar, enviar, llamar };
})();

/*============================================================
    3. FONDO ESTELAR (todas las páginas, solo en tema oscuro)
============================================================*/
function inicializarFondoEstelar() {
    const lienzo = document.getElementById('zigo-starfield');
    if (!lienzo) return;
    const ctx = lienzo.getContext('2d');
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paleta = [
        { centro: '#ffffff', halo: 'rgba(255, 255, 255, 0.85)' },
        { centro: '#a5f3fc', halo: 'rgba(0, 229, 255, 0.85)' },
        { centro: '#f5d0fe', halo: 'rgba(217, 70, 239, 0.80)' },
        { centro: '#bbf7d0', halo: 'rgba(16, 185, 129, 0.75)' }
    ];
    let estrellas = [];
    let destellos = [];
    let cuadro = null;

    function sembrar() {
        lienzo.width = window.innerWidth;
        lienzo.height = window.innerHeight;
        const area = lienzo.width * lienzo.height;
        const crear = (cantidad, fabrica) => Array.from({ length: cantidad }, fabrica);
        const pulso = (base, rango) => (Math.random() * rango + base) * (Math.random() < 0.5 ? 1 : -1);

        estrellas = crear(Math.min(200, Math.floor(area / 8000)), () => ({
            x: Math.random() * lienzo.width, y: Math.random() * lienzo.height, r: Math.random() * 1.4 + 0.4,
            color: paleta[Math.floor(Math.random() * paleta.length)], alfa: Math.random() * 0.6 + 0.25, paso: pulso(0.004, 0.012)
        }));
        destellos = crear(Math.min(16, Math.floor(area / 100000)), () => ({
            x: Math.random() * lienzo.width, y: Math.random() * lienzo.height, r: Math.random() * 5 + 4,
            color: paleta[Math.floor(Math.random() * 3)], alfa: Math.random() * 0.5 + 0.4, paso: pulso(0.003, 0.01)
        }));
    }

    function dibujar() {
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);
        for (const e of estrellas) {
            if (!sinMovimiento) {
                e.alfa += e.paso;
                if (e.alfa >= 0.9 || e.alfa <= 0.15) e.paso *= -1;
            }
            ctx.globalAlpha = e.alfa;
            ctx.shadowBlur = e.r > 1.2 ? 8 : 3;
            ctx.shadowColor = e.color.halo;
            ctx.fillStyle = e.color.centro;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Destellos de cuatro puntas
        for (const d of destellos) {
            if (!sinMovimiento) {
                d.alfa += d.paso;
                if (d.alfa >= 0.95 || d.alfa <= 0.25) d.paso *= -1;
            }
            ctx.globalAlpha = d.alfa;
            ctx.shadowBlur = 10;
            ctx.shadowColor = d.color.halo;
            ctx.fillStyle = d.color.centro;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const radio = i % 2 === 0 ? d.r : d.r * 0.18;
                const angulo = (i * Math.PI) / 4;
                ctx.lineTo(d.x + Math.cos(angulo) * radio, d.y + Math.sin(angulo) * radio);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Solo anima mientras el lienzo se ve: pestaña activa y tema oscuro
    function animar() {
        cuadro = null;
        if (document.hidden || getComputedStyle(lienzo).display === 'none') return;
        dibujar();
        if (!sinMovimiento) cuadro = requestAnimationFrame(animar);
    }
    const reanudar = () => { if (!cuadro) animar(); };

    document.addEventListener('visibilitychange', reanudar);
    document.addEventListener('zigo:tema', reanudar);
    window.addEventListener('resize', () => { sembrar(); reanudar(); });
    sembrar();
    animar();
}

/*============================================================
    4. TEMA DE COLOR Y PANEL DE ACCESIBILIDAD (todas las páginas)
    El tema es una clase en <html>; los colores viven en styles.css.
============================================================*/
const TEMAS = ['oscuro', 'claro', 'azul-uveg', 'morado', 'azul-botones', 'menta-uveg', 'pizarra-uveg', 'rosa'];

function aplicarTema(nombre) {
    const tema = TEMAS.includes(nombre) ? nombre : 'oscuro';
    const raiz = document.documentElement;
    TEMAS.forEach(t => raiz.classList.remove(`tema-${t}`));
    if (tema !== 'oscuro') raiz.classList.add(`tema-${tema}`);
    Almacen.guardar('zigo_tema_color', tema);

    document.querySelectorAll('[data-tema]').forEach(boton => boton.classList.toggle('activo', boton.dataset.tema === tema));
    document.getElementById('btn-tema-oscuro')?.classList.toggle('activo', tema === 'oscuro');
    document.getElementById('btn-tema-claro')?.classList.toggle('activo', tema !== 'oscuro');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(raiz).getPropertyValue('--fondo').trim() || '#02102b');
    document.dispatchEvent(new CustomEvent('zigo:tema'));
}

// Las preferencias guardadas se aplican en cuanto carga el script, antes de pintar el resto
(function restaurarPreferencias() {
    const raiz = document.documentElement;
    const tema = Almacen.leer('zigo_tema_color');
    if (tema && tema !== 'oscuro' && TEMAS.includes(tema)) raiz.classList.add(`tema-${tema}`);
    if (Almacen.leer('zigo_alto_contraste') === '1') raiz.classList.add('modo-alto-contraste');
    if (Almacen.leer('zigo_vista_simple') === '1') raiz.classList.add('vista-simplificada');
    if (Almacen.leer('zigo_daltonismo') === '1') raiz.classList.add('modo-daltonismo');
    raiz.style.setProperty('--escala-fuente', Almacen.leer('zigo_escala_fuente') || '1');
    if (Almacen.leer('zigo_espaciado') === '1') raiz.style.setProperty('--espaciado-letras', '0.07em');
    if (Almacen.leer('zigo_interlineado') === '1') raiz.style.setProperty('--altura-linea', '1.85');
})();

function inicializarAccesibilidad() {
    const raiz = document.documentElement;
    const widget = crearWidgetFlotante({
        id: 'widget-accesibilidad',
        icono: 'fa-universal-access',
        etiqueta: 'Accesibilidad e inclusión visual',
        claseMenu: 'panel-accesibilidad',
        contenido: `
            <h3><i class="fas fa-universal-access" aria-hidden="true"></i> Inclusión visual</h3>
            <div class="fila-doble">
                <button type="button" class="btn-modo-tema" data-tema="oscuro"><i class="fas fa-moon" aria-hidden="true"></i> Oscuro</button>
                <button type="button" class="btn-modo-tema" data-tema="claro"><i class="fas fa-sun" aria-hidden="true"></i> Claro</button>
            </div>
            <div class="bloque-temas-color">
                <span><i class="fas fa-palette" aria-hidden="true"></i> Color del sitio</span>
                <div class="paleta-colores">
                    <button type="button" class="btn-color-tema" data-tema="azul-uveg" title="Azul" aria-label="Tema azul" style="background:#1e3a8a"></button>
                    <button type="button" class="btn-color-tema" data-tema="morado" title="Morado" aria-label="Tema morado" style="background:#6d28d9"></button>
                    <button type="button" class="btn-color-tema" data-tema="azul-botones" title="Azul cielo" aria-label="Tema azul cielo" style="background:#0284c7"></button>
                    <button type="button" class="btn-color-tema" data-tema="menta-uveg" title="Verde menta" aria-label="Tema verde menta" style="background:#34d399"></button>
                    <button type="button" class="btn-color-tema" data-tema="pizarra-uveg" title="Gris pizarra" aria-label="Tema gris pizarra" style="background:#8e99a8"></button>
                    <button type="button" class="btn-color-tema" data-tema="rosa" title="Rosa" aria-label="Tema rosa" style="background:#ec4899"></button>
                </div>
            </div>
            <div class="fila-doble">
                <button type="button" class="btn-acc" data-acc="texto-mas" data-mantener><i class="fas fa-plus" aria-hidden="true"></i> Letra A+</button>
                <button type="button" class="btn-acc" data-acc="texto-menos" data-mantener><i class="fas fa-minus" aria-hidden="true"></i> Letra A-</button>
            </div>
            <div class="fila-doble">
                <button type="button" class="btn-acc" data-acc="espaciado"><i class="fas fa-text-width" aria-hidden="true"></i> Espaciado</button>
                <button type="button" class="btn-acc" data-acc="interlineado"><i class="fas fa-arrows-alt-v" aria-hidden="true"></i> Interlineado</button>
            </div>
            <button type="button" class="btn-acc" data-acc="daltonismo"><i class="fas fa-low-vision" aria-hidden="true"></i> Visión de color (daltonismo)</button>
            <button type="button" class="btn-acc" data-acc="alto-contraste"><i class="fas fa-adjust" aria-hidden="true"></i> Alto contraste</button>
            <button type="button" class="btn-acc" data-acc="guia"><i class="fas fa-grip-lines" aria-hidden="true"></i> Guía de lectura</button>
            <button type="button" class="btn-acc" data-acc="vista-simple"><i class="fas fa-eye" aria-hidden="true"></i> Vista simplificada</button>
            <button type="button" class="btn-acc" data-acc="leer"><i class="fas fa-volume-up" aria-hidden="true"></i> Escuchar página</button>
            <button type="button" class="btn-acc btn-acc-reset" data-acc="restablecer"><i class="fas fa-undo" aria-hidden="true"></i> Restablecer todo</button>`
    });
    const boton = (accion) => widget.menu.querySelector(`[data-acc="${accion}"]`);

    // Interruptores que solo ponen o quitan una clase en <html> y recuerdan la elección
    const interruptores = {
        'alto-contraste': { clase: 'modo-alto-contraste', clave: 'zigo_alto_contraste' },
        'vista-simple': { clase: 'vista-simplificada', clave: 'zigo_vista_simple' },
        daltonismo: { clase: 'modo-daltonismo', clave: 'zigo_daltonismo' }
    };
    // Ajustes de texto: cambian una variable CSS
    const variables = {
        espaciado: { variable: '--espaciado-letras', activo: '0.07em', normal: 'normal', clave: 'zigo_espaciado' },
        interlineado: { variable: '--altura-linea', activo: '1.85', normal: '1.5', clave: 'zigo_interlineado' }
    };

    // El filtro de daltonismo es un SVG que solo se inserta cuando alguien lo activa
    function asegurarFiltroDaltonismo() {
        if (document.getElementById('filtro-daltonismo')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="filtro-daltonismo">
                <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0"/>
            </filter></defs></svg>`);
    }

    // Guía de lectura: una franja horizontal que sigue al puntero o al dedo
    let guia = null;
    const moverGuia = (e) => { if (guia) guia.style.top = `${(e.touches ? e.touches[0] : e).clientY}px`; };
    function alternarGuia(activar) {
        if (activar && !guia) {
            guia = document.createElement('div');
            guia.id = 'guia-lectura';
            guia.style.top = '50%';
            document.body.appendChild(guia);
            window.addEventListener('mousemove', moverGuia);
            window.addEventListener('touchmove', moverGuia, { passive: true });
        } else if (!activar && guia) {
            guia.remove();
            guia = null;
            window.removeEventListener('mousemove', moverGuia);
            window.removeEventListener('touchmove', moverGuia);
        }
        boton('guia').classList.toggle('activo', Boolean(guia));
    }

    // Lectura en voz alta con la voz del propio dispositivo
    const hayVoz = 'speechSynthesis' in window;
    let leyendo = false;
    function detenerLectura() {
        leyendo = false;
        if (hayVoz) window.speechSynthesis.cancel();
        document.getElementById('barra-lector-voz')?.remove();
        boton('leer').classList.remove('activo');
    }
    function leerPagina() {
        if (leyendo) return detenerLectura();
        const texto = (document.getElementById('contenido-principal') || document.body).innerText.replace(/\s+/g, ' ').trim();
        const frases = texto.match(/[^.!?]+[.!?]*/g) || [texto];
        const voz = window.speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('es'));
        let indice = 0;
        leyendo = true;
        boton('leer').classList.add('activo');

        document.body.insertAdjacentHTML('beforeend', `
            <div id="barra-lector-voz" class="barra-lector-voz" role="status">
                <p><i class="fas fa-volume-up icono-acento" aria-hidden="true"></i> <span></span></p>
                <button type="button" class="btn-peligro"><i class="fas fa-stop" aria-hidden="true"></i> Detener</button>
            </div>`);
        const barra = document.getElementById('barra-lector-voz');
        barra.querySelector('button').addEventListener('click', detenerLectura);

        (function siguiente() {
            if (!leyendo || indice >= frases.length) return detenerLectura();
            const frase = frases[indice++].trim();
            if (!frase) return siguiente();
            barra.querySelector('span').textContent = frase;
            const locucion = new SpeechSynthesisUtterance(frase);
            locucion.lang = 'es-MX';
            if (voz) locucion.voice = voz;
            locucion.onend = siguiente;
            locucion.onerror = detenerLectura;
            window.speechSynthesis.speak(locucion);
        })();
    }
    if (hayVoz) window.speechSynthesis.getVoices();
    else boton('leer').classList.add('oculto');
    window.addEventListener('pagehide', detenerLectura);

    function cambiarEscala(paso) {
        const actual = parseFloat(getComputedStyle(raiz).getPropertyValue('--escala-fuente')) || 1;
        const nueva = Math.min(1.32, Math.max(0.85, +(actual + paso).toFixed(2)));
        raiz.style.setProperty('--escala-fuente', nueva);
        Almacen.guardar('zigo_escala_fuente', nueva);
    }

    function restablecer() {
        detenerLectura();
        alternarGuia(false);
        aplicarTema('oscuro');
        Object.values(interruptores).forEach(i => { raiz.classList.remove(i.clase); Almacen.quitar(i.clave); });
        Object.values(variables).forEach(v => { raiz.style.setProperty(v.variable, v.normal); Almacen.quitar(v.clave); });
        raiz.style.setProperty('--escala-fuente', '1');
        Almacen.quitar('zigo_escala_fuente');
        widget.menu.querySelectorAll('.btn-acc').forEach(b => b.classList.remove('activo'));
    }

    widget.menu.addEventListener('click', (e) => {
        const tema = e.target.closest('[data-tema]');
        if (tema) return aplicarTema(tema.dataset.tema);

        const accion = e.target.closest('[data-acc]')?.dataset.acc;
        if (!accion) return;
        if (interruptores[accion]) {
            if (accion === 'daltonismo') asegurarFiltroDaltonismo();
            const activo = raiz.classList.toggle(interruptores[accion].clase);
            boton(accion).classList.toggle('activo', activo);
            Almacen.guardar(interruptores[accion].clave, activo ? '1' : '0');
        } else if (variables[accion]) {
            const v = variables[accion];
            const activo = !boton(accion).classList.contains('activo');
            boton(accion).classList.toggle('activo', activo);
            raiz.style.setProperty(v.variable, activo ? v.activo : v.normal);
            Almacen.guardar(v.clave, activo ? '1' : '0');
        } else if (accion === 'texto-mas') cambiarEscala(0.08);
        else if (accion === 'texto-menos') cambiarEscala(-0.08);
        else if (accion === 'guia') alternarGuia(!guia);
        else if (accion === 'leer') leerPagina();
        else if (accion === 'restablecer') restablecer();
    });

    // Refleja en los botones lo que ya estaba activo al cargar
    Object.entries(interruptores).forEach(([accion, i]) => boton(accion).classList.toggle('activo', raiz.classList.contains(i.clase)));
    Object.entries(variables).forEach(([accion, v]) => boton(accion).classList.toggle('activo', Almacen.leer(v.clave) === '1'));
    if (raiz.classList.contains('modo-daltonismo')) asegurarFiltroDaltonismo();

    document.getElementById('btn-tema-oscuro')?.addEventListener('click', () => aplicarTema('oscuro'));
    document.getElementById('btn-tema-claro')?.addEventListener('click', () => aplicarTema('claro'));
    aplicarTema(Almacen.leer('zigo_tema_color') || 'oscuro');
}

/*============================================================
    5. BOTONES FLOTANTES ARRASTRABLES (todas las páginas)
    Un toque o clic abre el menú; otro toque en la burbuja, en una
    opción o fuera lo cierra. Si el dedo se desplaza, la burbuja se
    mueve y se queda donde la suelten (la posición se recuerda).
============================================================*/
const widgetsFlotantes = [];

function crearWidgetFlotante({ id, icono, etiqueta, claseMenu, contenido }) {
    const UMBRAL_ARRASTRE = 8;
    const MARGEN = 8;

    const widget = document.createElement('div');
    widget.id = id;
    widget.className = 'widget-flotante';
    widget.innerHTML = `
        <div class="menu-flotante ${claseMenu} oculto" id="${id}-menu" role="region" aria-label="${escaparHTML(etiqueta)}">${contenido}</div>
        <button type="button" class="btn-burbuja" aria-expanded="false" aria-controls="${id}-menu" aria-label="${escaparHTML(etiqueta)}" title="${escaparHTML(etiqueta)}">
            <i class="fas ${icono}" aria-hidden="true"></i>
        </button>`;
    document.body.appendChild(widget);

    const burbuja = widget.querySelector('.btn-burbuja');
    const menu = widget.querySelector('.menu-flotante');
    const estaAbierto = () => !menu.classList.contains('oculto');

    function cerrar() {
        menu.classList.add('oculto');
        burbuja.setAttribute('aria-expanded', 'false');
    }

    function abrir() {
        widgetsFlotantes.forEach(w => w !== api && w.cerrar());
        // El menú se despliega hacia el lado de la pantalla donde hay más espacio
        const caja = burbuja.getBoundingClientRect();
        const haciaAbajo = caja.top < window.innerHeight / 2;
        widget.classList.toggle('abre-abajo', haciaAbajo);
        widget.classList.toggle('alinea-derecha', caja.left + caja.width / 2 > window.innerWidth / 2);
        const espacio = haciaAbajo ? window.innerHeight - caja.bottom : caja.top;
        menu.style.maxHeight = `${Math.max(160, espacio - 24)}px`;
        menu.classList.remove('oculto');
        burbuja.setAttribute('aria-expanded', 'true');
    }

    const alternar = () => (estaAbierto() ? cerrar() : abrir());

    /** Coloca el widget en un punto de la pantalla sin dejar que se salga de ella. */
    function colocar(x, y) {
        const maxX = window.innerWidth - widget.offsetWidth - MARGEN;
        const maxY = window.innerHeight - widget.offsetHeight - MARGEN;
        widget.style.left = `${Math.max(MARGEN, Math.min(maxX, x))}px`;
        widget.style.top = `${Math.max(MARGEN, Math.min(maxY, y))}px`;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
    }

    // La posición se guarda como fracción de la pantalla para que sirva al girar el teléfono
    function restaurarPosicion() {
        try {
            const p = JSON.parse(Almacen.leer(`zigo_pos_${id}`));
            if (p) colocar(p.x * window.innerWidth, p.y * window.innerHeight);
        } catch (e) {}
    }

    let gesto = null;
    burbuja.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        const caja = widget.getBoundingClientRect();
        gesto = { id: e.pointerId, x: e.clientX, y: e.clientY, izquierda: caja.left, arriba: caja.top, arrastre: false };
        burbuja.setPointerCapture(e.pointerId);
    });

    burbuja.addEventListener('pointermove', (e) => {
        if (!gesto || e.pointerId !== gesto.id) return;
        const dx = e.clientX - gesto.x;
        const dy = e.clientY - gesto.y;
        if (!gesto.arrastre && Math.hypot(dx, dy) > UMBRAL_ARRASTRE) {
            gesto.arrastre = true;
            cerrar();
            widget.classList.add('arrastrando');
        }
        if (gesto.arrastre) colocar(gesto.izquierda + dx, gesto.arriba + dy);
    });

    const soltar = (e) => {
        if (!gesto || e.pointerId !== gesto.id) return;
        const fueArrastre = gesto.arrastre;
        gesto = null;
        widget.classList.remove('arrastrando');
        if (e.type === 'pointercancel') return;
        if (fueArrastre) {
            const caja = widget.getBoundingClientRect();
            Almacen.guardar(`zigo_pos_${id}`, JSON.stringify({ x: caja.left / window.innerWidth, y: caja.top / window.innerHeight }));
        } else {
            alternar();
        }
    };
    burbuja.addEventListener('pointerup', soltar);
    burbuja.addEventListener('pointercancel', soltar);

    // El clic que el navegador genera tras el toque ya se atendió en pointerup;
    // aquí solo se atiende el clic de teclado (Enter o barra espaciadora)
    burbuja.addEventListener('click', (e) => { if (e.detail === 0) alternar(); });

    // Elegir una opción cierra el menú, salvo las que se pulsan varias veces seguidas
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a, button') && !e.target.closest('[data-mantener]')) cerrar();
    });

    const api = { widget, menu, cerrar };
    widgetsFlotantes.push(api);
    restaurarPosicion();
    return api;
}

// Tocar fuera cierra cualquier menú flotante abierto; al girar o redimensionar se reacomodan
document.addEventListener('pointerdown', (e) => {
    widgetsFlotantes.forEach(w => { if (!w.widget.contains(e.target)) w.cerrar(); });
});
window.addEventListener('resize', () => {
    widgetsFlotantes.forEach(w => {
        w.cerrar();
        if (w.widget.style.left) {
            const caja = w.widget.getBoundingClientRect();
            w.widget.style.left = `${Math.max(8, Math.min(window.innerWidth - caja.width - 8, caja.left))}px`;
            w.widget.style.top = `${Math.max(8, Math.min(window.innerHeight - caja.height - 8, caja.top))}px`;
        }
    });
});

function inicializarWidgetRedes() {
    const mensaje = 'Hola Dra. Escarlet, vengo de la página de ziGO y me gustaría agendar una cita.';
    const widget = crearWidgetFlotante({
        id: 'widget-redes',
        icono: 'fa-comment-dots',
        etiqueta: 'Mensajes, redes sociales y buzón de quejas',
        claseMenu: 'lista-redes',
        contenido: `
            <a href="${urlWhatsApp(mensaje)}" target="_blank" rel="noopener noreferrer" class="globo-red"><i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp · Dra. Escarlet</a>
            <a href="${urlTelegram()}" target="_blank" rel="noopener noreferrer" class="globo-red"><i class="fab fa-telegram" aria-hidden="true"></i> Telegram · Dra. Escarlet</a>
            <a href="tel:+${CONFIG_ZIGO.whatsapp.replace(/^521/, '52')}" class="globo-red"><i class="fas fa-phone" aria-hidden="true"></i> Llamar ${CONFIG_ZIGO.telefono}</a>
            <button type="button" class="globo-red globo-queja" data-abrir-buzon><i class="fas fa-comment-medical" aria-hidden="true"></i> Quejas y sugerencias</button>
            <a href="https://instagram.com" data-red="Instagram" target="_blank" rel="noopener noreferrer" class="globo-red"><i class="fab fa-instagram" aria-hidden="true"></i> Instagram</a>
            <a href="https://facebook.com" data-red="Facebook" target="_blank" rel="noopener noreferrer" class="globo-red"><i class="fab fa-facebook-f" aria-hidden="true"></i> Facebook</a>
            <a href="https://tiktok.com" data-red="TikTok" target="_blank" rel="noopener noreferrer" class="globo-red"><i class="fab fa-tiktok" aria-hidden="true"></i> TikTok</a>`
    });
    widget.menu.querySelector('[data-abrir-buzon]').addEventListener('click', abrirBuzonRapido);

    // Los enlaces de WhatsApp del footer abren el chat con el mismo saludo
    document.querySelectorAll('a[href*="wa.me"]:not(.globo-red)').forEach(a => { a.href = urlWhatsApp(mensaje); });
}

/*============================================================
    6. BUSCADOR INTERNO (todas las páginas)
    Tolera faltas de ortografía comparando por sonido y por
    distancia de edición.
============================================================*/
function normalizarFonetico(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/ll/g, 'y')
        .replace(/[szc](?=[ei])/g, 's')
        .replace(/z/g, 's')
        .replace(/v/g, 'b')
        .replace(/h/g, '')
        .replace(/qu/g, 'k')
        .replace(/c(?=[aou])/g, 'k')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function distanciaLevenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let fila = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const nueva = [i];
        for (let j = 1; j <= b.length; j++) {
            nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        fila = nueva;
    }
    return fila[b.length];
}

function coincideDifuso(consulta, palabrasClave) {
    const buscadas = normalizarFonetico(consulta).split(' ').filter(Boolean);
    const claves = normalizarFonetico(palabrasClave).split(' ').filter(Boolean);
    return buscadas.some(b => {
        if (b.length < 3) return claves.includes(b);
        return claves.some(c => c.includes(b) || b.includes(c) || distanciaLevenshtein(b, c) <= (b.length >= 6 ? 2 : 1));
    });
}

function inicializarBuscador() {
    const campo = document.getElementById('input-buscador-global');
    if (!campo) return;

    const correcciones = {
        armasones: 'Armazones', armason: 'Armazones', lentes: 'Lentes', sita: 'Cita', ajenda: 'Agenda',
        eksamen: 'Examen de la vista', bista: 'Examen de la vista', presio: 'Precios', kosto: 'Costos',
        promosion: 'Promociones', yamar: 'Llamar', wasap: 'WhatsApp', ubikasion: 'Ubicación', direksion: 'Dirección',
        doktora: 'Dra. Escarlet Alcocer', eskarlet: 'Dra. Escarlet Alcocer', keja: 'Quejas y sugerencias'
    };

    const indice = [
        { titulo: 'Inicio · Ciencia y arte en tu mirada', desc: 'Portada, examen de la vista, pupilentes y opiniones de pacientes.', url: 'index.html', tags: 'inicio portada principal pupilentes lentes contacto examen vista' },
        { titulo: 'Catálogo de armazones y probador AR', desc: 'Modelos premium, urbanos y deportivos con probador virtual.', url: 'pages/armazones.html', tags: 'lentes armazones gafas catalogo modelo probar ar virtual acetato titanio' },
        { titulo: 'Recomendación IA · Tu lente ideal', desc: 'Descubre qué forma de armazón favorece a tu tipo de rostro.', url: 'pages/probador.html', tags: 'recomendacion ia asesor rostro cara ovalada redonda cuadrada foto camara probador' },
        { titulo: 'Agendar examen de la vista', desc: 'Elige fecha y hora en consultorio o a domicilio.', url: 'pages/agenda.html', tags: 'cita agendar examen vista horario domicilio consultorio ubicacion direccion mapa' },
        { titulo: 'Experiencias en consulta', desc: 'Así es la atención paso a paso.', url: 'pages/experiencias.html', tags: 'experiencias fotos pacientes consulta proceso' },
        { titulo: 'Nosotros · Dra. Escarlet Alcocer', desc: 'Nuestra especialista, misión, valores y buzón de quejas.', url: 'pages/nosotros.html', tags: 'nosotros mision vision valores doctora escarlet alcocer quejas sugerencias' },
        { titulo: 'Legal y privacidad', desc: 'Aviso de privacidad, uso de cámara y términos del sitio.', url: 'pages/legal.html', tags: 'legal privacidad datos personales terminos aviso camara' },
        ...CATALOGO_ARMAZONES.map(a => ({
            titulo: `Armazón ${a.nombre}`, desc: `${a.material} · ${a.forma}. Pruébatelo en línea.`,
            url: `pages/armazones.html?probar=${a.id}`, tags: `${a.nombre} ${a.forma} ${a.material} armazon lente`
        }))
    ];

    const capa = crearModal('modal-busqueda', 'modal-ancho');

    function buscar(consulta) {
        const texto = (consulta || '').trim();
        if (!texto) return campo.focus();

        const sugerencias = [...new Set(normalizarFonetico(texto).split(' ').map(t => correcciones[t]).filter(Boolean))];
        const pideContacto = coincideDifuso(texto, 'marcar llamar telefono celular whatsapp wasap telegram contacto hablar numero mensaje correo promo promocion costo precio cuanto cuesta descuento oferta cotizacion paquete');
        const resultados = indice.filter(i => coincideDifuso(texto, `${i.titulo} ${i.desc} ${i.tags}`));
        ZigoAnalitica.enviar('busqueda', texto.toLowerCase(), resultados.length);

        const saludo = 'Hola Dra. Escarlet, visité la página de ziGO y me gustaría agendar una cita o solicitar información de costos.';
        let html = '';
        if (sugerencias.length) {
            html += `<div class="caja-sugerencia"><i class="fas fa-magic" aria-hidden="true"></i> ¿Quisiste decir <strong>${escaparHTML(sugerencias.join(', '))}</strong>?</div>`;
        }
        if (pideContacto || !resultados.length) {
            html += `
                <div class="caja-contacto">
                    <strong><i class="fas fa-user-md" aria-hidden="true"></i> Atención directa · Dra. Escarlet Alcocer</strong>
                    <p>Para citas, costos y promociones vigentes escríbenos o llama al <strong>${CONFIG_ZIGO.telefono}</strong>.</p>
                    <div class="acciones-contacto">
                        <a href="${urlWhatsApp(saludo)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp"><i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>
                        <a href="${urlTelegram()}" target="_blank" rel="noopener noreferrer" class="btn-contorno"><i class="fab fa-telegram" aria-hidden="true"></i> Telegram</a>
                        <a href="tel:+${CONFIG_ZIGO.whatsapp.replace(/^521/, '52')}" class="btn-contorno"><i class="fas fa-phone" aria-hidden="true"></i> Llamar</a>
                    </div>
                </div>`;
        }
        const lista = resultados.length ? resultados : indice.slice(1, 4);
        if (!resultados.length) html += '<p class="modal-nota">No encontramos una coincidencia exacta. Quizá buscabas:</p>';
        html += lista.map(r => `
            <a href="${rutaSitio(r.url)}" class="item-resultado">
                <span><strong>${escaparHTML(r.titulo)}</strong><small>${escaparHTML(r.desc)}</small></span>
                <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </a>`).join('');

        capa.querySelector('.modal-content').innerHTML = `
            ${BOTON_CERRAR_MODAL}
            <h3><i class="fas fa-search" aria-hidden="true"></i> Resultados para “${escaparHTML(texto)}”</h3>
            <div class="lista-resultados">${html}</div>`;
        abrirModal(capa);
    }

    campo.closest('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        buscar(campo.value);
    });

    // Los buscadores pueden enlazar a armazones.html?q=... (SearchAction del marcado schema.org)
    const consultaUrl = new URLSearchParams(window.location.search).get('q');
    if (consultaUrl) {
        campo.value = consultaUrl.slice(0, 80);
        buscar(campo.value);
    }
}

/*============================================================
    7. BUZÓN DE QUEJAS Y ENCUESTA DE SATISFACCIÓN (todas las páginas)
    Ambos se guardan en la hoja "Buzon_Comentarios"; el buzón además
    avisa por correo al equipo de ziGO desde el backend.
============================================================*/

/** Envía un comentario al backend y devuelve el folio, o null si no se pudo guardar. */
async function enviarComentario(datos) {
    try {
        const respuesta = await ZigoAnalitica.llamar('feedback', { pagina: PAGINA_ACTUAL, ...datos });
        return respuesta && respuesta.ok ? (respuesta.folio || 'registrado') : null;
    } catch (e) {
        return null;
    }
}

const CALIFICACION_POR_TIPO = { Queja: 1, Sugerencia: 3, 'Felicitación': 5 };

/** Conecta un formulario de buzón (el rápido del botón flotante o el de nosotros.html). */
function conectarFormularioBuzon(formulario, cajaRespuesta) {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boton = formulario.querySelector('button[type="submit"]');
        const tipo = formulario.elements.tipo.value;
        const textoBoton = boton.innerHTML;
        boton.disabled = true;
        boton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Enviando…';

        const folio = await enviarComentario({
            origen: 'buzon', categoria: tipo, calificacion: CALIFICACION_POR_TIPO[tipo] || 3,
            nombre: formulario.elements.nombre.value.trim(), mensaje: formulario.elements.mensaje.value.trim(),
            hp: formulario.elements.sitio.value
        });

        boton.disabled = false;
        boton.innerHTML = textoBoton;
        cajaRespuesta.classList.remove('oculto', 'alerta-exito', 'alerta-aviso');
        if (folio) {
            ZigoAnalitica.enviar('conversion_buzonQuejas', tipo);
            formulario.reset();
            cajaRespuesta.classList.add('alerta-exito');
            cajaRespuesta.innerHTML = `<i class="fas fa-check-circle icono-exito" aria-hidden="true"></i> <strong>Recibimos tu mensaje. Folio ${escaparHTML(folio)}.</strong> El equipo de ziGO lo revisará a la brevedad.`;
        } else {
            const texto = `Buzón ziGO (${tipo}): ${formulario.elements.mensaje.value.trim()}`;
            cajaRespuesta.classList.add('alerta-aviso');
            cajaRespuesta.innerHTML = `No pudimos enviar tu mensaje en este momento. <a href="${urlWhatsApp(texto)}" target="_blank" rel="noopener noreferrer"><strong>Envíalo por WhatsApp</strong></a> y lo atendemos de inmediato.`;
        }
    });
}

const CAMPOS_BUZON = `
    <input type="text" name="nombre" class="input-neon" maxlength="80" placeholder="Tu nombre (opcional)" aria-label="Tu nombre" autocomplete="name">
    <select name="tipo" class="select-neon" aria-label="Tipo de comentario" required>
        <option value="Sugerencia">Sugerencia de mejora</option>
        <option value="Queja">Queja sobre atención o servicio</option>
        <option value="Felicitación">Felicitación al equipo</option>
    </select>
    <textarea name="mensaje" class="input-neon" rows="4" maxlength="800" required placeholder="Cuéntanos qué pasó o qué podemos mejorar…" aria-label="Tu mensaje"></textarea>
    <input type="text" name="sitio" class="campo-trampa" tabindex="-1" autocomplete="off" aria-hidden="true">`;

function abrirBuzonRapido() {
    const capa = crearModal('modal-buzon', 'modal-ancho');
    if (!capa.querySelector('form')) {
        capa.querySelector('.modal-content').innerHTML = `
            ${BOTON_CERRAR_MODAL}
            <h3><i class="fas fa-comment-medical" aria-hidden="true"></i> Buzón de quejas y sugerencias</h3>
            <p class="modal-nota">Tu mensaje llega directamente al equipo de calidad de ziGO. No pedimos datos de contacto: si quieres respuesta, déjalos en el mensaje.</p>
            <form class="form-vertical">${CAMPOS_BUZON}
                <button type="submit" class="boton-agenda"><i class="fas fa-paper-plane" aria-hidden="true"></i> Enviar</button>
            </form>
            <div class="oculto" role="status"></div>`;
        conectarFormularioBuzon(capa.querySelector('form'), capa.querySelector('[role="status"]'));
    }
    abrirModal(capa);
}

/** Buzón fijo de nosotros.html */
function inicializarBuzonNosotros() {
    const formulario = document.getElementById('form-buzon');
    if (!formulario) return;
    formulario.insertAdjacentHTML('afterbegin', `<div class="fila-form">${CAMPOS_BUZON}</div>`);
    // El mensaje ocupa todo el ancho, debajo de nombre y tipo
    formulario.insertBefore(formulario.elements.mensaje, formulario.querySelector('button'));
    conectarFormularioBuzon(formulario, document.getElementById('respuesta-buzon'));
}

/** Encuesta de cinco caritas que se añade al final de cada página pública. */
function inicializarEncuesta() {
    const principal = document.getElementById('contenido-principal');
    if (!principal || PAGINA_ACTUAL === 'admin.html') return;

    const caritas = [['😡', 'Muy mala'], ['😕', 'Mala'], ['😐', 'Regular'], ['🙂', 'Buena'], ['🤩', 'Excelente']];
    const seccion = document.createElement('section');
    seccion.className = 'encuesta-caja';
    seccion.setAttribute('aria-label', 'Encuesta de satisfacción');
    seccion.innerHTML = `
        <h2>¿Cómo está siendo tu experiencia en ziGO?</h2>
        <p>Tu opinión nos ayuda a mejorar el catálogo, la atención y el probador virtual.</p>
        <div class="encuesta-caritas" role="group" aria-label="Califica de 1 a 5">
            ${caritas.map(([cara, texto], i) => `<button type="button" class="btn-carita" data-valor="${i + 1}" title="${texto}" aria-label="${i + 1} de 5: ${texto}">${cara}</button>`).join('')}
        </div>
        <div class="encuesta-extra oculto">
            <input type="text" class="input-neon" maxlength="240" placeholder="¿Algo que quieras contarnos? (opcional)" aria-label="Comentario opcional">
            <input type="text" class="campo-trampa" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button type="button" class="boton-agenda">Enviar valoración</button>
        </div>
        <p class="encuesta-gracias oculto" role="status">¡Gracias por calificarnos! Tu opinión quedó registrada.</p>`;
    principal.appendChild(seccion);

    const extra = seccion.querySelector('.encuesta-extra');
    const gracias = seccion.querySelector('.encuesta-gracias');
    const [comentario, trampa] = extra.querySelectorAll('input');
    const enviar = extra.querySelector('button');
    let valor = 0;

    // Una valoración por visita: evita envíos repetidos por accidente
    if (Almacen.leer('zigo_encuesta_enviada', true)) {
        seccion.querySelector('.encuesta-caritas').classList.add('oculto');
        gracias.classList.remove('oculto');
        return;
    }

    seccion.querySelector('.encuesta-caritas').addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-carita');
        if (!boton) return;
        valor = Number(boton.dataset.valor);
        seccion.querySelectorAll('.btn-carita').forEach(b => b.classList.toggle('activa', b === boton));
        extra.classList.remove('oculto');
    });

    enviar.addEventListener('click', async () => {
        if (!valor) return;
        enviar.disabled = true;
        await enviarComentario({
            origen: 'encuesta', categoria: 'Encuesta', calificacion: valor,
            nombre: 'Visitante', mensaje: comentario.value.trim(), hp: trampa.value
        });
        Almacen.guardar('zigo_encuesta_enviada', '1', true);
        extra.classList.add('oculto');
        seccion.querySelector('.encuesta-caritas').classList.add('oculto');
        gracias.classList.remove('oculto');
    });
}

/*============================================================
    8. AVISO Y PERMISO DE CÁMARA (armazones.html y probador.html)
    Antes de encender la cámara o analizar una foto se muestra el
    aviso y se pide aceptación expresa. La aceptación vale solo
    para la visita actual a la página: al volver se pide de nuevo.
============================================================*/
let permisoCamaraAceptado = false;

function pedirPermisoCamara() {
    if (permisoCamaraAceptado) return Promise.resolve(true);

    const capa = crearModal('modal-permiso-camara', 'modal-consentimiento');
    capa.querySelector('.modal-content').innerHTML = `
        <h2><i class="fas fa-shield-alt icono-acento" aria-hidden="true"></i> Antes de usar tu cámara</h2>
        <div class="texto-consentimiento" tabindex="0">
            <p>El probador virtual y la recomendación por tipo de rostro necesitan ver tu cara. Lee cómo funciona:</p>
            <ul>
                <li><strong>Todo se procesa en tu dispositivo.</strong> ziGO no graba, no guarda y no envía a ningún servidor tu video, tus fotos ni las medidas de tu rostro. Al cerrar el probador o salir de la página, esa información se descarta.</li>
                <li><strong>Para qué se usa.</strong> Únicamente para colocar los armazones sobre tu imagen y estimar la forma de tu rostro. No se usa para identificarte ni se comparte con terceros.</li>
                <li><strong>Qué sí registramos.</strong> De forma anónima, qué modelo se probó y qué forma de rostro se estimó, para nuestras estadísticas. Esos datos no llevan tu nombre ni permiten saber quién eres.</li>
                <li><strong>Programa de detección.</strong> El motor de detección facial (MediaPipe, de código abierto) se descarga desde la red de distribución jsDelivr; solo se descarga el programa, nunca se le envían imágenes.</li>
                <li><strong>Las fotos que guardes son tuyas.</strong> El botón “Guardar foto” descarga la imagen directamente a tu dispositivo; ziGO no conserva copia.</li>
                <li><strong>No es un diagnóstico.</strong> El resultado es una orientación estética automática. No sustituye el examen de la vista, la asesoría profesional ni la prueba física del armazón; colores y medidas pueden variar.</li>
                <li><strong>Edad.</strong> Debes ser mayor de edad o usar esta herramienta con autorización y supervisión de tu madre, padre o tutor.</li>
                <li><strong>Puedes retirar tu permiso</strong> en cualquier momento cerrando el probador o bloqueando la cámara desde tu navegador.</li>
            </ul>
            <p>Más información en el <a href="${rutaSitio('pages/legal.html')}" target="_blank" rel="noopener">Aviso de Privacidad y términos de uso</a>.</p>
        </div>
        <label class="casilla-consentimiento">
            <input type="checkbox" id="casilla-permiso-camara">
            <span>He leído este aviso y el Aviso de Privacidad, y doy mi consentimiento expreso para usar mi cámara o mi fotografía con este fin.</span>
        </label>
        <div class="acciones-modal">
            <button type="button" class="btn-contorno" data-cerrar-modal>No acepto</button>
            <button type="button" class="boton-agenda" id="btn-aceptar-camara" disabled>Acepto y continuar</button>
        </div>`;

    const casilla = capa.querySelector('#casilla-permiso-camara');
    const aceptar = capa.querySelector('#btn-aceptar-camara');
    casilla.addEventListener('change', () => { aceptar.disabled = !casilla.checked; });

    return new Promise((resolver) => {
        const terminar = (aceptado) => {
            capa.removeEventListener('zigo:cerrado', alCerrar);
            permisoCamaraAceptado = aceptado;
            if (aceptado) {
                ZigoAnalitica.enviar('consentimiento_camara', PAGINA_ACTUAL);
                cerrarModal(capa);
            }
            resolver(aceptado);
        };
        const alCerrar = () => terminar(false);
        capa.addEventListener('zigo:cerrado', alCerrar);
        aceptar.addEventListener('click', () => terminar(true));
        abrirModal(capa);
    });
}

/*============================================================
    9. MOTOR DE REALIDAD AUMENTADA (armazones.html y probador.html)

    Cómo logra que el armazón parezca puesto:
    1. MediaPipe FaceMesh entrega 478 puntos del rostro en 3D.
    2. Con ellos se arma la orientación de la cabeza (derecha, abajo,
       frente), de modo que el armazón gira, se inclina y cabecea
       igual que el rostro.
    3. El frente del armazón es un plano curvo en ese espacio 3D,
       apoyado en el puente de la nariz y tan ancho como la cara;
       se dibuja como una malla de triángulos con perspectiva.
    4. Las varillas salen de las bisagras hacia las orejas y quedan
       ocultas detrás del rostro cuando corresponde.
    Cada cuadro se analiza y se dibuja junto con sus propios puntos,
    por eso el armazón no se retrasa respecto a la cara.
============================================================*/
const MotorAR = (() => {
    // Contorno del rostro en FaceMesh, en orden; sirve para tapar las varillas que pasan por detrás
    const CONTORNO_ROSTRO = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    // En teléfonos y tabletas se trabaja en modo ligero: detección sin el modelo extra de iris,
    // malla más gruesa y sin sombra difuminada. La diferencia visual es mínima y el probador va fluido.
    const ligero = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
    const MALLA_X = ligero ? 10 : 12;
    const MALLA_Y = ligero ? 3 : 4;
    const CURVATURA = 0.07;                         // cuánto se curva el frente hacia las sienes (fracción del ancho)
    const INCLINACION = 8 * Math.PI / 180;          // inclinación natural del frente hacia las mejillas
    const ANCHO_REFERENCIA_MM = 138;

    const vec = {
        suma: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
        resta: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
        por: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
        punto: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
        cruz: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
        largo: (a) => Math.hypot(a[0], a[1], a[2]),
        unidad: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
        medio: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    };
    const acotar = (valor, min, max) => Math.max(min, Math.min(max, valor));

    /*------------------------------------------------------------
        Detector facial: se descarga una sola vez, cuando hace falta
    ------------------------------------------------------------*/
    let carga = null;
    let detector = null;
    let marcasDetectadas = null;
    let cola = Promise.resolve();

    function cargar() {
        if (carga) return carga;
        carga = new Promise((resolver, rechazar) => {
            const script = document.createElement('script');
            script.src = `${CONFIG_ZIGO.faceMesh.base}face_mesh.js`;
            script.integrity = CONFIG_ZIGO.faceMesh.integridad;
            script.crossOrigin = 'anonymous';
            script.onload = resolver;
            script.onerror = () => rechazar(new Error('sin-motor'));
            document.head.appendChild(script);
        }).then(async () => {
            const instancia = new FaceMesh({ locateFile: (archivo) => CONFIG_ZIGO.faceMesh.base + archivo });
            instancia.setOptions({ maxNumFaces: 1, refineLandmarks: !ligero, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            instancia.onResults((r) => { marcasDetectadas = (r.multiFaceLandmarks && r.multiFaceLandmarks[0]) || null; });
            await instancia.initialize();
            detector = instancia;
        });
        // Si la descarga falla (sin red), el siguiente intento vuelve a probar
        carga.catch(() => { carga = null; });
        return carga;
    }

    /** Analiza una imagen o un cuadro de video y devuelve los puntos del rostro, o null si no hay rostro. */
    function detectar(imagen) {
        const turno = cola.then(async () => {
            await cargar();
            marcasDetectadas = null;
            await detector.send({ image: imagen });
            return marcasDetectadas;
        });
        cola = turno.catch(() => {});
        return turno;
    }

    /**
     * Suaviza el temblor entre cuadros sin frenar los movimientos reales:
     * un punto que casi no se movió se promedia con el anterior; uno que se movió mucho se respeta.
     */
    function suavizar(anteriores, nuevas) {
        if (!anteriores || anteriores.length !== nuevas.length) return nuevas.map(p => ({ x: p.x, y: p.y, z: p.z }));
        return nuevas.map((p, i) => {
            const a = anteriores[i];
            const peso = Math.min(1, 0.35 + Math.hypot(p.x - a.x, p.y - a.y) * 70);
            return { x: a.x + (p.x - a.x) * peso, y: a.y + (p.y - a.y) * peso, z: a.z + (p.z - a.z) * peso * 0.8 };
        });
    }

    /*------------------------------------------------------------
        Imagen del armazón lista para dibujar
    ------------------------------------------------------------*/
    const armazonesListos = new Map();

    function cargarImagen(url) {
        return new Promise((resolver, rechazar) => {
            const imagen = new Image();
            imagen.decoding = 'async';
            imagen.onload = () => resolver(imagen);
            imagen.onerror = () => rechazar(new Error('sin-imagen'));
            imagen.src = url;
        });
    }

    /**
     * Para modelos sin imagen "ar": recorta el fondo blanco de la foto de catálogo.
     * Borra lo casi blanco conectado a los bordes y al centro de cada mica, y
     * devuelve el frente ya recortado junto con el color promedio del extremo
     * (el de las varillas). Devuelve null si el navegador no deja leer los
     * píxeles, como pasa al abrir el sitio desde un archivo local.
     */
    function quitarFondoBlanco(imagen) {
        const escala = Math.min(1, 640 / imagen.naturalWidth);
        const w = Math.round(imagen.naturalWidth * escala);
        const h = Math.round(imagen.naturalHeight * escala);
        const lienzo = document.createElement('canvas');
        lienzo.width = w;
        lienzo.height = h;
        const ctx = lienzo.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imagen, 0, 0, w, h);

        let datos;
        try { datos = ctx.getImageData(0, 0, w, h); } catch (e) { return null; }
        const px = datos.data;
        const esFondo = (i) => px[i + 3] < 30 || (Math.min(px[i], px[i + 1], px[i + 2]) > 226 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 24);

        const visto = new Uint8Array(w * h);
        const pila = [];
        const sembrar = (x, y) => {
            const p = y * w + x;
            if (!visto[p] && esFondo(p * 4)) { visto[p] = 1; pila.push(p); }
        };
        for (let x = 0; x < w; x++) { sembrar(x, 0); sembrar(x, h - 1); }
        for (let y = 0; y < h; y++) { sembrar(0, y); sembrar(w - 1, y); }
        sembrar(Math.round(w * 0.28), Math.round(h * 0.52));
        sembrar(Math.round(w * 0.72), Math.round(h * 0.52));
        while (pila.length) {
            const p = pila.pop();
            px[p * 4 + 3] = 0;
            const x = p % w;
            const y = (p - x) / w;
            if (x > 0) sembrar(x - 1, y);
            if (x < w - 1) sembrar(x + 1, y);
            if (y > 0) sembrar(x, y - 1);
            if (y < h - 1) sembrar(x, y + 1);
        }

        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (px[(y * w + x) * 4 + 3] > 40) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX - minX < 20 || maxY - minY < 8) return null;

        let r = 0, g = 0, b = 0, n = 0;
        const franja = minX + Math.round((maxX - minX) * 0.07);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= franja; x++) {
                const i = (y * w + x) * 4;
                if (px[i + 3] > 200) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
            }
        }

        ctx.putImageData(datos, 0, 0);
        const recorte = document.createElement('canvas');
        recorte.width = maxX - minX + 1;
        recorte.height = maxY - minY + 1;
        recorte.getContext('2d').drawImage(lienzo, minX, minY, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
        return { imagen: recorte, color: n ? `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})` : '' };
    }

    function prepararArmazon(modelo) {
        if (!armazonesListos.has(modelo.id)) {
            armazonesListos.set(modelo.id, (async () => {
                let imagen = await cargarImagen(rutaSitio(modelo.ar || modelo.archivo));
                let color = modelo.colorVarilla || '';
                if (!modelo.ar) {
                    const recorte = quitarFondoBlanco(imagen);
                    if (recorte) {
                        imagen = recorte.imagen;
                        color = color || recorte.color;
                    }
                }
                const [calibre, puente] = (modelo.medidas || '').split('-').map(Number);
                const anchoMm = calibre && puente ? calibre * 2 + puente + 12 : ANCHO_REFERENCIA_MM;
                return {
                    imagen,
                    ancho: imagen.naturalWidth || imagen.width,
                    alto: imagen.naturalHeight || imagen.height,
                    bisagraY: modelo.bisagraY ?? 0.25,
                    color: color || '#22262c',
                    talla: acotar(anchoMm / ANCHO_REFERENCIA_MM, 0.93, 1.08)
                };
            })());
        }
        return armazonesListos.get(modelo.id);
    }

    /*------------------------------------------------------------
        Postura de la cabeza a partir de los puntos del rostro
    ------------------------------------------------------------*/

    /**
     * mapa traduce las coordenadas normalizadas de FaceMesh a píxeles del lienzo.
     * Devuelve los ejes de la cabeza (derecha, abajo, frente), el punto de apoyo
     * en el puente de la nariz y las medidas que fijan el tamaño del armazón.
     */
    function calcularPostura(marcas, mapa) {
        // La profundidad (z) es el dato menos estable de FaceMesh, sobre todo en teléfonos:
        // se acota a un rango razonable respecto al ancho del rostro en pantalla
        const ancho2D = Math.hypot(mapa.x(marcas[454].x) - mapa.x(marcas[234].x), mapa.y(marcas[454].y) - mapa.y(marcas[234].y)) || 1;
        const P = (i) => [mapa.x(marcas[i].x), mapa.y(marcas[i].y), acotar(marcas[i].z * mapa.escala, -ancho2D, ancho2D)];

        // El iris da la posición exacta de cada pupila; su profundidad se toma de las comisuras del ojo
        const ojo = (iris, a, b) => {
            const centro = vec.medio(P(a), P(b));
            return marcas[iris] ? [mapa.x(marcas[iris].x), mapa.y(marcas[iris].y), centro[2]] : centro;
        };
        const ojoA = ojo(468, 33, 133);
        const ojoB = ojo(473, 263, 362);

        // Eje derecha: de sien a sien, reforzado con la línea de los ojos. Siempre apunta a la derecha de la pantalla.
        let derecha = vec.unidad(vec.suma(vec.resta(P(454), P(234)), vec.por(vec.resta(P(263), P(33)), 1.5)));
        if (derecha[0] < 0) derecha = vec.por(derecha, -1);

        // Eje frente: perpendicular a la cara, hacia la cámara (z negativa en FaceMesh)
        const frenteAMenton = vec.resta(P(152), P(10));
        let frente = vec.unidad(vec.cruz(derecha, frenteAMenton));
        if (frente[2] > 0) frente = vec.por(frente, -1);

        let abajo = vec.unidad(vec.cruz(derecha, frente));
        if (vec.punto(abajo, frenteAMenton) < 0) abajo = vec.por(abajo, -1);

        const centroOjos = vec.medio(ojoA, ojoB);
        const distanciaPupilar = Math.min(vec.largo(vec.resta(ojoB, ojoA)), Math.hypot(ojoB[0] - ojoA[0], ojoB[1] - ojoA[1]) * 1.4);
        // El ancho real nunca puede superar por mucho al que se ve en pantalla (límite: giro de unos 45°)
        const anchoCara = Math.min(vec.largo(vec.resta(P(454), P(234))), ancho2D * 1.4);

        return {
            P, derecha, abajo, frente, centroOjos, distanciaPupilar, anchoCara,
            // Ancho de trabajo: promedia la cara y la distancia entre pupilas para que un giro no lo altere
            anchoBase: anchoCara * 0.5 + distanciaPupilar * 2.25 * 0.5,
            profundidadPuente: vec.punto(vec.resta(P(168), centroOjos), frente)
        };
    }

    /*------------------------------------------------------------
        Dibujo del armazón sobre el rostro
    ------------------------------------------------------------*/

    /** Dibuja un triángulo de la imagen del armazón deformado hasta ocupar el triángulo destino. */
    function dibujarTriangulo(ctx, imagen, o, d) {
        const [x0, y0, x1, y1, x2, y2] = o;
        const [u0, v0, u1, v1, u2, v2] = d;
        const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
        if (Math.abs(den) < 1e-6) return;

        // El recorte se agranda una fracción de píxel para que no se vean costuras entre triángulos
        const cx = (u0 + u1 + u2) / 3;
        const cy = (v0 + v1 + v2) / 3;
        const crecer = (u, v) => { const l = Math.hypot(u - cx, v - cy) || 1; return [u + (u - cx) / l * 0.5, v + (v - cy) / l * 0.5]; };

        // 'copy' hace que cada triángulo sustituya lo que había en su zona en lugar de sumarse:
        // así las micas semitransparentes no se oscurecen donde dos triángulos se enciman
        ctx.save();
        ctx.globalCompositeOperation = 'copy';
        ctx.beginPath();
        ctx.moveTo(...crecer(u0, v0));
        ctx.lineTo(...crecer(u1, v1));
        ctx.lineTo(...crecer(u2, v2));
        ctx.closePath();
        ctx.clip();
        ctx.setTransform(
            (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den,
            (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den,
            (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den,
            (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den,
            (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den,
            (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den
        );
        ctx.drawImage(imagen, 0, 0);
        ctx.restore();
    }

    /**
     * Dibuja el armazón completo.
     * ctx: lienzo visible · capa: lienzo auxiliar del mismo tamaño donde se arma el frente
     * ajustes: { escala, altura } elegidos por la persona con los deslizadores
     */
    function dibujar(ctx, capa, marcas, mapa, armazon, ajustes) {
        const postura = calcularPostura(marcas, mapa);
        const { derecha, abajo, frente, anchoBase } = postura;

        const ancho = anchoBase * 1.05 * armazon.talla * ajustes.escala;
        const alto = ancho * armazon.alto / armazon.ancho;

        // El frente se inclina un poco hacia las mejillas, como un armazón real
        const abajoFrente = vec.resta(vec.por(abajo, Math.cos(INCLINACION)), vec.por(frente, Math.sin(INCLINACION)));

        // Punto de apoyo: centro de los ojos llevado al puente de la nariz, con las pupilas apenas arriba del centro de la mica
        const ancla = vec.suma(
            vec.suma(postura.centroOjos, vec.por(frente, postura.profundidadPuente + anchoBase * 0.03)),
            vec.por(abajo, postura.distanciaPupilar * 0.06 + ajustes.altura * anchoBase)
        );

        // Perspectiva: lo que queda más lejos de la cámara se ve más chico y más cerca del centro de la imagen
        const proyectar = (p) => {
            const k = acotar(mapa.focal / (mapa.focal + (p[2] - ancla[2])), 0.6, 1.5);
            return [mapa.cx + (p[0] - mapa.cx) * k, mapa.cy + (p[1] - mapa.cy) * k];
        };
        const puntoDelFrente = (u, v) => vec.suma(
            vec.suma(ancla, vec.por(derecha, (u - 0.5) * ancho)),
            vec.resta(vec.por(abajoFrente, (v - 0.5) * alto), vec.por(frente, CURVATURA * ancho * (2 * u - 1) ** 2))
        );

        // 1. Varillas (debajo del frente)
        const contorno = new Path2D();
        contorno.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        CONTORNO_ROSTRO.forEach((i, n) => {
            const x = mapa.x(marcas[i].x);
            const y = mapa.y(marcas[i].y);
            if (n === 0) contorno.moveTo(x, y); else contorno.lineTo(x, y);
        });
        contorno.closePath();

        const grosor = Math.max(2.5, alto * 0.1);
        for (const lado of [-1, 1]) {
            const bisagra3D = puntoDelFrente(0.5 + lado * 0.485, armazon.bisagraY);
            const punta3D = vec.suma(bisagra3D, vec.suma(
                vec.por(frente, -postura.anchoCara * 0.7),
                vec.suma(vec.por(derecha, lado * postura.anchoCara * 0.03), vec.por(abajo, postura.anchoCara * 0.05))
            ));
            const a = proyectar(bisagra3D);
            const b = proyectar(punta3D);
            const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (largo < 2) continue;
            const nx = -(b[1] - a[1]) / largo;
            const ny = (b[0] - a[0]) / largo;

            const trazo = new Path2D();
            trazo.moveTo(a[0] + nx * grosor / 2, a[1] + ny * grosor / 2);
            trazo.lineTo(b[0] + nx * grosor * 0.3, b[1] + ny * grosor * 0.3);
            trazo.lineTo(b[0] - nx * grosor * 0.3, b[1] - ny * grosor * 0.3);
            trazo.lineTo(a[0] - nx * grosor / 2, a[1] - ny * grosor / 2);
            trazo.closePath();

            // La varilla se desvanece al llegar a la oreja
            const degradado = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
            degradado.addColorStop(0, armazon.color);
            degradado.addColorStop(0.72, armazon.color);
            degradado.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = degradado;

            // Del lado que mira a la cámara la varilla se ve completa; del otro,
            // solo lo que asoma por fuera del contorno del rostro
            const haciaCamara = -lado * derecha[2];
            ctx.save();
            ctx.clip(contorno, 'evenodd');
            ctx.fill(trazo);
            ctx.restore();
            const visible = acotar((haciaCamara - 0.04) / 0.12, 0, 1);
            if (visible > 0) {
                ctx.save();
                ctx.globalAlpha = visible;
                ctx.fill(trazo);
                ctx.restore();
            }
        }

        // 2. Frente: malla de triángulos sobre la capa auxiliar
        const c = capa.getContext('2d');
        const vertices = [];
        for (let j = 0; j <= MALLA_Y; j++) {
            for (let i = 0; i <= MALLA_X; i++) vertices.push(proyectar(puntoDelFrente(i / MALLA_X, j / MALLA_Y)));
        }
        // Solo se limpia y se copia el rectángulo que ocupa el armazón, no el lienzo entero
        const zx = Math.max(0, Math.floor(Math.min(...vertices.map(v => v[0])) - 4));
        const zy = Math.max(0, Math.floor(Math.min(...vertices.map(v => v[1])) - 4));
        const zw = Math.min(capa.width, Math.ceil(Math.max(...vertices.map(v => v[0])) + 4)) - zx;
        const zh = Math.min(capa.height, Math.ceil(Math.max(...vertices.map(v => v[1])) + 4)) - zy;
        if (zw < 2 || zh < 2) return;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(zx, zy, zw, zh);
        const pasoX = armazon.ancho / MALLA_X;
        const pasoY = armazon.alto / MALLA_Y;
        for (let j = 0; j < MALLA_Y; j++) {
            for (let i = 0; i < MALLA_X; i++) {
                const v00 = vertices[j * (MALLA_X + 1) + i];
                const v10 = vertices[j * (MALLA_X + 1) + i + 1];
                const v01 = vertices[(j + 1) * (MALLA_X + 1) + i];
                const v11 = vertices[(j + 1) * (MALLA_X + 1) + i + 1];
                const x = i * pasoX;
                const y = j * pasoY;
                dibujarTriangulo(c, armazon.imagen, [x, y, x + pasoX, y, x, y + pasoY], [...v00, ...v10, ...v01]);
                dibujarTriangulo(c, armazon.imagen, [x + pasoX, y, x + pasoX, y + pasoY, x, y + pasoY], [...v10, ...v11, ...v01]);
            }
        }

        // 3. El frente se pasa al lienzo visible con una sombra suave sobre la piel
        ctx.save();
        if (!ligero) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = ancho * 0.025;
            ctx.shadowOffsetY = ancho * 0.012;
        }
        ctx.drawImage(capa, zx, zy, zw, zh, zx, zy, zw, zh);
        ctx.restore();
    }

    /*------------------------------------------------------------
        Medidas para estimar la forma del rostro
    ------------------------------------------------------------*/

    /** Devuelve las proporciones del rostro, o null si la cara no está de frente. */
    function medirRostro(marcas, mapa) {
        const postura = calcularPostura(marcas, mapa);
        if (Math.abs(postura.derecha[2]) > 0.26 || Math.abs(postura.abajo[2]) > 0.4) return null;
        const d = (a, b) => vec.largo(vec.resta(postura.P(a), postura.P(b)));
        const pomulos = d(234, 454);
        const mandibula = d(58, 288);
        return {
            largoAncho: d(10, 152) / pomulos,
            frenteMandibula: d(54, 284) / mandibula,
            pomuloMandibula: pomulos / mandibula
        };
    }

    return { cargar, detectar, suavizar, prepararArmazon, dibujar, medirRostro, ligero, get listo() { return Boolean(detector); } };
})();

/**
 * Visor del probador: muestra la cámara (o una foto) con el armazón encima.
 *
 * Con la cámara hay dos formas de trabajar:
 * - Sincronizada (computadoras): cada cuadro se copia, se analiza y se dibuja junto con
 *   su armazón, así el armazón nunca va detrás del rostro.
 * - Superpuesta (teléfonos o equipos lentos): el video corre libre debajo del lienzo y
 *   el lienzo, transparente, solo dibuja el armazón. La imagen nunca se congela aunque
 *   la detección tarde.
 * El <video> alimenta al lienzo, que lo tapa: lo que se ve es siempre el lienzo.
 */
class VisorAR {
    constructor(contenedor) {
        this.caja = contenedor;
        this.video = contenedor.querySelector('video');
        // En teléfonos el video solo arranca solo si está silenciado y "en línea" (sin pantalla completa),
        // y esas dos propiedades deben fijarse aquí: como atributos HTML no siempre se respetan
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.lienzo = contenedor.querySelector('canvas');
        this.ctx = this.lienzo.getContext('2d');
        this.capa = document.createElement('canvas');
        this.cuadro = document.createElement('canvas');
        this.modo = 'apagado';
        this.flujo = null;
        this.foto = null;
        this.marcas = null;
        this.mapa = null;
        this.armazon = null;
        this.ajustes = { escala: 1, altura: 0, brillo: 100, contraste: 100 };
        this.turno = 0;
        this.superpuesto = MotorAR.ligero;
        this.alCambiarEstado = () => {};
    }

    /** Relación entre la imagen de origen y el lienzo: cubrirlo (cámara) o caber completa (foto). */
    crearMapa(anchoFuente, altoFuente, espejo, cubrir) {
        const w = this.lienzo.width;
        const h = this.lienzo.height;
        const escala = (cubrir ? Math.max : Math.min)(w / anchoFuente, h / altoFuente);
        const dw = anchoFuente * escala;
        const dh = altoFuente * escala;
        const ox = (w - dw) / 2;
        const oy = (h - dh) / 2;
        return {
            ox, oy, dw, dh, espejo, escala: dw, cx: w / 2, cy: h / 2, focal: dw * 0.9,
            x: (nx) => ox + (espejo ? 1 - nx : nx) * dw,
            y: (ny) => oy + ny * dh
        };
    }

    ajustarLienzo() {
        const densidad = Math.min(MotorAR.ligero ? 1.5 : 2, window.devicePixelRatio || 1);
        // Se mide la caja del visor y no el lienzo: en algunos navegadores móviles el alto del
        // lienzo depende de su propia resolución, y medirlo a él lo haría crecer sin control
        const w = Math.max(2, Math.round(this.caja.clientWidth * densidad));
        const h = Math.max(2, Math.round(this.caja.clientHeight * densidad));
        if (this.lienzo.width !== w || this.lienzo.height !== h) {
            this.lienzo.width = this.capa.width = w;
            this.lienzo.height = this.capa.height = h;
        }
    }

    pintar() {
        const espejo = this.modo === 'camara';
        const soloArmazon = espejo && this.superpuesto;
        const fuente = this.modo === 'foto' ? this.foto : soloArmazon ? this.video : this.cuadro;
        const anchoFuente = fuente ? (fuente.videoWidth || fuente.width) : 0;
        const altoFuente = fuente ? (fuente.videoHeight || fuente.height) : 0;
        if (this.modo === 'apagado' || !anchoFuente) return;
        this.ajustarLienzo();
        const { ctx } = this;
        this.mapa = this.crearMapa(anchoFuente, altoFuente, espejo, espejo);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.lienzo.width, this.lienzo.height);
        // En modo superpuesto el lienzo queda transparente y deja ver el video que corre debajo
        if (!soloArmazon) this.dibujarFuente(ctx, fuente);

        if (this.marcas && this.armazon) MotorAR.dibujar(ctx, this.capa, this.marcas, this.mapa, this.armazon, this.ajustes);
    }

    dibujarFuente(ctx, fuente) {
        ctx.save();
        if (this.mapa.espejo) {
            ctx.translate(this.lienzo.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(fuente, this.mapa.ox, this.mapa.oy, this.mapa.dw, this.mapa.dh);
        ctx.restore();
    }

    async ponerArmazon(modelo) {
        this.armazon = await MotorAR.prepararArmazon(modelo);
        if (this.modo === 'foto') this.pintar();
    }

    ajustar(cambios) {
        Object.assign(this.ajustes, cambios);
        this.lienzo.style.filter = this.video.style.filter = `brightness(${this.ajustes.brillo}%) contrast(${this.ajustes.contraste}%)`;
        if (this.modo === 'foto') this.pintar();
    }

    async usarCamara() {
        this.detener();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('sin-camara');
        const turno = this.turno;
        let flujo;
        try {
            flujo = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: MotorAR.ligero ? 640 : 1280 }, height: { ideal: MotorAR.ligero ? 480 : 720 } },
                audio: false
            });
        } catch (e) {
            // Algunos teléfonos rechazan la resolución pedida: se reintenta sin exigir tamaño
            if (e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e;
            flujo = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        // Si mientras llegaba el permiso se cerró el probador, la cámara se apaga de inmediato
        if (turno !== this.turno) {
            flujo.getTracks().forEach(pista => pista.stop());
            return;
        }
        this.flujo = flujo;
        this.video.srcObject = flujo;
        try { await this.video.play(); } catch (e) {}
        this.modo = 'camara';
        this.bucle(turno);
    }

    /** Ciclo de la cámara: busca el rostro en el cuadro actual y dibuja el armazón en su lugar. */
    async bucle(turno) {
        let perdidos = 0;
        let fallos = 0;
        let medidos = 0;
        let tiempoMedio = 0;
        this.superpuesto = MotorAR.ligero;
        MotorAR.cargar().catch(() => this.alCambiarEstado('sin-motor'));
        this.alCambiarEstado('cargando');

        while (turno === this.turno && this.modo === 'camara') {
            if (this.video.readyState >= 2 && this.video.videoWidth) {
                if (!this.superpuesto) {
                    // Modo sincronizado: el cuadro se copia (a 960 px de ancho como máximo)
                    // para analizar y mostrar exactamente la misma imagen
                    const escala = Math.min(1, 960 / this.video.videoWidth);
                    const w = Math.round(this.video.videoWidth * escala);
                    const h = Math.round(this.video.videoHeight * escala);
                    if (this.cuadro.width !== w || this.cuadro.height !== h) {
                        this.cuadro.width = w;
                        this.cuadro.height = h;
                    }
                    this.cuadro.getContext('2d').drawImage(this.video, 0, 0, w, h);
                }

                if (MotorAR.listo) {
                    const inicio = performance.now();
                    let nuevas = null;
                    try {
                        nuevas = await MotorAR.detectar(this.superpuesto ? this.video : this.cuadro);
                        fallos = 0;
                    } catch (e) {
                        // Hay navegadores que no aceptan un lienzo como entrada: se pasa a analizar el video
                        this.superpuesto = true;
                        if (++fallos > 20) this.alCambiarEstado('sin-motor');
                    }
                    if (turno !== this.turno) return;

                    // Si el equipo no alcanza unos 18 cuadros por segundo, se deja correr el video libre
                    tiempoMedio += (performance.now() - inicio - tiempoMedio) / Math.min(++medidos, 20);
                    if (!this.superpuesto && medidos >= 20 && tiempoMedio > 55) this.superpuesto = true;

                    if (nuevas) {
                        this.marcas = MotorAR.suavizar(this.marcas, nuevas);
                        perdidos = 0;
                    } else if (++perdidos > 12) {
                        this.marcas = null;
                    }
                    if (fallos <= 20) this.alCambiarEstado(this.marcas ? 'rostro' : 'sin-rostro');
                }
                this.pintar();
            }
            await new Promise(requestAnimationFrame);
        }
    }

    /** Usa una fotografía en lugar de la cámara. Lanza 'formato', 'peso', 'ilegible' o 'sin-rostro'. */
    async usarFoto(archivo) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('formato');
        if (archivo.size > 12 * 1024 * 1024) throw new Error('peso');

        const url = URL.createObjectURL(archivo);
        let imagen;
        try {
            imagen = await new Promise((resolver, rechazar) => {
                const img = new Image();
                img.onload = () => resolver(img);
                img.onerror = () => rechazar(new Error('ilegible'));
                img.src = url;
            });
        } finally {
            URL.revokeObjectURL(url);
        }

        // La foto se reduce a 1280 px y vive solo en memoria mientras el probador esté abierto
        const escala = Math.min(1, 1280 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
        const copia = document.createElement('canvas');
        copia.width = Math.round(imagen.naturalWidth * escala);
        copia.height = Math.round(imagen.naturalHeight * escala);
        copia.getContext('2d').drawImage(imagen, 0, 0, copia.width, copia.height);

        // Dos pasadas: la primera ubica el rostro, la segunda afina los puntos
        await MotorAR.detectar(copia);
        const marcas = await MotorAR.detectar(copia);
        const anchoRostro = marcas ? Math.abs(marcas[454].x - marcas[234].x) : 0;
        if (!marcas || anchoRostro < 0.12) throw new Error('sin-rostro');

        this.detener();
        this.foto = copia;
        this.marcas = marcas.map(p => ({ x: p.x, y: p.y, z: p.z }));
        this.modo = 'foto';
        this.pintar();
        this.alCambiarEstado('foto');
    }

    /** Apaga la cámara y olvida la imagen y los puntos del rostro. */
    detener() {
        this.turno++;
        if (this.flujo) this.flujo.getTracks().forEach(pista => pista.stop());
        this.flujo = null;
        this.video.srcObject = null;
        this.foto = null;
        this.marcas = null;
        this.modo = 'apagado';
        this.ctx.clearRect(0, 0, this.lienzo.width, this.lienzo.height);
        this.cuadro.width = this.cuadro.height = 0;
        this.alCambiarEstado('apagado');
    }

    medirRostro() {
        return this.marcas && this.mapa ? MotorAR.medirRostro(this.marcas, this.mapa) : null;
    }

    /** Descarga lo que se ve en el visor. Devuelve false si el navegador no permite exportar el lienzo. */
    capturar(nombreArchivo) {
        if (this.modo === 'apagado') return false;
        try {
            const copia = document.createElement('canvas');
            copia.width = this.lienzo.width;
            copia.height = this.lienzo.height;
            const c = copia.getContext('2d');
            c.filter = this.lienzo.style.filter || 'none';
            if (this.modo === 'camara' && this.superpuesto) this.dibujarFuente(c, this.video);
            c.drawImage(this.lienzo, 0, 0);
            descargarArchivo(nombreArchivo, copia.toDataURL('image/png'));
            return true;
        } catch (e) {
            return false;
        }
    }
}

/**
 * Arma un probador completo dentro de "raiz" y devuelve su control.
 * raiz debe contener: .visor-ar, [data-controles] y, si se quiere, [data-tira].
 * Lo usan el modal de armazones.html y la página probador.html.
 */
function crearProbador({ raiz, origen, alElegir = () => {} }) {
    const cajaVisor = raiz.querySelector('.visor-ar');
    const cajaControles = raiz.querySelector('[data-controles]');
    const tira = raiz.querySelector('[data-tira]');

    cajaVisor.innerHTML = `
        <video playsinline muted></video>
        <canvas role="img" aria-label="Vista del probador virtual"></canvas>
        <div class="visor-ar-inicio">
            <i class="fas fa-video" aria-hidden="true"></i>
            <p>Enciende tu cámara o sube una foto de frente para probarte los armazones.</p>
            <button type="button" class="boton-agenda" data-accion="camara"><i class="fas fa-video" aria-hidden="true"></i> Encender cámara</button>
        </div>
        <div class="visor-ar-estado oculto" role="status"><span class="punto-estado"></span><span></span></div>
        <button type="button" class="btn-captura-ar oculto" data-accion="captura" aria-label="Guardar foto en mi dispositivo" title="Guardar foto en mi dispositivo"><i class="fas fa-camera" aria-hidden="true"></i></button>`;

    cajaControles.innerHTML = `
        <div class="controles-ar">
            <label>Tamaño del armazón <input type="range" data-ajuste="escala" min="0.8" max="1.25" step="0.01" value="1"></label>
            <label>Altura sobre la nariz <input type="range" data-ajuste="altura" min="-0.1" max="0.1" step="0.005" value="0"></label>
            <label>Brillo de la imagen <input type="range" data-ajuste="brillo" min="60" max="160" step="5" value="100"></label>
            <label>Contraste <input type="range" data-ajuste="contraste" min="70" max="150" step="5" value="100"></label>
        </div>
        <div class="fila-botones-ar">
            <button type="button" class="btn-contorno" data-accion="foto"><i class="fas fa-upload" aria-hidden="true"></i> Subir foto de mi rostro</button>
            <button type="button" class="btn-contorno oculto" data-accion="camara" data-volver><i class="fas fa-video" aria-hidden="true"></i> Volver a la cámara</button>
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp" class="oculto" aria-hidden="true" tabindex="-1">
        <div class="alerta-aviso oculto" role="alert"></div>`;

    const visor = new VisorAR(cajaVisor);
    const inicio = cajaVisor.querySelector('.visor-ar-inicio');
    const estado = cajaVisor.querySelector('.visor-ar-estado');
    const botonCaptura = cajaVisor.querySelector('.btn-captura-ar');
    const botonVolver = cajaControles.querySelector('[data-volver]');
    const selectorFoto = cajaControles.querySelector('input[type="file"]');
    const alerta = cajaControles.querySelector('.alerta-aviso');
    let modelo = null;

    const TEXTOS_ESTADO = {
        cargando: 'Cargando seguimiento facial…',
        rostro: 'Rostro detectado en vivo',
        'sin-rostro': 'Centra tu rostro frente a la cámara',
        foto: 'Foto lista: elige un armazón',
        'sin-motor': 'No se pudo iniciar el seguimiento facial. Revisa tu conexión o usa otro navegador.'
    };
    visor.alCambiarEstado = (clave) => {
        const encendido = clave !== 'apagado';
        inicio.classList.toggle('oculto', encendido);
        estado.classList.toggle('oculto', !encendido);
        botonCaptura.classList.toggle('oculto', !encendido);
        botonVolver.classList.toggle('oculto', clave !== 'foto');
        estado.firstElementChild.classList.toggle('activo', clave === 'rostro' || clave === 'foto');
        estado.lastElementChild.textContent = (TEXTOS_ESTADO[clave] || '') + (window.location.hash === '#diag'
            ? ` · video ${visor.video.videoWidth}x${visor.video.videoHeight} · lienzo ${visor.lienzo.width}x${visor.lienzo.height} · caja ${cajaVisor.clientWidth}x${cajaVisor.clientHeight} · ${visor.superpuesto ? 'superpuesto' : 'sincronizado'} · dpr ${window.devicePixelRatio}`
            : '');
    };

    function avisar(texto) {
        alerta.textContent = texto;
        alerta.classList.toggle('oculto', !texto);
        // En el teléfono el aviso puede quedar fuera de la pantalla: se lleva a la vista
        if (texto) alerta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    async function encenderCamara() {
        if (!(await pedirPermisoCamara())) return false;
        avisar('');
        try {
            await visor.usarCamara();
            if (modelo) ZigoAnalitica.enviar('prueba_ar', `${modelo.nombre} (${origen})`);
            return true;
        } catch (e) {
            const dentroDeApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|; wv\)/i.test(navigator.userAgent);
            avisar(dentroDeApp
                ? 'Este navegador integrado no permite usar la cámara. Abre zigomx.com en Chrome o Safari, o usa “Subir foto de mi rostro”.'
                : !window.isSecureContext
                    ? 'La cámara solo funciona en la dirección segura https://zigomx.com. También puedes usar “Subir foto de mi rostro”.'
                    : e.name === 'NotAllowedError'
                        ? 'El navegador bloqueó la cámara. Actívala en los permisos del sitio o usa “Subir foto de mi rostro”.'
                        : e.name === 'NotReadableError'
                            ? 'Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo, o usa “Subir foto de mi rostro”.'
                            : 'No encontramos una cámara disponible. Usa “Subir foto de mi rostro”.');
            return false;
        }
    }

    async function elegirFoto() {
        if (!(await pedirPermisoCamara())) return;
        selectorFoto.value = '';
        selectorFoto.click();
    }

    selectorFoto.addEventListener('change', async () => {
        const archivo = selectorFoto.files[0];
        if (!archivo) return;
        avisar('Analizando la foto en tu dispositivo…');
        try {
            await visor.usarFoto(archivo);
            avisar('');
            if (modelo) ZigoAnalitica.enviar('prueba_ar', `${modelo.nombre} (${origen}, foto)`);
        } catch (e) {
            avisar({
                formato: 'Formato no válido. Sube una imagen JPG, PNG o WEBP.',
                peso: 'La imagen es demasiado pesada (máximo 12 MB).',
                ilegible: 'No se pudo leer la imagen. Intenta con otra foto.',
                'sin-rostro': 'No detectamos un rostro claro. Sube un retrato de frente, bien iluminado y sin recortes.'
            }[e.message] || 'No se pudo analizar la foto. Revisa tu conexión e intenta de nuevo.');
        }
    });

    raiz.addEventListener('click', (e) => {
        const accion = e.target.closest('[data-accion]')?.dataset.accion;
        if (accion === 'camara') encenderCamara();
        else if (accion === 'foto') elegirFoto();
        else if (accion === 'captura') {
            const nombre = `ziGO-${(modelo ? modelo.nombre : 'probador').replace(/\s+/g, '-')}.png`;
            if (visor.capturar(nombre)) ZigoAnalitica.enviar('conversion_capturasAR', modelo ? modelo.nombre : '');
            else avisar('Tu navegador no permitió guardar la imagen. Abre el sitio desde https://zigomx.com e intenta de nuevo.');
        }
    });

    cajaControles.addEventListener('input', (e) => {
        const ajuste = e.target.dataset.ajuste;
        if (ajuste) visor.ajustar({ [ajuste]: Number(e.target.value) });
    });

    /** Rellena una tira de miniaturas. etiquetas: { idModelo: texto } para marcar recomendados. */
    function pintarModelos(contenedor, modelos, etiquetas = {}) {
        contenedor.innerHTML = modelos.map(m => `
            <button type="button" class="btn-modelo" data-modelo="${m.id}" aria-label="Probar ${escaparHTML(m.nombre)}">
                ${etiquetas[m.id] ? `<span class="etiqueta-modelo ${etiquetas[m.id].secundaria ? 'secundaria' : ''}">${escaparHTML(etiquetas[m.id].texto)}</span>` : ''}
                <img src="${rutaSitio(m.ar || m.archivo)}" alt="" loading="lazy" width="80" height="44">
                <span>${escaparHTML(m.nombre)}</span>
            </button>`).join('');
        marcarActivo();
    }

    function marcarActivo() {
        raiz.querySelectorAll('.btn-modelo').forEach(b => b.classList.toggle('activo', Boolean(modelo) && b.dataset.modelo === modelo.id));
    }

    /** Pone un armazón en el visor; si la cámara está apagada la enciende (pide el permiso primero). */
    async function elegir(idModelo) {
        const nuevo = buscarArmazon(idModelo);
        if (!nuevo) return false;
        const estabaApagado = visor.modo === 'apagado';
        modelo = nuevo;
        marcarActivo();
        alElegir(modelo);
        await visor.ponerArmazon(modelo);
        if (estabaApagado) return encenderCamara();
        ZigoAnalitica.enviar('prueba_ar', `${modelo.nombre} (${origen})`);
        return true;
    }

    raiz.addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-modelo');
        if (boton) elegir(boton.dataset.modelo);
    });

    function detener() {
        visor.detener();
        avisar('');
    }

    function restablecerAjustes() {
        cajaControles.querySelectorAll('[data-ajuste]').forEach(c => { c.value = c.defaultValue; });
        visor.ajustar({ escala: 1, altura: 0, brillo: 100, contraste: 100 });
    }

    if (tira) pintarModelos(tira, CATALOGO_ARMAZONES);
    window.addEventListener('pagehide', detener);
    window.addEventListener('resize', () => visor.pintar());

    return { visor, elegir, detener, encenderCamara, pintarModelos, restablecerAjustes, avisar, get modelo() { return modelo; } };
}

/*============================================================
    10. PÁGINA: pages/armazones.html
    Filtros, detalles, probador AR del modelo elegido y selección
    de armazones para la cita.
============================================================*/
function inicializarCatalogo() {
    const rejilla = document.querySelector('.armazon-grid');
    if (!rejilla) return;

    // Filtros por categoría
    const filtros = document.querySelector('.filtros-container');
    filtros.addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-filtro');
        if (!boton) return;
        filtros.querySelectorAll('.btn-filtro').forEach(b => b.classList.toggle('activo', b === boton));
        rejilla.querySelectorAll('.armazon-card').forEach(tarjeta => {
            tarjeta.classList.toggle('oculto', boton.dataset.filtro !== 'todos' && tarjeta.dataset.categoria !== boton.dataset.filtro);
        });
    });

    // Detalles del armazón
    const modalDetalles = document.getElementById('modal-detalles');
    let modeloEnDetalle = null;
    function abrirDetalles(modelo) {
        modeloEnDetalle = modelo;
        const imagen = document.getElementById('detalle-img');
        imagen.src = rutaSitio(modelo.archivo);
        imagen.alt = `Armazón ${modelo.nombre}`;
        document.getElementById('detalle-titulo').textContent = modelo.nombre;
        document.getElementById('detalle-material').textContent = `${modelo.material} · ${modelo.forma}`;
        document.getElementById('detalle-descripcion').textContent = modelo.descripcion;
        document.getElementById('detalle-medidas').textContent = `${modelo.medidas} mm`;
        document.getElementById('detalle-rostros').textContent = modelo.rostros.join(', ');
        abrirModal(modalDetalles);
    }

    // Probador AR
    const modalProbador = document.getElementById('modal-probador');
    const enlaceAgendar = document.getElementById('btn-probador-agendar');
    const probador = crearProbador({
        raiz: modalProbador,
        origen: 'catalogo',
        alElegir: (modelo) => {
            document.getElementById('probador-titulo').textContent = `Probador AR: ${modelo.nombre}`;
            enlaceAgendar.href = `agenda.html?armazones=${encodeURIComponent(modelo.nombre)}`;
        }
    });

    async function abrirProbador(modelo) {
        // Primero el aviso de cámara; si la persona no acepta, el probador ni siquiera se abre
        if (!(await pedirPermisoCamara())) return;
        cerrarModal(modalDetalles);
        probador.restablecerAjustes();
        abrirModal(modalProbador);
        probador.elegir(modelo.id);
    }
    modalProbador.addEventListener('zigo:cerrado', probador.detener);

    [modalDetalles, modalProbador].forEach(capa => capa.addEventListener('click', (e) => {
        if (e.target === capa || e.target.closest('[data-cerrar-modal]')) cerrarModal(capa);
    }));

    rejilla.addEventListener('click', (e) => {
        const modelo = buscarArmazon(e.target.closest('.armazon-card')?.dataset.modelo);
        if (!modelo) return;
        if (e.target.closest('.btn-detalles')) abrirDetalles(modelo);
        else if (e.target.closest('.btn-probar-ar')) abrirProbador(modelo);
    });
    document.getElementById('btn-detalle-probar').addEventListener('click', () => {
        if (modeloEnDetalle) abrirProbador(modeloEnDetalle);
    });

    // Selección de armazones para la cita
    const panel = document.querySelector('.panel-seleccion');
    const contador = document.getElementById('contador-seleccionados');
    const seleccionados = () => [...rejilla.querySelectorAll('.casilla-armazon input:checked')].map(c => c.value);
    const actualizarPanel = () => {
        contador.textContent = seleccionados().length;
        panel.classList.toggle('activo', seleccionados().length > 0);
    };
    rejilla.addEventListener('change', actualizarPanel);
    window.addEventListener('pageshow', actualizarPanel);
    document.getElementById('btn-agendar-seleccionados').addEventListener('click', () => {
        ZigoAnalitica.enviar('conversion_agenda', 'Cita con selección de armazones');
        window.location.href = `agenda.html?armazones=${encodeURIComponent(seleccionados().join(', '))}`;
    });
    actualizarPanel();

    // Enlace directo al probador de un modelo: armazones.html?probar=zigo-focus
    const pedido = buscarArmazon(new URLSearchParams(window.location.search).get('probar'));
    if (pedido) abrirDetalles(pedido);
}

/*============================================================
    11. PÁGINA: pages/probador.html
    Estima la forma del rostro, dice qué formas de armazón le
    favorecen y deja probar la recomendación principal, dos
    alternativas y cualquier modelo del catálogo.
============================================================*/

// Qué formas de armazón equilibran cada forma de rostro, de la más a la menos recomendada
const GUIA_ROSTROS = {
    Ovalado: {
        formas: ['Rectangular', 'Geométrico', 'Cuadrado', 'Aviador'],
        texto: 'Tus proporciones son equilibradas, así que casi cualquier armazón te queda. Los rectangulares y geométricos conservan esa armonía y le dan carácter a tu mirada.'
    },
    Redondo: {
        formas: ['Rectangular', 'Cuadrado', 'Geométrico'],
        texto: 'Tu rostro tiene líneas suaves y casi el mismo ancho que largo. Los armazones rectangulares y cuadrados aportan ángulos que lo estilizan y lo alargan visualmente.'
    },
    Cuadrado: {
        formas: ['Redondeado', 'Ovalado', 'Aviador'],
        texto: 'Tienes la mandíbula marcada y la frente amplia. Los armazones redondeados y ovalados suavizan los ángulos y equilibran tus facciones.'
    },
    Alargado: {
        formas: ['Redondeado', 'Ovalado', 'Aviador', 'Cuadrado'],
        texto: 'Tu rostro es más largo que ancho. Los armazones redondeados, ovalados o de mica alta acortan visualmente el rostro y le dan balance.'
    },
    'Corazón': {
        formas: ['Aviador', 'Minimalista', 'Ovalado', 'Redondeado'],
        texto: 'Tu frente es más ancha que tu mandíbula. Los armazones ligeros, tipo aviador o de líneas mínimas equilibran la parte superior con el mentón.'
    },
    Diamante: {
        formas: ['Ovalado', 'Geométrico', 'Redondeado'],
        texto: 'Tus pómulos son la parte más ancha del rostro. Los armazones ovalados y geométricos los enmarcan y suavizan el contorno.'
    }
};

const PLURALES_FORMA = { Rectangular: 'rectangulares', 'Geométrico': 'geométricos', Cuadrado: 'cuadrados', Aviador: 'tipo aviador', Redondeado: 'redondos', Ovalado: 'ovalados', Minimalista: 'minimalistas' };

/** Decide la forma del rostro a partir del promedio de varias mediciones. */
function clasificarRostro(muestras) {
    const promedio = (campo) => muestras.reduce((suma, m) => suma + m[campo], 0) / muestras.length;
    const largo = promedio('largoAncho');
    const frenteMandibula = promedio('frenteMandibula');
    const pomuloMandibula = promedio('pomuloMandibula');

    if (largo > 1.48) return 'Alargado';
    if (largo < 1.24 && pomuloMandibula > 1.12) return 'Redondo';
    if (frenteMandibula > 1.16) return 'Corazón';
    if (pomuloMandibula > 1.24 && frenteMandibula < 1.02) return 'Diamante';
    if (pomuloMandibula < 1.07 && largo <= 1.36) return 'Cuadrado';
    return 'Ovalado';
}

/** Ordena el catálogo para un tipo de rostro: primero los modelos pensados para él y con la forma más favorecedora. */
function recomendarArmazones(tipoRostro) {
    const formas = GUIA_ROSTROS[tipoRostro].formas;
    const puntos = (m) => (m.rostros.includes(tipoRostro) ? 10 : 0) + (formas.includes(m.forma) ? formas.length - formas.indexOf(m.forma) : 0);
    return [...CATALOGO_ARMAZONES].sort((a, b) => puntos(b) - puntos(a)).slice(0, 3);
}

function inicializarRecomendador() {
    const seccion = document.querySelector('.probador-card');
    if (!seccion) return;

    const botonAnalizar = document.getElementById('btn-analizar');
    const resultado = document.getElementById('resultado-ia');
    const enlaceAgendar = document.getElementById('btn-agendar-recomendacion');
    const probador = crearProbador({
        raiz: seccion,
        origen: 'recomendacion',
        alElegir: (modelo) => { enlaceAgendar.href = `agenda.html?armazones=${encodeURIComponent(modelo.nombre)}`; }
    });
    const visor = probador.visor;
    const esperar = (ms) => new Promise(resolver => setTimeout(resolver, ms));

    /** Toma varias mediciones del rostro: una sola si es foto, durante segundo y medio si es la cámara. */
    async function tomarMuestras() {
        if (visor.modo === 'foto') return [visor.medirRostro()].filter(Boolean);
        const muestras = [];
        const limite = Date.now() + 7000;
        // Espera a que el seguimiento facial esté listo y luego mide durante 1.5 s
        while (Date.now() < limite && !visor.marcas) await esperar(150);
        const fin = Date.now() + 1500;
        while (Date.now() < fin && visor.modo === 'camara') {
            const medida = visor.medirRostro();
            if (medida) muestras.push(medida);
            await esperar(110);
        }
        return muestras;
    }

    botonAnalizar.addEventListener('click', async () => {
        probador.avisar('');
        if (visor.modo === 'apagado' && !(await probador.encenderCamara())) return;

        const textoBoton = botonAnalizar.innerHTML;
        botonAnalizar.disabled = true;
        botonAnalizar.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Midiendo proporciones…';
        const muestras = await tomarMuestras();
        botonAnalizar.disabled = false;
        botonAnalizar.innerHTML = textoBoton;

        if (muestras.length < (visor.modo === 'foto' ? 1 : 3)) {
            resultado.classList.add('oculto');
            probador.avisar('No pudimos medir tu rostro. Mira de frente a la cámara, con buena luz y sin inclinar la cabeza, o sube una foto de frente.');
            return;
        }

        const tipo = clasificarRostro(muestras);
        const guia = GUIA_ROSTROS[tipo];
        const recomendados = recomendarArmazones(tipo);
        ZigoAnalitica.enviar('diagnostico_rostro_ia', tipo);

        document.getElementById('ia-tipo-rostro').textContent = tipo;
        document.getElementById('ia-formas').textContent = `Te favorecen los armazones ${guia.formas.slice(0, 3).map(f => PLURALES_FORMA[f]).join(', ').replace(/, ([^,]*)$/, ' y $1')}.`;
        document.getElementById('ia-explicacion').textContent = guia.texto;
        probador.pintarModelos(document.getElementById('recomendados'), recomendados, {
            [recomendados[0].id]: { texto: 'El ideal' },
            [recomendados[1].id]: { texto: 'Opción 2', secundaria: true },
            [recomendados[2].id]: { texto: 'Opción 3', secundaria: true }
        });
        resultado.classList.remove('oculto');
        botonAnalizar.innerHTML = '<i class="fas fa-magic" aria-hidden="true"></i> Volver a analizar mi rostro';
        probador.elegir(recomendados[0].id);
    });
}

/*============================================================
    12. PÁGINA: pages/agenda.html
    Modalidad de la cita (consultorio o domicilio), mapa para fijar
    el domicilio y calendario de Zoho Bookings con esos datos ya
    escritos en las notas de la cita.
============================================================*/
function inicializarAgenda() {
    const calendario = document.getElementById('inline-container');
    if (!calendario) return;

    const armazones = (new URLSearchParams(window.location.search).get('armazones') || '').slice(0, 200);
    const resumen = document.getElementById('resumen-cita');
    const controlesMapa = document.querySelector('.controles-mapa');
    const tarjetaConsultorio = document.getElementById('tarjeta-consultorio');
    const tituloUbicacion = document.getElementById('titulo-ubicacion');
    const textoUbicacion = document.getElementById('texto-ubicacion');
    const campoDireccion = document.getElementById('input-direccion');

    let modalidad = document.querySelector('input[name="modalidad-cita"]:checked').value;
    let direccion = '';
    let enlaceMapa = '';
    let mapa = null;
    let marcador = null;
    const esDomicilio = () => modalidad.toLowerCase().includes('domicilio');

    /** Datos que viajan a las notas de la cita en Zoho. */
    function datosDeLaCita() {
        const datos = [['Modalidad', modalidad]];
        if (armazones) datos.push(['Armazones', armazones]);
        if (esDomicilio()) {
            if (direccion) datos.push(['Domicilio', direccion]);
            if (enlaceMapa) datos.push(['Mapa', enlaceMapa]);
        } else {
            datos.push(['Lugar', CONFIG_ZIGO.direccionConsultorio]);
        }
        return datos;
    }

    /** En pantallas muy angostas el calendario de Zoho se encoge para que quepa sin barra horizontal. */
    function ajustarCalendario() {
        const marco = calendario.querySelector('iframe');
        if (!marco) return;
        if (window.innerWidth < 400) {
            marco.style.width = '390px';
            marco.style.transformOrigin = 'top left';
            marco.style.transform = `scale(${Math.max(0.76, (window.innerWidth - 20) / 390)})`;
        } else {
            marco.style.width = '100%';
            marco.style.transform = 'none';
        }
    }

    function cargarCalendario() {
        if (typeof Bookings === 'undefined') {
            calendario.innerHTML = `<p class="alerta-aviso">No se pudo cargar el calendario. <a href="${urlWhatsApp('Hola Dra. Escarlet, quiero agendar un examen de la vista.')}" target="_blank" rel="noopener noreferrer"><strong>Agenda por WhatsApp</strong></a>.</p>`;
            return;
        }
        const notas = encodeURIComponent(datosDeLaCita().map(([campo, valor]) => `${campo}: ${valor}`).join(' | '));
        calendario.innerHTML = '';
        Bookings.inlineEmbed({
            url: `https://zigo1.zohobookings.com/portal-embed#/5013970000000035045?Notas%20o%20armazones%20de%20inter%C3%A9s=${notas}&Notas=${notas}&armazones=${encodeURIComponent(armazones || 'Por definir en consulta')}`,
            parent: '#inline-container',
            height: '780px'
        });
        setTimeout(ajustarCalendario, 700);
    }

    function actualizar() {
        tituloUbicacion.textContent = esDomicilio() ? '2. Tu ubicación para la visita a domicilio' : '2. Ubicación del consultorio';
        tarjetaConsultorio.classList.toggle('oculto', esDomicilio());
        controlesMapa.classList.toggle('oculto', !esDomicilio());
        if (esDomicilio()) iniciarMapa();

        resumen.innerHTML = datosDeLaCita().map(([campo, valor]) => campo === 'Mapa'
            ? `<div><strong>Mapa:</strong> <a href="${escaparHTML(valor)}" target="_blank" rel="noopener noreferrer">Abrir ubicación exacta</a></div>`
            : `<div><strong>${campo}:</strong> ${escaparHTML(valor)}</div>`).join('');
        cargarCalendario();
    }

    /** Fija el punto elegido, busca su dirección y actualiza la cita. */
    async function fijarPunto(lat, lng, origen) {
        if (marcador) mapa.removeLayer(marcador);
        marcador = L.marker([lat, lng], { draggable: true }).addTo(mapa);
        marcador.on('dragend', () => {
            const p = marcador.getLatLng();
            fijarPunto(p.lat, p.lng, 'pin ajustado');
        });
        mapa.setView([lat, lng], 16);
        enlaceMapa = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
        direccion = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
            const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const lugar = await respuesta.json();
            if (lugar && lugar.display_name) direccion = lugar.display_name.split(',').slice(0, 3).join(',');
        } catch (e) {}
        campoDireccion.value = direccion;
        textoUbicacion.innerHTML = `<i class="fas fa-check-circle icono-exito" aria-hidden="true"></i> Ubicación lista (${escaparHTML(origen)}): <strong>${escaparHTML(direccion)}</strong>. Puedes arrastrar el pin para afinarla.`;
        actualizar();
    }

    // El mapa se crea hasta que alguien elige "A domicilio"
    function iniciarMapa() {
        if (mapa) return setTimeout(() => mapa.invalidateSize(), 200);
        if (typeof L === 'undefined') {
            textoUbicacion.textContent = 'No se pudo cargar el mapa. Escribe tu dirección en las notas de la cita.';
            return;
        }
        mapa = L.map('mapa-agenda').setView([19.4326, -99.1332], 12);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &copy; OpenStreetMap', maxZoom: 19
        }).addTo(mapa);
        mapa.on('click', (e) => fijarPunto(e.latlng.lat, e.latlng.lng, 'pin en el mapa'));
    }

    // GPS del dispositivo: se queda con la lectura más precisa de los primeros segundos
    const botonGps = document.getElementById('btn-mi-ubicacion');
    botonGps.addEventListener('click', () => {
        if (!navigator.geolocation) {
            textoUbicacion.textContent = 'Tu dispositivo no ofrece ubicación. Escribe tu calle y colonia o toca tu casa en el mapa.';
            return;
        }
        const textoBoton = botonGps.innerHTML;
        botonGps.disabled = true;
        botonGps.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Buscando tu ubicación…';
        let mejor = null;
        let terminado = false;
        const terminar = () => {
            if (terminado) return;
            terminado = true;
            navigator.geolocation.clearWatch(vigia);
            botonGps.disabled = false;
            botonGps.innerHTML = textoBoton;
            if (mejor) fijarPunto(mejor.coords.latitude, mejor.coords.longitude, `GPS ±${Math.round(mejor.coords.accuracy)} m`);
            else textoUbicacion.textContent = 'No pudimos obtener tu ubicación. Escribe tu calle y colonia o toca tu casa en el mapa.';
        };
        const vigia = navigator.geolocation.watchPosition(
            (posicion) => {
                if (!mejor || posicion.coords.accuracy < mejor.coords.accuracy) mejor = posicion;
                if (posicion.coords.accuracy <= 60) terminar();
            },
            terminar,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        setTimeout(terminar, 4000);
    });

    async function buscarDireccion() {
        const consulta = campoDireccion.value.trim();
        if (!consulta || !mapa) return;
        try {
            const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${consulta}, Ciudad de México`)}`);
            const lugares = await respuesta.json();
            if (lugares && lugares[0]) return fijarPunto(parseFloat(lugares[0].lat), parseFloat(lugares[0].lon), 'dirección escrita');
        } catch (e) {}
        textoUbicacion.textContent = 'No encontramos esa dirección. Escribe tu colonia o toca tu calle directamente en el mapa.';
    }
    document.getElementById('btn-buscar-direccion').addEventListener('click', buscarDireccion);
    campoDireccion.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarDireccion();
        }
    });

    document.querySelectorAll('input[name="modalidad-cita"]').forEach(radio => radio.addEventListener('change', () => {
        modalidad = radio.value;
        ZigoAnalitica.enviar('modalidad_cita', modalidad);
        actualizar();
    }));

    window.addEventListener('resize', ajustarCalendario);
    actualizar();
}

/*============================================================
    13. PÁGINA: pages/admin.html
    El panel no contiene datos: los pide al backend, que solo los
    entrega a los correos autorizados después de validar un token
    enviado a su buzón. Descargar y borrar piden un token nuevo.
============================================================*/
function inicializarPanelAdmin() {
    const acceso = document.getElementById('admin-acceso');
    if (!acceso) return;

    const panel = document.getElementById('admin-panel');
    const CLAVE_SESION = 'zigo_admin_sesion';
    const ERROR_RED = 'No se pudo conectar con el servidor de estadísticas. Revisa tu conexión.';
    let sesion = null;
    let dias = 30;
    let datos = null;
    let serie = 'sesiones';

    const numero = (n) => Number(n || 0).toLocaleString('es-MX');
    const duracion = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s || 0} s`);
    const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

    async function pedir(accion, extra = {}) {
        let respuesta;
        try {
            respuesta = await ZigoAnalitica.llamar(accion, { sesion: sesion ? sesion.id : '', ...extra });
        } catch (e) {
            return { ok: false, error: ERROR_RED };
        }
        if (respuesta && respuesta.sesionExpirada) cerrarSesion('Tu sesión expiró. Vuelve a entrar.');
        return respuesta || { ok: false, error: ERROR_RED };
    }

    /*------------------------------------------------------------
        Acceso: correo autorizado + token de 6 dígitos
    ------------------------------------------------------------*/
    const formulario = document.getElementById('form-acceso');
    const campoCorreo = document.getElementById('acceso-correo');
    const pasoToken = document.getElementById('paso-token');
    const campoToken = document.getElementById('acceso-token');
    const botonAcceso = document.getElementById('btn-acceso');
    const mensajeAcceso = document.getElementById('acceso-mensaje');

    function mostrarAcceso(texto = '', esError = false) {
        panel.classList.add('oculto');
        acceso.classList.remove('oculto');
        pasoToken.classList.add('oculto');
        campoCorreo.disabled = false;
        campoToken.value = '';
        botonAcceso.textContent = 'Enviar token a mi correo';
        mensajeAcceso.textContent = texto;
        mensajeAcceso.classList.toggle('error', esError);
    }

    function cerrarSesion(texto = '') {
        if (sesion) ZigoAnalitica.llamar('cerrar_sesion', { sesion: sesion.id }).catch(() => {});
        sesion = null;
        datos = null;
        Almacen.quitar(CLAVE_SESION, true);
        mostrarAcceso(texto, Boolean(texto));
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correo = campoCorreo.value.trim().toLowerCase();
        const pidiendoToken = pasoToken.classList.contains('oculto');
        botonAcceso.disabled = true;
        mensajeAcceso.classList.remove('error');
        mensajeAcceso.textContent = pidiendoToken ? 'Enviando token…' : 'Verificando…';

        let respuesta;
        try {
            respuesta = pidiendoToken
                ? await ZigoAnalitica.llamar('solicitar_token', { correo, motivo: 'acceso' })
                : await ZigoAnalitica.llamar('verificar_token', { correo, token: campoToken.value.trim() });
        } catch (err) {
            respuesta = { ok: false, error: ERROR_RED };
        }
        botonAcceso.disabled = false;

        if (!respuesta.ok) {
            mensajeAcceso.textContent = respuesta.error || 'No se pudo completar la solicitud.';
            mensajeAcceso.classList.add('error');
            return;
        }
        if (pidiendoToken) {
            // El mensaje es el mismo exista o no el correo: así no se revela quién tiene acceso
            pasoToken.classList.remove('oculto');
            campoCorreo.disabled = true;
            botonAcceso.textContent = 'Entrar al panel';
            mensajeAcceso.textContent = 'Si el correo está autorizado, llegará un token de 6 dígitos en unos segundos. Revisa también la carpeta de spam.';
            campoToken.focus();
            return;
        }
        sesion = { id: respuesta.sesion, rol: respuesta.rol, nombre: respuesta.nombre };
        Almacen.guardar(CLAVE_SESION, JSON.stringify(sesion), true);
        mostrarPanel();
    });

    document.getElementById('btn-otro-correo').addEventListener('click', () => mostrarAcceso());

    /*------------------------------------------------------------
        Token de confirmación para descargar y borrar
    ------------------------------------------------------------*/

    /** Envía un token al correo de la sesión y pide escribirlo. Devuelve el token o null si se cancela. */
    async function confirmarConToken(motivo, titulo, advertencia) {
        const envio = await pedir('solicitar_token', { motivo });
        if (!envio.ok) {
            if (sesion) alert(envio.error || 'No se pudo enviar el token.');
            return null;
        }
        const capa = crearModal('modal-token');
        capa.querySelector('.modal-content').innerHTML = `
            ${BOTON_CERRAR_MODAL}
            <h3><i class="fas fa-shield-alt icono-acento" aria-hidden="true"></i> ${escaparHTML(titulo)}</h3>
            <p class="modal-nota">${escaparHTML(advertencia)} Enviamos un token de 6 dígitos a tu correo; vence en 10 minutos.</p>
            <form class="form-vertical">
                <input type="text" class="input-neon campo-token" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" aria-label="Token de 6 dígitos" placeholder="••••••" autofocus>
                <div class="acciones-modal">
                    <button type="button" class="btn-contorno" data-cerrar-modal>Cancelar</button>
                    <button type="submit" class="boton-agenda">Confirmar</button>
                </div>
            </form>`;
        return new Promise((resolver) => {
            const alCerrar = () => resolver(null);
            capa.addEventListener('zigo:cerrado', alCerrar, { once: true });
            capa.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                capa.removeEventListener('zigo:cerrado', alCerrar);
                const token = capa.querySelector('input').value.trim();
                cerrarModal(capa);
                resolver(token);
            });
            abrirModal(capa);
        });
    }

    /** Convierte filas en CSV. Los textos que Excel tomaría por fórmulas se neutralizan con un apóstrofo. */
    function aCSV(filas) {
        return filas.map(fila => fila.map(celda => {
            let texto = String(celda ?? '');
            if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
            return `"${texto.replace(/"/g, '""')}"`;
        }).join(',')).join('\r\n');
    }

    function descargarCSV(nombre, filas) {
        const url = URL.createObjectURL(new Blob(['﻿' + aCSV(filas)], { type: 'text/csv;charset=utf-8;' }));
        descargarArchivo(nombre, url);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    document.getElementById('btn-exportar').addEventListener('click', async () => {
        const token = await confirmarConToken('exportar', 'Descargar estadísticas', 'Se descargarán todos los eventos y comentarios en archivos CSV.');
        if (!token) return;
        const respuesta = await pedir('exportar', { token });
        if (!respuesta.ok) return alert(respuesta.error || 'No se pudo descargar.');
        const fecha = new Date().toISOString().slice(0, 10);
        descargarCSV(`zigo-eventos-${fecha}.csv`, respuesta.eventos);
        setTimeout(() => descargarCSV(`zigo-comentarios-${fecha}.csv`, respuesta.comentarios), 700);
    });

    document.getElementById('btn-borrar').addEventListener('click', async () => {
        if (!confirm('Vas a reiniciar TODAS las estadísticas y comentarios. ¿Continuar?')) return;
        const token = await confirmarConToken('borrar', 'Borrar estadísticas', 'Esta acción reinicia todos los contadores.');
        if (!token) return;
        const respuesta = await pedir('borrar', { token });
        if (!respuesta.ok) return alert(respuesta.error || 'No se pudo borrar.');
        alert('Estadísticas reiniciadas. Quedó un respaldo oculto dentro de la hoja de cálculo.');
        cargar();
    });

    /*------------------------------------------------------------
        Dibujo del panel
    ------------------------------------------------------------*/
    const vacio = '<p class="admin-vacio">Aún no hay datos en este periodo.</p>';

    /** Lista de barras horizontales a partir de un objeto { etiqueta: cantidad }. */
    function barras(mapa, { limite = 8, total = 0, unidad = '', ordenar = true, formato = numero } = {}) {
        let filas = Object.entries(mapa || {}).filter(([, valor]) => Number(valor) > 0);
        if (ordenar) filas.sort((a, b) => b[1] - a[1]);
        filas = filas.slice(0, limite);
        if (!filas.length) return vacio;
        const maximo = Math.max(...filas.map(([, valor]) => Number(valor)));
        return filas.map(([etiqueta, valor]) => `
            <div class="fila-barra" title="${escaparHTML(etiqueta)}: ${formato(valor)}${unidad}">
                <div class="fila-barra-cabecera"><span>${escaparHTML(etiqueta)}</span><span>${formato(valor)}${unidad}${total ? ` · ${porcentaje(valor, total)}%` : ''}</span></div>
                <div class="barra-fondo"><div class="barra-relleno" style="width:${Math.max(1, Math.round((valor / maximo) * 100))}%"></div></div>
            </div>`).join('');
    }

    const poner = (id, html) => { document.getElementById(id).innerHTML = html; };

    function pintarResumen() {
        const r = datos.resumen;
        const tarjetas = [
            ['Visitas totales', numero(r.sesiones), 'Suma de todas las fuentes de tráfico', true],
            ['Visitantes únicos', numero(r.visitantes), `${porcentaje(r.nuevos, r.sesiones)}% de las visitas son de gente nueva`],
            ['Páginas vistas', numero(r.paginasVistas), `${r.sesiones ? (r.paginasVistas / r.sesiones).toFixed(1) : '0'} páginas por visita`],
            ['Tiempo por página', duracion(r.duracionMedia), 'Promedio de permanencia'],
            ['Contactos y citas', numero(r.conversiones), 'WhatsApp, llamadas, agenda y buzón'],
            ['Pruebas de armazón', numero(r.pruebasAR), `${numero(r.diagnosticos)} análisis de rostro`],
            ['Satisfacción', datos.satisfaccion.total ? `${Number(datos.satisfaccion.promedio)} / 5` : 'Sin datos', `${numero(datos.satisfaccion.total)} valoraciones`]
        ];
        poner('admin-kpis', tarjetas.map(([etiqueta, valor, nota, principal]) => `
            <div class="admin-tarjeta ${principal ? 'kpi-principal' : ''}">
                <p class="kpi-etiqueta">${etiqueta}</p><p class="kpi-numero">${valor}</p><p class="kpi-nota">${nota}</p>
            </div>`).join(''));
    }

    /** Origen de las visitas, con el desglose de cada grupo y la suma total al final. */
    function pintarFuentes() {
        const total = datos.resumen.sesiones;
        const grupos = [
            ['Directo', 'Tecleó zigomx.com, lo tenía guardado o abrió un enlace sin origen', null],
            ['Buscadores', 'Google, Bing y otros buscadores', datos.buscadores],
            ['Redes sociales', 'Facebook, Instagram, TikTok, WhatsApp…', datos.redes],
            ['Otros sitios', 'Enlaces desde otras páginas', datos.sitios],
            ['Campañas', 'Anuncios y enlaces con utm_source', datos.campanas]
        ];
        const maximo = Math.max(1, ...grupos.map(([nombre]) => datos.fuentes[nombre] || 0));
        const html = grupos.map(([nombre, nota, detalle]) => {
            const valor = datos.fuentes[nombre] || 0;
            return `
                <div class="fila-barra" title="${nota}">
                    <div class="fila-barra-cabecera"><span><strong>${nombre}</strong></span><span>${numero(valor)} · ${porcentaje(valor, total)}%</span></div>
                    <div class="barra-fondo"><div class="barra-relleno" style="width:${Math.round((valor / maximo) * 100)}%"></div></div>
                </div>
                ${detalle && Object.keys(detalle).length ? `<div class="subgrupo-barras">${barras(detalle, { limite: 6 })}</div>` : ''}`;
        }).join('');
        poner('lista-fuentes', `${html}<div class="fila-total"><span>Total de visitas</span><span>${numero(total)}</span></div>`);
    }

    /** Gráfica de línea de visitas o páginas vistas por día, con lectura al pasar el puntero. */
    function pintarTendencia() {
        const caja = document.getElementById('grafica-tendencia');
        const fechas = Object.keys(datos.porDia).sort();
        if (!fechas.length) {
            caja.innerHTML = vacio;
            return;
        }
        // Se rellenan con cero los días sin visitas para que la línea no los salte
        const puntos = [];
        const fin = new Date(`${fechas[fechas.length - 1]}T00:00:00Z`);
        for (let dia = new Date(`${fechas[0]}T00:00:00Z`); dia <= fin; dia.setUTCDate(dia.getUTCDate() + 1)) {
            const clave = dia.toISOString().slice(0, 10);
            puntos.push({ clave, valor: (datos.porDia[clave] || {})[serie] || 0 });
        }

        const W = Math.max(280, caja.clientWidth);
        const H = 210;
        const margen = { izq: 36, der: 12, arriba: 12, abajo: 26 };
        const maximo = Math.max(1, ...puntos.map(p => p.valor));
        const x = (i) => margen.izq + (puntos.length === 1 ? (W - margen.izq - margen.der) / 2 : (i / (puntos.length - 1)) * (W - margen.izq - margen.der));
        const y = (v) => margen.arriba + (1 - v / maximo) * (H - margen.arriba - margen.abajo);
        const fechaCorta = (clave) => new Date(`${clave}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
        const base = H - margen.abajo;
        const nombreSerie = serie === 'sesiones' ? 'visitas' : 'páginas vistas';

        caja.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${nombreSerie} por día, de ${fechaCorta(puntos[0].clave)} a ${fechaCorta(puntos[puntos.length - 1].clave)}">
                <line class="grafica-eje" x1="${margen.izq}" y1="${y(maximo)}" x2="${W - margen.der}" y2="${y(maximo)}" stroke-dasharray="2 4"/>
                <line class="grafica-eje" x1="${margen.izq}" y1="${base}" x2="${W - margen.der}" y2="${base}"/>
                <text class="grafica-texto" x="${margen.izq - 6}" y="${y(maximo) + 4}" text-anchor="end">${numero(maximo)}</text>
                <text class="grafica-texto" x="${margen.izq - 6}" y="${base + 4}" text-anchor="end">0</text>
                <text class="grafica-texto" x="${margen.izq}" y="${H - 6}">${fechaCorta(puntos[0].clave)}</text>
                <text class="grafica-texto" x="${W - margen.der}" y="${H - 6}" text-anchor="end">${fechaCorta(puntos[puntos.length - 1].clave)}</text>
                <path class="grafica-area" d="${linea} L${x(puntos.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z"/>
                <path class="grafica-linea" d="${linea}"/>
                ${puntos.length === 1 ? `<circle class="grafica-punto" cx="${x(0)}" cy="${y(puntos[0].valor)}" r="5"/>` : ''}
                <g class="oculto" data-cursor><line class="grafica-cursor" y1="${margen.arriba}" y2="${base}"/><circle class="grafica-punto" r="5"/></g>
            </svg>
            <div class="grafica-tooltip oculto"></div>`;

        const svg = caja.querySelector('svg');
        const cursor = caja.querySelector('[data-cursor]');
        const etiqueta = caja.querySelector('.grafica-tooltip');
        svg.addEventListener('pointermove', (e) => {
            const marco = svg.getBoundingClientRect();
            const px = ((e.clientX - marco.left) / marco.width) * W;
            const i = Math.max(0, Math.min(puntos.length - 1, Math.round(((px - margen.izq) / (W - margen.izq - margen.der)) * (puntos.length - 1))));
            cursor.classList.remove('oculto');
            cursor.querySelector('line').setAttribute('x1', x(i));
            cursor.querySelector('line').setAttribute('x2', x(i));
            cursor.querySelector('circle').setAttribute('cx', x(i));
            cursor.querySelector('circle').setAttribute('cy', y(puntos[i].valor));
            etiqueta.classList.remove('oculto');
            etiqueta.textContent = `${fechaCorta(puntos[i].clave)}: ${numero(puntos[i].valor)} ${nombreSerie}`;
            etiqueta.style.left = `${Math.max(70, Math.min(marco.width - 70, (x(i) / W) * marco.width))}px`;
            etiqueta.style.top = `${(y(puntos[i].valor) / H) * marco.height}px`;
        });
        svg.addEventListener('pointerleave', () => {
            cursor.classList.add('oculto');
            etiqueta.classList.add('oculto');
        });
    }

    function pintarHorarios() {
        const maximo = Math.max(1, ...datos.porHora);
        poner('grafica-horas', `
            <div class="columnas-hora" role="img" aria-label="Visitas por hora del día">
                ${datos.porHora.map((valor, hora) => `<div class="columna-hora" style="height:${Math.max(2, (valor / maximo) * 100)}%" title="${hora}:00 h: ${numero(valor)} visitas"></div>`).join('')}
            </div>
            <div class="etiquetas-hora"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>`);
        const nombresDia = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        poner('lista-dias-semana', barras(Object.fromEntries(datos.porDiaSemana.map((valor, i) => [nombresDia[i], valor])), { ordenar: false, limite: 7 }));
    }

    function pintarComentarios() {
        const caritas = ['😡 Muy mala', '😕 Mala', '😐 Regular', '🙂 Buena', '🤩 Excelente'];
        poner('lista-satisfaccion', datos.satisfaccion.total
            ? barras(Object.fromEntries([4, 3, 2, 1, 0].map(i => [caritas[i], datos.satisfaccion.distribucion[i]]).filter(([, v]) => v > 0)), { ordenar: false, total: datos.satisfaccion.total })
            : vacio);

        const tarjeta = (c) => {
            const clase = c.calificacion >= 4 ? 'positiva' : c.calificacion <= 2 ? 'negativa' : 'neutra';
            return `
                <div class="comentario">
                    <span class="etiqueta-comentario ${clase}">${'★'.repeat(c.calificacion)} ${escaparHTML(c.categoria)}</span>
                    <p>${c.mensaje ? escaparHTML(c.mensaje) : '<em>Sin comentario escrito</em>'}</p>
                    <small>${escaparHTML(c.nombre)} · ${new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} · ${escaparHTML(c.pagina)}${c.folio ? ` · ${escaparHTML(c.folio)}` : ''}</small>
                </div>`;
        };
        const esQueja = (c) => c.calificacion <= 2 || /queja/i.test(c.categoria);
        const quejas = datos.comentarios.filter(esQueja);
        const resto = datos.comentarios.filter(c => !esQueja(c) && (c.mensaje || c.categoria !== 'Encuesta'));
        poner('lista-quejas', quejas.length ? quejas.map(tarjeta).join('') : '<p class="admin-vacio">Sin quejas en este periodo.</p>');
        poner('lista-felicitaciones', resto.length ? resto.map(tarjeta).join('') : vacio);
    }

    function pintarPanel() {
        const total = datos.resumen.sesiones;
        const nombresConversion = { whatsapp: 'WhatsApp', telegram: 'Telegram', llamada: 'Llamada telefónica', agenda: 'Clic en Agendar cita', buzonQuejas: 'Mensaje al buzón', capturasAR: 'Foto guardada del probador', redSocial: 'Clic a redes sociales' };

        pintarResumen();
        pintarFuentes();
        pintarTendencia();
        pintarHorarios();
        pintarComentarios();
        poner('lista-paises', barras(datos.paises, { total }));
        poner('lista-regiones', barras(datos.regiones, { total }));
        poner('lista-ciudades', barras(datos.ciudades, { total }));
        poner('lista-paginas', barras(datos.paginas, { limite: 10 }));
        poner('lista-tiempos', barras(datos.tiempoPagina, { limite: 10, formato: duracion }));
        poner('lista-dispositivos', barras(datos.dispositivos, { total }));
        poner('lista-navegadores', barras(datos.navegadores, { total }));
        poner('lista-sistemas', barras(datos.sistemas, { total }));
        poner('lista-armazones', barras(datos.armazones, { limite: 9, unidad: ' pruebas' }));
        poner('lista-rostros', barras(datos.rostros));
        poner('lista-conversiones', barras(Object.fromEntries(Object.entries(datos.conversiones).map(([clave, valor]) => [nombresConversion[clave] || clave, valor]))));
        poner('lista-modalidades', barras(datos.modalidades));
        poner('lista-busquedas', barras(datos.busquedas, { limite: 10 }));
        poner('lista-busquedas-vacias', barras(datos.busquedasSinResultado, { limite: 10 }));
        document.getElementById('admin-actualizado').textContent = `Actualizado: ${new Date(datos.generado).toLocaleString('es-MX')}`;
    }

    async function cargar() {
        document.getElementById('admin-actualizado').textContent = 'Cargando…';
        const respuesta = await pedir('estadisticas', { dias });
        if (!respuesta.ok) {
            if (sesion) document.getElementById('admin-actualizado').textContent = respuesta.error || ERROR_RED;
            return;
        }
        datos = respuesta;
        pintarPanel();
    }

    function mostrarPanel() {
        acceso.classList.add('oculto');
        panel.classList.remove('oculto');
        document.getElementById('admin-saludo').textContent = `Hola, ${sesion.nombre}. ${sesion.rol === 'admin' ? 'Tienes permisos de administrador.' : 'Puedes consultar y descargar.'}`;
        document.getElementById('btn-borrar').classList.toggle('oculto', sesion.rol !== 'admin');
        cargar();
    }

    document.querySelector('.admin-filtros').addEventListener('click', (e) => {
        const boton = e.target.closest('[data-dias]');
        if (!boton) return;
        dias = Number(boton.dataset.dias);
        document.querySelectorAll('.admin-filtros [data-dias]').forEach(b => b.classList.toggle('activo', b === boton));
        cargar();
    });
    document.getElementById('selector-serie').addEventListener('click', (e) => {
        const boton = e.target.closest('[data-serie]');
        if (!boton || !datos) return;
        serie = boton.dataset.serie;
        document.querySelectorAll('#selector-serie [data-serie]').forEach(b => b.classList.toggle('activo', b === boton));
        pintarTendencia();
    });
    document.getElementById('btn-actualizar').addEventListener('click', cargar);
    document.getElementById('btn-salir').addEventListener('click', () => cerrarSesion());
    window.addEventListener('resize', () => { if (datos) pintarTendencia(); });

    // Si la pestaña ya tenía una sesión abierta se intenta reutilizar; el backend decide si sigue vigente
    try { sesion = JSON.parse(Almacen.leer(CLAVE_SESION, true)); } catch (e) { sesion = null; }
    if (sesion && sesion.id) mostrarPanel();
    else mostrarAcceso();
}

/*============================================================
    14. ARRANQUE
============================================================*/
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-anio]').forEach(el => { el.textContent = new Date().getFullYear(); });

    inicializarFondoEstelar();
    inicializarAccesibilidad();
    inicializarWidgetRedes();
    inicializarBuscador();
    inicializarBuzonNosotros();
    inicializarCatalogo();
    inicializarRecomendador();
    inicializarEncuesta();
    inicializarPanelAdmin();
    ZigoAnalitica.iniciar();
});

// El calendario de Zoho y el mapa dependen de scripts externos: se arman cuando todo terminó de cargar
window.addEventListener('load', inicializarAgenda);
