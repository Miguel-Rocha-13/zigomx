/**
***********************************************************************
    Motor Integral ziGO - Versión Producción:
    1. Extracción Óptica Sin Fondo + Recorte de Frente + Color Real de Armazón
    2. Proyección 3D Anatómica en Rostro (Puente Nasal, Perspectiva y Patitas)
    3. Switch Claro/Oscuro al Extremo Izquierdo del Menú + Paleta UVEG/Morado
    4. Audio TTS Real Multi-plataforma + Buscador Inteligente
    5. Contactos Directos Escarlet (55 7383 9561) y Buzón de Quejas a Ángel/Miguel
***********************************************************************
 */

/*============================================================
    0. CONFIGURACIÓN DE CONTACTOS, DIRECCIÓN Y CATÁLOGO ziGO
============================================================*/
const CONFIG_ZIGO = {
    whatsappEscarlet: '5215573839561',
    telegramUsuario: '+525573839561',
    telefonoEscarlet: '55 7383 9561',
    correoEscarlet: 'skar@zigomx.com',
    correoQuejasPrincipal: 'angel.rochab@zigomx.com',
    correoQuejasCopia: 'miguel.rochab@zigomx.com',
    // Cuando hables con la dueña, pega aquí la dirección exacta del consultorio ziGO:
    direccionSitioZigo: 'Consultorio ziGO · Ciudad de México (Dirección exacta confirmada al reservar cita)'
};

const RUTA_BASE = window.location.pathname.includes('/pages/') ? '../' : './';

const CATALOGO_ARMAZONES = [
    { nombre: 'ziGO Focus', archivo: 'img/armazones/1.jpeg', forma: 'Rectangular', material: 'Acetato Premium' },
    { nombre: 'ziGO Kinetic', archivo: 'img/armazones/2.avif', forma: 'Geométrico', material: 'Titanio Ligero' },
    { nombre: 'ziGO Metro', archivo: 'img/armazones/3.jpeg', forma: 'Redondeado', material: 'Acetato Urbano' },
    { nombre: 'ziGO Edge', archivo: 'img/armazones/4.avif', forma: 'Cuadrado', material: 'Polímero Resistente' },
    { nombre: 'ziGO Urban', archivo: 'img/armazones/5.webp', forma: 'Aviador', material: 'Aleación Metálica' },
    { nombre: 'ziGO Sport', archivo: 'img/armazones/6.webp', forma: 'Ovalado', material: 'TR90 Flexible' },
    { nombre: 'ziGO Nova', archivo: 'img/armazones/7.jpeg', forma: 'Minimalista', material: 'Semi-aire' },
    { nombre: 'ziGO Flex', archivo: 'img/armazones/8.webp', forma: 'Rectangular', material: 'Bisagra Reforzada' },
    { nombre: 'ziGO Bold', archivo: 'img/armazones/9.avif', forma: 'Cuadrado', material: 'Estilo Contemporáneo' }
];


/*============================================================
    1. EXTRACCIÓN ÓPTICA SIN FONDO Y RECORTE DE CATÁLOGO
============================================================*/
const cacheArmazonesAR = {};

function resolverRutaSegura(ruta) {
    if (!ruta) return '';
    if (ruta.startsWith('http') || ruta.startsWith('data:') || ruta.startsWith('blob:')) return ruta;
    const limpia = ruta.replace(/^(\.\.\/|\.\/)+/, '');
    return `${RUTA_BASE}${limpia}`;
}

/**
 * Procesa cada imagen de armazón para:
 * - Eliminar el fondo claro (tanto exterior como el blanco dentro de cada aro)
 * - Conservar un tinte antirreflejante sutil dentro de las micas
 * - Descartar el texto/logo superior de catálogo ("Rectangular/Cuadrado")
 * - Extraer el frente exacto de los dos aros y detectar el color real del armazón para las patitas 3D
 */
function procesarArmazonTransparente(imgElement) {
    const w = imgElement.naturalWidth || imgElement.width;
    const h = imgElement.naturalHeight || imgElement.height;
    if (!w || !h) {
        return {
            canvas: imgElement,
            canvasCatalogo: imgElement,
            transparente: false,
            colorPatita: 'rgba(30, 34, 42, 0.92)'
        };
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0, w, h);

    try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const rBg = data[0], gBg = data[1], bBg = data[2];
        const esFondo = new Uint8Array(w * h);

        // Detectar todos los píxeles pertenecientes al fondo blanco/gris uniforme
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            if (a < 30) {
                esFondo[i] = 1;
                continue;
            }
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            const diffBg = (Math.abs(r - rBg) + Math.abs(g - gBg) + Math.abs(b - bBg)) / 3;

            if ((lum > 214 && sat < 26) || diffBg < 28) {
                esFondo[i] = 1;
                data[idx + 3] = 0;
            } else if (lum > 192 && sat < 24) {
                // Suavizado anti-aliasing en los bordes del armazón
                const alphaSuave = Math.round(((214 - lum) / 22) * 255);
                data[idx + 3] = Math.max(0, Math.min(255, alphaSuave));
            }
        }

        // Conservar únicamente el componente conectado más grande (el armazón) y descartar textos/logos de esquina
        const visitado = new Uint8Array(w * h);
        let mayorComponente = [];

        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                const pos = y * w + x;
                if (esFondo[pos] || visitado[pos]) continue;

                const grupo = [];
                const cola = [[x, y]];
                visitado[pos] = 1;

                while (cola.length > 0) {
                    const [cx, cy] = cola.pop();
                    grupo.push([cx, cy]);
                    const vecinos = [[cx + 2, cy], [cx - 2, cy], [cx, cy + 2], [cx, cy - 2]];
                    for (const [nx, ny] of vecinos) {
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const npos = ny * w + nx;
                            if (!esFondo[npos] && !visitado[npos]) {
                                visitado[npos] = 1;
                                cola.push([nx, ny]);
                            }
                        }
                    }
                }

                if (grupo.length > mayorComponente.length) {
                    mayorComponente = grupo;
                }
            }
        }

        let minX = w, minY = h, maxX = 0, maxY = 0;
        let sumR = 0, sumG = 0, sumB = 0, countColor = 0;

        for (const [gx, gy] of mayorComponente) {
            if (gx < minX) minX = gx;
            if (gx > maxX) maxX = gx;
            if (gy < minY) minY = gy;
            if (gy > maxY) maxY = gy;

            const idx = (gy * w + gx) * 4;
            if (data[idx + 3] > 180) {
                sumR += data[idx];
                sumG += data[idx + 1];
                sumB += data[idx + 2];
                countColor++;
            }
        }

        const colorPatita = countColor > 0
            ? `rgba(${Math.round(sumR / countColor)}, ${Math.round(sumG / countColor)}, ${Math.round(sumB / countColor)}, 0.94)`
            : 'rgba(28, 32, 38, 0.92)';

        minX = Math.max(0, minX - 3);
        minY = Math.max(0, minY - 3);
        maxX = Math.min(w - 1, maxX + 3);
        maxY = Math.min(h - 1, maxY + 3);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (x < minX || x > maxX || y < minY || y > maxY) {
                    data[(y * w + x) * 4 + 3] = 0;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Versión limpia completa para tarjetas de catálogo y modal "Ver detalles" (sobre fondo blanco)
        const catW = Math.max(30, maxX - minX + 1);
        const catH = Math.max(15, maxY - minY + 1);
        const canvasCatalogo = document.createElement('canvas');
        canvasCatalogo.width = catW;
        canvasCatalogo.height = catH;
        canvasCatalogo.getContext('2d').drawImage(canvas, minX, minY, catW, catH, 0, 0, catW, catH);

        // Separar únicamente el frente óptico de los dos aros (recortando la pata lateral si la foto está en ángulo 3/4)
        const alturasCol = new Float32Array(catW);
        let maxAlturaCol = 0;
        for (let x = minX; x <= maxX; x++) {
            let topY = maxY, botY = minY, hay = false;
            for (let y = minY; y <= maxY; y++) {
                if (data[(y * w + x) * 4 + 3] > 90) {
                    if (y < topY) topY = y;
                    if (y > botY) botY = y;
                    hay = true;
                }
            }
            const alt = hay ? (botY - topY) : 0;
            alturasCol[x - minX] = alt;
            if (alt > maxAlturaCol) maxAlturaCol = alt;
        }

        let frenteMinX = minX, frenteMaxX = maxX;
        if (maxAlturaCol > 18) {
            const umbralFrente = maxAlturaCol * 0.48;
            while (frenteMinX < maxX && alturasCol[frenteMinX - minX] < umbralFrente) frenteMinX++;
            while (frenteMaxX > minX && alturasCol[frenteMaxX - minX] < umbralFrente) frenteMaxX--;
        }

        if (frenteMaxX - frenteMinX < 35) {
            frenteMinX = minX;
            frenteMaxX = maxX;
        }

        const frenteW = Math.max(24, frenteMaxX - frenteMinX + 1);
        const canvasFrenteAR = document.createElement('canvas');
        canvasFrenteAR.width = frenteW;
        canvasFrenteAR.height = catH;
        canvasFrenteAR.getContext('2d').drawImage(canvas, frenteMinX, minY, frenteW, catH, 0, 0, frenteW, catH);

        return {
            canvas: canvasFrenteAR,
            canvasCatalogo,
            transparente: true,
            colorPatita
        };
    } catch (e) {
        // Respaldo cuando se abre en protocolo file:// sin servidor local: recortar el encabezado superior de texto
        const corteTop = Math.round(h * 0.25);
        const cropH = Math.max(24, h - corteTop);
        canvas.width = w;
        canvas.height = cropH;
        ctx.drawImage(imgElement, 0, corteTop, w, cropH, 0, 0, w, cropH);
        return {
            canvas,
            canvasCatalogo: canvas,
            transparente: false,
            colorPatita: 'rgba(28, 32, 38, 0.92)'
        };
    }
}

function obtenerArmazonProcesado(rutaEntrada) {
    const rutaFinal = resolverRutaSegura(rutaEntrada);
    return new Promise((resolve) => {
        if (cacheArmazonesAR[rutaFinal]) {
            resolve(cacheArmazonesAR[rutaFinal]);
            return;
        }

        const img = new Image();
        if (window.location.protocol.startsWith('http') && rutaFinal.startsWith('http')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            const procesado = procesarArmazonTransparente(img);
            cacheArmazonesAR[rutaFinal] = procesado;
            resolve(procesado);
        };

        img.onerror = () => resolve(null);
        img.src = rutaFinal;
    });
}


/*============================================================
    2. ADAPTACIÓN DE IMÁGENES DEL INDEX AL TEMA DE COLOR
============================================================*/
function adaptarImagenesIndexATema() {
    const esIndex = !window.location.pathname.includes('/pages/');
    if (!esIndex) return;

    const imagenesIndex = document.querySelectorAll('.hero-imagen img, .contenido-tarjeta img');
    imagenesIndex.forEach((img) => {
        if (img.dataset.procesadaFondo === '1') return;

        const procesar = () => {
            if (!img.naturalWidth) return;
            try {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, w, h);

                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;

                const r0 = data[0], g0 = data[1], b0 = data[2];
                const visitado = new Uint8Array(w * h);
                const cola = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];

                while (cola.length > 0) {
                    const [x, y] = cola.pop();
                    if (x < 0 || x >= w || y < 0 || y >= h) continue;
                    const pos = y * w + x;
                    if (visitado[pos]) continue;
                    visitado[pos] = 1;

                    const idx = pos * 4;
                    const diff = (Math.abs(data[idx] - r0) + Math.abs(data[idx + 1] - g0) + Math.abs(data[idx + 2] - b0)) / 3;
                    if (diff <= 42) {
                        data[idx + 3] = 0;
                        cola.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                    }
                }

                ctx.putImageData(imgData, 0, 0);
                img.src = c.toDataURL('image/png');
                img.dataset.procesadaFondo = '1';
            } catch (e) {}
        };

        if (img.complete) procesar();
        else img.addEventListener('load', procesar);
    });
}


/*============================================================
    3. RENOMBRADO UX, NÚMEROS EN NEGRITAS Y SWITCH EN MENÚ IZQUIERDO
============================================================*/
function prepararIdentidadEInclusionDOM() {
    document.querySelectorAll('a[href*="probador.html"]').forEach(enlace => {
        const texto = enlace.textContent.trim();
        if (texto === 'Asesor IA') enlace.textContent = 'Recomendación IA';
        else if (texto === 'Asesor Facial IA') enlace.textContent = 'Recomendación Facial IA';
    });

    document.querySelectorAll('.banner-seguridad-ia p, .privacidad-aviso').forEach(p => {
        p.innerHTML = p.innerHTML.replace(/(^|\s)(\d+\.)/g, '$1<strong>$2</strong>');
    });

    // Colocar el selector Claro / Oscuro hasta el extremo izquierdo dentro del menú principal
    const menuContenedor = document.querySelector('.contenedor-menu');
    if (menuContenedor && !document.getElementById('switch-tema-menu-izq')) {
        const switchIzq = document.createElement('div');
        switchIzq.id = 'switch-tema-menu-izq';
        switchIzq.className = 'switch-tema-menu-izq';
        switchIzq.setAttribute('role', 'group');
        switchIzq.setAttribute('aria-label', 'Cambiar modo oscuro o claro');
        switchIzq.innerHTML = `
            <button type="button" class="btn-switch-top" id="btn-top-oscuro" title="Activar Modo Oscuro">
                <i class="fas fa-moon"></i> Oscuro
            </button>
            <button type="button" class="btn-switch-top" id="btn-top-claro" title="Activar Modo Claro">
                <i class="fas fa-sun"></i> Claro
            </button>
        `;
        menuContenedor.insertBefore(switchIzq, menuContenedor.firstChild);
    }

    if (!document.getElementById('svg-filtros-inclusion-zigo')) {
        const contenedorSvg = document.createElement('div');
        contenedorSvg.id = 'svg-filtros-inclusion-zigo';
        contenedorSvg.innerHTML = `
            <svg style="position:absolute;width:0;height:0;overflow:hidden;" aria-hidden="true">
                <defs>
                    <filter id="filtro-daltonismo">
                        <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0"/>
                    </filter>
                </defs>
            </svg>
        `;
        document.body.appendChild(contenedorSvg);
    }
}


/*============================================================
    4. BUSCADOR TOLERANTE A ERRORES Y CONTACTOS ESCARLET
============================================================*/
function normalizarFonetico(txt) {
    return (txt || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
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
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const costo = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + costo);
        }
    }
    return dp[m][n];
}

function coincideDifuso(consulta, palabrasClave) {
    const tokensConsulta = normalizarFonetico(consulta).split(' ').filter(Boolean);
    const tokensClave = normalizarFonetico(palabrasClave).split(' ').filter(Boolean);

    return tokensConsulta.some(tc => {
        if (tc.length < 3) return tokensClave.includes(tc);
        return tokensClave.some(tk => {
            if (tk.includes(tc) || tc.includes(tk)) return true;
            const maxDist = tc.length >= 6 ? 2 : 1;
            return distanciaLevenshtein(tc, tk) <= maxDist;
        });
    });
}

function inicializarBuscadorInterno() {
    const inputBuscador = document.getElementById('input-buscador-global');
    const btnLupa = document.getElementById('btn-lupa-buscador');
    if (!inputBuscador) return;

    const diccionarioCorrecciones = {
        armasones: 'Armazones', armazon: 'Armazones', lentez: 'Lentes', lentes: 'Lentes',
        sita: 'Cita / Agendar', ajenda: 'Agenda', agendar: 'Agendar cita',
        eksamen: 'Examen de la vista', bista: 'Examen de la vista',
        presio: 'Precios y promociones', kosto: 'Costos y promociones', promosion: 'Promociones',
        markar: 'Contactos y llamada', yamar: 'Llamar / Contacto', telefono: 'Teléfono y WhatsApp',
        wasap: 'WhatsApp', telegram: 'Telegram', ubikasion: 'Ubicación / Domicilio',
        direksion: 'Dirección', doktora: 'Dra. Escarlet Alcocer', eskarlet: 'Dra. Escarlet Alcocer',
        skarlet: 'Dra. Escarlet Alcocer', probador: 'Recomendación Facial IA', rostro: 'Recomendación Facial IA'
    };

    const indiceSitio = [
        {
            titulo: 'Inicio · Ciencia y Arte en tu Mirada',
            desc: 'Portada principal, examen de la vista, pupilentes y experiencias reales.',
            url: `${RUTA_BASE}index.html`,
            tags: 'inicio portada principal bienvenida pupilentes lentes contacto examen vista'
        },
        {
            titulo: 'Catálogo de Armazones y Probador AR',
            desc: 'Modelos en Acetato, Titanio, Urbano y Deportivo con probador virtual.',
            url: `${RUTA_BASE}pages/armazones.html`,
            tags: 'lentes armazones gafas catalogo modelo probar ar virtual acetato titanio'
        },
        {
            titulo: 'Recomendación Facial IA · Tu Lente Ideal',
            desc: 'Escanea tu rostro en vivo o sube una foto para descubrir qué lente te queda mejor.',
            url: `${RUTA_BASE}pages/probador.html`,
            tags: 'recomendacion ia asesor rostro cara ovalada redonda cuadrada foto camara'
        },
        {
            titulo: 'Agendar Examen de la Vista (Sitio o Domicilio)',
            desc: 'Elige fecha y hora con la Dra. Escarlet Alcocer en consultorio o a domicilio.',
            url: `${RUTA_BASE}pages/agenda.html`,
            tags: 'cita agendar examen vista horario domicilio consultorio ubicacion direccion mapa'
        },
        {
            titulo: 'Experiencias en Consulta',
            desc: 'Conoce paso a paso cómo es la atención clínica con nuestros pacientes.',
            url: `${RUTA_BASE}pages/experiencias.html`,
            tags: 'experiencias fotos pacientes consulta proceso testimonio'
        },
        {
            titulo: 'Nosotros · Dra. Escarlet Alcocer y Buzón',
            desc: 'Conoce a nuestra especialista, misión, visión y buzón de sugerencias.',
            url: `${RUTA_BASE}pages/nosotros.html`,
            tags: 'nosotros mision vision valores doctora escarlet alcocer quejas sugerencias'
        },
        ...CATALOGO_ARMAZONES.map(arm => ({
            titulo: `Armazón ${arm.nombre}`,
            desc: `${arm.material} · Estilo ${arm.forma} disponible en catálogo y prueba AR.`,
            url: `${RUTA_BASE}pages/armazones.html`,
            tags: `${arm.nombre} ${arm.forma} ${arm.material} armazon lente`
        }))
    ];

    function ejecutarBusqueda() {
        const consultaOriginal = inputBuscador.value.trim();
        if (!consultaOriginal) {
            inputBuscador.focus();
            return;
        }

        let modalBusqueda = document.getElementById('modal-busqueda-global');
        if (!modalBusqueda) {
            modalBusqueda = document.createElement('div');
            modalBusqueda.id = 'modal-busqueda-global';
            modalBusqueda.className = 'modal-busqueda-overlay';
            document.body.appendChild(modalBusqueda);
        }

        const tokens = normalizarFonetico(consultaOriginal).split(' ');
        const sugerencias = tokens.map(t => diccionarioCorrecciones[t]).filter(Boolean);
        const sugerenciaUnica = [...new Set(sugerencias)].join(', ');

        const esContactoDirecto = coincideDifuso(
            consultaOriginal,
            'marcar llamar telefono celular whatsapp wasap telegram contacto hablar numero mensaje correo'
        );

        const esConsultaPrecioPromo = coincideDifuso(
            consultaOriginal,
            'promo promocion costo precio cuanto cuesta vale descuento oferta cotizacion paquete barato'
        );

        let bloquesHTML = '';

        if (sugerenciaUnica) {
            bloquesHTML += `
                <div class="sugerencia-ortografia-box">
                    <i class="fas fa-magic"></i> ¿Quisiste decir: <strong>${sugerenciaUnica}</strong>? Aquí tienes las opciones relacionadas:
                </div>
            `;
        }

        if (esContactoDirecto || esConsultaPrecioPromo) {
            const msgWa = encodeURIComponent('Hola Dra. Escarlet, visité la página de ziGO y me gustaría agendar una cita o solicitar información de costos.');
            bloquesHTML += `
                <div class="alerta-promo-escarlet" style="margin-top:10px;">
                    <strong><i class="fas fa-user-md"></i> Atención Directa · Dra. Escarlet Alcocer</strong>
                    <p>Para citas, costos personalizados y promociones vigentes comunícate directamente al <strong>${CONFIG_ZIGO.telefonoEscarlet}</strong> o por mensaje:</p>
                    <div class="acciones-promo-escarlet">
                        <a href="https://wa.me/${CONFIG_ZIGO.whatsappEscarlet}?text=${msgWa}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-escarlet">
                            <i class="fab fa-whatsapp"></i> WhatsApp (${CONFIG_ZIGO.telefonoEscarlet})
                        </a>
                        <a href="https://t.me/${CONFIG_ZIGO.telegramUsuario}?text=${msgWa}" target="_blank" rel="noopener noreferrer" class="boton-agenda" style="font-size:13px;">
                            <i class="fab fa-telegram"></i> Telegram
                        </a>
                        <a href="tel:+${CONFIG_ZIGO.whatsappEscarlet}" class="btn-detalles" style="background:#ffffff;color:#02102b;font-size:12px;">
                            <i class="fas fa-phone"></i> Llamar ahora
                        </a>
                    </div>
                </div>
            `;
        }

        const coincidencias = indiceSitio.filter(item => coincideDifuso(consultaOriginal, `${item.titulo} ${item.desc} ${item.tags}`));

        if (coincidencias.length > 0) {
            bloquesHTML += coincidencias.map(c => `
                <a href="${c.url}" class="item-resultado-busqueda">
                    <div>
                        <strong>${c.titulo}</strong>
                        <div style="font-size: 12px; opacity: 0.85; margin-top: 3px;">${c.desc}</div>
                    </div>
                    <i class="fas fa-arrow-right" style="color: var(--neon-cyan);"></i>
                </a>
            `).join('');
        } else if (!esContactoDirecto && !esConsultaPrecioPromo) {
            const msgWa = encodeURIComponent('Hola Dra. Escarlet, quiero agendar una cita o pedir informes en ziGO.');
            bloquesHTML += `
                <p style="font-size: 14px; margin-bottom: 6px;">No encontramos una coincidencia exacta para "<strong>${consultaOriginal}</strong>", pero quizá buscabas alguna de estas opciones:</p>
                <a href="${RUTA_BASE}pages/armazones.html" class="item-resultado-busqueda">
                    <div><strong>Catálogo de Armazones y Probador AR</strong><div style="font-size:12px;opacity:0.85;">Ver modelos de lentes y probarlos en cámara</div></div>
                    <i class="fas fa-glasses"></i>
                </a>
                <a href="${RUTA_BASE}pages/agenda.html" class="item-resultado-busqueda">
                    <div><strong>Agendar Examen de la Vista</strong><div style="font-size:12px;opacity:0.85;">Reservar cita en consultorio o a domicilio</div></div>
                    <i class="fas fa-calendar-check"></i>
                </a>
                <a href="https://wa.me/${CONFIG_ZIGO.whatsappEscarlet}?text=${msgWa}" target="_blank" rel="noopener noreferrer" class="item-resultado-busqueda">
                    <div><strong>Enviar WhatsApp a Escarlet (${CONFIG_ZIGO.telefonoEscarlet})</strong><div style="font-size:12px;opacity:0.85;">Atención directa para citas, llamadas y precios</div></div>
                    <i class="fab fa-whatsapp" style="color:#25D366;"></i>
                </a>
            `;
        }

        modalBusqueda.innerHTML = `
            <div class="modal-busqueda-caja" role="dialog" aria-modal="true" aria-label="Resultados de búsqueda">
                <button type="button" class="modal-cerrar" id="cerrar-busqueda-modal" aria-label="Cerrar búsqueda">&times;</button>
                <h3 style="margin: 0;"><i class="fas fa-search"></i> Resultados para: "${consultaOriginal}"</h3>
                <div class="lista-resultados-busqueda">${bloquesHTML}</div>
            </div>
        `;
        modalBusqueda.style.display = 'flex';

        document.getElementById('cerrar-busqueda-modal').onclick = () => {
            modalBusqueda.style.display = 'none';
        };
        modalBusqueda.onclick = (e) => {
            if (e.target === modalBusqueda) modalBusqueda.style.display = 'none';
        };
    }

    inputBuscador.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ejecutarBusqueda();
        }
    });

    if (btnLupa) {
        btnLupa.addEventListener('click', ejecutarBusqueda);
    }
}


/*============================================================
    5. INCLUSIÓN VISUAL + ENLACES DIRECTOS WHATSAPP / TELEGRAM
============================================================*/
function inicializarAccesibilidadYWidgets() {
    const mensajeCitaDirecto = encodeURIComponent('Hola Dra. Escarlet, vengo de la página de ziGO y me gustaría agendar una cita.');

    const widgetAcc = document.createElement('div');
    widgetAcc.id = 'widget-accesibilidad';
    widgetAcc.className = 'widget-flotante-arrastrable';
    widgetAcc.innerHTML = `
        <div id="panel-accesibilidad" class="panel-accesibilidad oculto" role="region" aria-label="Opciones de accesibilidad visual">
            <h3><span><i class="fas fa-universal-access"></i> Inclusión Visual</span></h3>

            <div class="fila-modo-base-acc">
                <button type="button" class="btn-modo-principal btn-modo-oscuro-card" data-tema="oscuro">
                    <i class="fas fa-moon"></i> Oscuro
                </button>
                <button type="button" class="btn-modo-principal btn-modo-claro-card" data-tema="claro">
                    <i class="fas fa-sun"></i> Claro
                </button>
            </div>

            <div class="bloque-temas-color">
                <span><i class="fas fa-palette"></i> Color de fondo personalizado:</span>
                <div class="paleta-colores-grid">
                    <button type="button" class="btn-color-tema" data-tema="azul-uveg" title="Azul UVEG" style="background:#1e3a8a;"></button>
                    <button type="button" class="btn-color-tema" data-tema="morado" title="Morado Cósmico" style="background:#6d28d9;"></button>
                    <button type="button" class="btn-color-tema" data-tema="azul-botones" title="Azul Botones ziGO" style="background:#0284c7;"></button>
                    <button type="button" class="btn-color-tema" data-tema="menta-uveg" title="Verde Menta UVEG" style="background:#34d399;"></button>
                    <button type="button" class="btn-color-tema" data-tema="pizarra-uveg" title="Gris Pizarra UVEG" style="background:#8e99a8;"></button>
                </div>
            </div>

            <div class="fila-fuente-acc">
                <button type="button" class="btn-acc-opcion" id="acc-texto-mas"><i class="fas fa-plus"></i> Letra A+</button>
                <button type="button" class="btn-acc-opcion" id="acc-texto-menos"><i class="fas fa-minus"></i> Letra A-</button>
            </div>
            <div class="fila-fuente-acc">
                <button type="button" class="btn-acc-opcion" id="acc-espaciado"><i class="fas fa-text-width"></i> Espaciado</button>
                <button type="button" class="btn-acc-opcion" id="acc-interlineado"><i class="fas fa-arrows-alt-v"></i> Interlineado</button>
            </div>
            <button type="button" class="btn-acc-opcion" id="acc-daltonismo">
                <i class="fas fa-low-vision"></i> Visión de Color (Daltonismo)
            </button>
            <button type="button" class="btn-acc-opcion" id="acc-alto-contraste">
                <i class="fas fa-adjust"></i> Alto Contraste
            </button>
            <button type="button" class="btn-acc-opcion" id="acc-guia-lectura">
                <i class="fas fa-grip-lines"></i> Guía de Lectura
            </button>
            <button type="button" class="btn-acc-opcion" id="acc-vista-simple">
                <i class="fas fa-eye"></i> Vista Simplificada
            </button>
            <button type="button" class="btn-acc-opcion" id="acc-leer-pagina">
                <i class="fas fa-volume-up"></i> Escuchar página
            </button>
            <button type="button" class="btn-acc-opcion" id="acc-detener-voz">
                <i class="fas fa-stop-circle"></i> Detener lectura
            </button>
            <button type="button" class="btn-acc-opcion btn-acc-reset" id="acc-restablecer">
                <i class="fas fa-undo"></i> Restablecer todo
            </button>
        </div>
        <button type="button" id="btn-toggle-acc" class="btn-burbuja-maestra" aria-label="Abrir menú de accesibilidad" title="Accesibilidad e Inclusión Visual">
            <i class="fas fa-universal-access"></i>
        </button>
    `;
    document.body.appendChild(widgetAcc);

    const widgetRedes = document.createElement('div');
    widgetRedes.id = 'widget-redes-flotante';
    widgetRedes.className = 'widget-flotante-arrastrable';
    widgetRedes.innerHTML = `
        <div id="globos-redes-lista" class="globos-redes-lista oculto">
            <a href="https://wa.me/${CONFIG_ZIGO.whatsappEscarlet}?text=${mensajeCitaDirecto}" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp · Escarlet</a>
            <a href="https://t.me/${CONFIG_ZIGO.telegramUsuario}?text=${mensajeCitaDirecto}" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-telegram" style="color:#26A5E4;"></i> Telegram · Escarlet</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-instagram" style="color:#E1306C;"></i> Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-facebook-f" style="color:#1877F2;"></i> Facebook</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-tiktok" style="color:#00f0ff;"></i> TikTok</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-x-twitter"></i> X / Twitter</a>
            <a href="https://threads.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fa-brands fa-threads"></i> Threads</a>
        </div>
        <button type="button" id="btn-toggle-redes" class="btn-burbuja-maestra btn-burbuja-redes" aria-label="Abrir redes sociales" title="Contáctanos">
            <i class="fas fa-comment-dots"></i>
        </button>
    `;
    document.body.appendChild(widgetRedes);

    // Actualizar también los enlaces de WhatsApp y Telegram que ya existan en el footer
    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
        a.href = `https://wa.me/${CONFIG_ZIGO.whatsappEscarlet}?text=${mensajeCitaDirecto}`;
    });
    document.querySelectorAll('a[href*="t.me"], a[href*="telegram"]').forEach(a => {
        a.href = `https://t.me/${CONFIG_ZIGO.telegramUsuario}?text=${mensajeCitaDirecto}`;
    });

    function hacerArrastrable(contenedor, botonDisparador, alHacerClic) {
        let arrastrando = false, seMovio = false;
        let inicioX = 0, inicioY = 0, posInicialLeft = 0, posInicialTop = 0;

        function iniciarArrastre(clientX, clientY) {
            arrastrando = true;
            seMovio = false;
            const rect = contenedor.getBoundingClientRect();
            inicioX = clientX;
            inicioY = clientY;
            posInicialLeft = rect.left;
            posInicialTop = rect.top;
            contenedor.style.bottom = 'auto';
            contenedor.style.right = 'auto';
            contenedor.style.left = `${posInicialLeft}px`;
            contenedor.style.top = `${posInicialTop}px`;
        }

        function moverArrastre(clientX, clientY) {
            if (!arrastrando) return;
            const deltaX = clientX - inicioX;
            const deltaY = clientY - inicioY;
            if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) seMovio = true;
            const maxLeft = window.innerWidth - contenedor.offsetWidth - 8;
            const maxTop = window.innerHeight - contenedor.offsetHeight - 8;
            contenedor.style.left = `${Math.max(8, Math.min(maxLeft, posInicialLeft + deltaX))}px`;
            contenedor.style.top = `${Math.max(8, Math.min(maxTop, posInicialTop + deltaY))}px`;
        }

        function finalizarArrastre() {
            if (!arrastrando) return;
            arrastrando = false;
            if (!seMovio) alHacerClic();
        }

        botonDisparador.addEventListener('mousedown', (e) => iniciarArrastre(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => moverArrastre(e.clientX, e.clientY));
        window.addEventListener('mouseup', finalizarArrastre);

        botonDisparador.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            iniciarArrastre(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (!arrastrando) return;
            const t = e.touches[0];
            moverArrastre(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchend', finalizarArrastre);
    }

    const panelAcc = document.getElementById('panel-accesibilidad');
    const listaRedes = document.getElementById('globos-redes-lista');

    hacerArrastrable(widgetAcc, document.getElementById('btn-toggle-acc'), () => {
        panelAcc.classList.toggle('oculto');
        listaRedes.classList.add('oculto');
    });

    hacerArrastrable(widgetRedes, document.getElementById('btn-toggle-redes'), () => {
        listaRedes.classList.toggle('oculto');
        panelAcc.classList.add('oculto');
    });

    function aplicarTemaColor(nombreTema) {
        const temaFinal = nombreTema || 'oscuro';
        document.body.classList.remove(
            'tema-claro',
            'tema-azul-uveg',
            'tema-morado',
            'tema-azul-botones',
            'tema-menta-uveg',
            'tema-pizarra-uveg'
        );
        if (temaFinal !== 'oscuro') {
            document.body.classList.add(`tema-${temaFinal}`);
        }

        document.querySelectorAll('.btn-color-tema, .btn-modo-principal').forEach(btn => {
            btn.classList.toggle('activo', btn.getAttribute('data-tema') === temaFinal);
        });

        const btnTopOscuro = document.getElementById('btn-top-oscuro');
        const btnTopClaro = document.getElementById('btn-top-claro');
        if (btnTopOscuro && btnTopClaro) {
            btnTopOscuro.classList.toggle('activo', temaFinal === 'oscuro');
            btnTopClaro.classList.toggle('activo', temaFinal !== 'oscuro');
        }

        localStorage.setItem('zigo_tema_color', temaFinal);
    }

    document.querySelectorAll('.btn-color-tema, .btn-modo-principal').forEach(btn => {
        btn.addEventListener('click', () => aplicarTemaColor(btn.getAttribute('data-tema')));
    });

    document.getElementById('btn-top-oscuro')?.addEventListener('click', () => aplicarTemaColor('oscuro'));
    document.getElementById('btn-top-claro')?.addEventListener('click', () => aplicarTemaColor('claro'));

    aplicarTemaColor(localStorage.getItem('zigo_tema_color') || 'oscuro');

    let escalaActual = parseFloat(localStorage.getItem('zigo_escala_fuente') || '1');
    document.documentElement.style.setProperty('--escala-fuente', escalaActual);

    let espaciadoActivo = localStorage.getItem('zigo_espaciado') === '1';
    if (espaciadoActivo) {
        document.documentElement.style.setProperty('--espaciado-letras', '0.07em');
        document.getElementById('acc-espaciado').classList.add('activo');
    }

    let interlineadoActivo = localStorage.getItem('zigo_interlineado') === '1';
    if (interlineadoActivo) {
        document.documentElement.style.setProperty('--altura-linea', '1.85');
        document.getElementById('acc-interlineado').classList.add('activo');
    }

    if (localStorage.getItem('zigo_daltonismo') === '1') {
        document.documentElement.classList.add('modo-daltonismo');
        document.getElementById('acc-daltonismo').classList.add('activo');
    }
    if (localStorage.getItem('zigo_alto_contraste') === '1') {
        document.body.classList.add('modo-alto-contraste');
        document.getElementById('acc-alto-contraste').classList.add('activo');
    }
    if (localStorage.getItem('zigo_vista_simple') === '1') {
        document.body.classList.add('vista-simplificada');
        document.getElementById('acc-vista-simple').classList.add('activo');
    }

    let barraGuia = null;
    function activarGuiaLectura(activar) {
        if (activar && !barraGuia) {
            barraGuia = document.createElement('div');
            barraGuia.id = 'guia-lectura-barra';
            barraGuia.style.top = '50%';
            document.body.appendChild(barraGuia);
        } else if (!activar && barraGuia) {
            barraGuia.remove();
            barraGuia = null;
        }
    }
    window.addEventListener('mousemove', (e) => {
        if (barraGuia) barraGuia.style.top = `${e.clientY}px`;
    });
    window.addEventListener('touchmove', (e) => {
        if (barraGuia && e.touches[0]) barraGuia.style.top = `${e.touches[0].clientY}px`;
    }, { passive: true });

    let lecturaActiva = false;
    let timerRespaldoVoz = null;
    let audioTTSActual = null;

    function mostrarBarraLector(textoFrase) {
        let barra = document.getElementById('barra-lector-voz-zigo');
        if (!barra) {
            barra = document.createElement('div');
            barra.id = 'barra-lector-voz-zigo';
            barra.className = 'barra-lector-voz';
            document.body.appendChild(barra);
        }
        barra.innerHTML = `
            <div class="barra-lector-texto"><i class="fas fa-volume-up" style="color:var(--neon-cyan);"></i> Escuchando: <span>${textoFrase}</span></div>
            <button type="button" class="btn-parar-barra-voz" id="btn-cerrar-barra-voz"><i class="fas fa-stop"></i> Detener</button>
        `;
        document.getElementById('btn-cerrar-barra-voz').onclick = detenerLecturaVoz;
    }

    function detenerLecturaVoz() {
        lecturaActiva = false;
        if (timerRespaldoVoz) {
            clearTimeout(timerRespaldoVoz);
            timerRespaldoVoz = null;
        }
        if (audioTTSActual) {
            try {
                audioTTSActual.pause();
                audioTTSActual.src = '';
            } catch (e) {}
            audioTTSActual = null;
        }
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        const barra = document.getElementById('barra-lector-voz-zigo');
        if (barra) barra.remove();

        const btnLeer = document.getElementById('acc-leer-pagina');
        if (btnLeer) {
            btnLeer.classList.remove('activo');
            btnLeer.innerHTML = '<i class="fas fa-volume-up"></i> Escuchar página';
        }
    }

    function dividirTextoEnFragmentos(texto, maxLen = 170) {
        const oraciones = texto.match(/[^.!?¡¿]+[.!?]*/g) || [texto];
        const salida = [];
        for (const oracion of oraciones) {
            const limpia = oracion.trim();
            if (!limpia) continue;
            if (limpia.length <= maxLen) {
                salida.push(limpia);
            } else {
                const palabras = limpia.split(' ');
                let bloque = '';
                for (const p of palabras) {
                    if ((bloque + ' ' + p).trim().length > maxLen) {
                        salida.push(bloque.trim());
                        bloque = p;
                    } else {
                        bloque = (bloque + ' ' + p).trim();
                    }
                }
                if (bloque) salida.push(bloque);
            }
        }
        return salida;
    }

    function iniciarLecturaPagina() {
        detenerLecturaVoz();
        lecturaActiva = true;

        const btnLeer = document.getElementById('acc-leer-pagina');
        if (btnLeer) {
            btnLeer.classList.add('activo');
            btnLeer.innerHTML = '<i class="fas fa-volume-up"></i> Escuchando...';
        }

        const contenedor = document.getElementById('contenido-principal') || document.body;
        const textoLimpio = contenedor.innerText.replace(/\s+/g, ' ').trim();
        const fragmentos = dividirTextoEnFragmentos(textoLimpio, 170);
        let indice = 0;

        function reproducirSiguienteFragmento() {
            if (!lecturaActiva || indice >= fragmentos.length) {
                detenerLecturaVoz();
                return;
            }

            const frase = fragmentos[indice];
            mostrarBarraLector(frase);

            const vocesNativas = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
            const vozEsNativa = vocesNativas.find(v => v.lang && v.lang.toLowerCase().startsWith('es'));

            if (vozEsNativa) {
                try {
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(frase);
                    utter.voice = vozEsNativa;
                    utter.lang = 'es-MX';
                    utter.onend = () => {
                        indice++;
                        reproducirSiguienteFragmento();
                    };
                    utter.onerror = () => reproducirConAudioWeb(frase);
                    window.speechSynthesis.speak(utter);
                    return;
                } catch (e) {}
            }

            reproducirConAudioWeb(frase);
        }

        function reproducirConAudioWeb(frase) {
            if (!lecturaActiva) return;
            const urlAudio = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es-MX&client=tw-ob&q=${encodeURIComponent(frase)}`;
            const audio = new Audio(urlAudio);
            audioTTSActual = audio;

            audio.onended = () => {
                indice++;
                reproducirSiguienteFragmento();
            };

            audio.onerror = () => {
                timerRespaldoVoz = setTimeout(() => {
                    indice++;
                    reproducirSiguienteFragmento();
                }, Math.max(2500, frase.length * 55));
            };

            audio.play().catch(() => {
                timerRespaldoVoz = setTimeout(() => {
                    indice++;
                    reproducirSiguienteFragmento();
                }, Math.max(2500, frase.length * 55));
            });
        }

        reproducirSiguienteFragmento();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    document.getElementById('acc-espaciado').addEventListener('click', function () {
        espaciadoActivo = !espaciadoActivo;
        this.classList.toggle('activo', espaciadoActivo);
        document.documentElement.style.setProperty('--espaciado-letras', espaciadoActivo ? '0.07em' : 'normal');
        localStorage.setItem('zigo_espaciado', espaciadoActivo ? '1' : '0');
    });

    document.getElementById('acc-interlineado').addEventListener('click', function () {
        interlineadoActivo = !interlineadoActivo;
        this.classList.toggle('activo', interlineadoActivo);
        document.documentElement.style.setProperty('--altura-linea', interlineadoActivo ? '1.85' : '1.5');
        localStorage.setItem('zigo_interlineado', interlineadoActivo ? '1' : '0');
    });

    document.getElementById('acc-daltonismo').addEventListener('click', function () {
        const activo = document.documentElement.classList.toggle('modo-daltonismo');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_daltonismo', activo ? '1' : '0');
    });

    document.getElementById('acc-alto-contraste').addEventListener('click', function () {
        const activo = document.body.classList.toggle('modo-alto-contraste');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_alto_contraste', activo ? '1' : '0');
    });

    document.getElementById('acc-guia-lectura').addEventListener('click', function () {
        const activo = !this.classList.contains('activo');
        this.classList.toggle('activo', activo);
        activarGuiaLectura(activo);
    });

    document.getElementById('acc-vista-simple').addEventListener('click', function () {
        const activo = document.body.classList.toggle('vista-simplificada');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_vista_simple', activo ? '1' : '0');
    });

    document.getElementById('acc-texto-mas').addEventListener('click', () => {
        escalaActual = Math.min(1.32, +(escalaActual + 0.08).toFixed(2));
        document.documentElement.style.setProperty('--escala-fuente', escalaActual);
        localStorage.setItem('zigo_escala_fuente', escalaActual);
    });

    document.getElementById('acc-texto-menos').addEventListener('click', () => {
        escalaActual = Math.max(0.85, +(escalaActual - 0.08).toFixed(2));
        document.documentElement.style.setProperty('--escala-fuente', escalaActual);
        localStorage.setItem('zigo_escala_fuente', escalaActual);
    });

    document.getElementById('acc-leer-pagina').addEventListener('click', iniciarLecturaPagina);
    document.getElementById('acc-detener-voz').addEventListener('click', detenerLecturaVoz);

    document.getElementById('acc-restablecer').addEventListener('click', () => {
        detenerLecturaVoz();
        aplicarTemaColor('oscuro');
        document.body.classList.remove('modo-alto-contraste', 'vista-simplificada');
        document.documentElement.classList.remove('modo-daltonismo');
        document.querySelectorAll('#panel-accesibilidad .btn-acc-opcion').forEach(b => b.classList.remove('activo'));
        activarGuiaLectura(false);
        escalaActual = 1;
        espaciadoActivo = false;
        interlineadoActivo = false;
        document.documentElement.style.setProperty('--escala-fuente', '1');
        document.documentElement.style.setProperty('--espaciado-letras', 'normal');
        document.documentElement.style.setProperty('--altura-linea', '1.5');
        localStorage.removeItem('zigo_daltonismo');
        localStorage.removeItem('zigo_alto_contraste');
        localStorage.removeItem('zigo_vista_simple');
        localStorage.removeItem('zigo_escala_fuente');
        localStorage.removeItem('zigo_espaciado');
        localStorage.removeItem('zigo_interlineado');
    });
}


/*============================================================
    6. PÁGINA INICIO: RESEÑAS VERIFICADAS 5 ESTRELLAS
============================================================*/
function inicializarTestimonios5Estrellas() {
    const grid = document.getElementById('grid-testimonios-dinamicos');
    if (!grid) return;

    const poolResenasGoogle = [
        { inicial: 'M', nombre: 'Miguel Rocha', estrellas: 5, texto: '"Excelente atención profesional. Me encantó la variedad de armazones y el cuidado en cada medición. Mis lentes quedaron perfectos."' },
        { inicial: 'J', nombre: 'Julio César B.', estrellas: 5, texto: '"¡La atención al paciente es increíble! Todo el proceso fue muy cómodo, claro y con un trato humano excepcional. ¡Súper recomendado!"' },
        { inicial: 'A', nombre: 'Arantza L.', estrellas: 5, texto: '"La doctora Escarlet es una excelente especialista. Me explicó cada detalle de mi diagnóstico y el proceso de selección fue muy profesional."' },
        { inicial: 'S', nombre: 'Sofía Martínez', estrellas: 5, texto: '"La recomendación virtual me ayudó a elegir un armazón que jamás pensé que me quedaría tan bien. La consulta con la Dra. Escarlet fue puntual y muy completa."' },
        { inicial: 'D', nombre: 'Daniel Hernández', estrellas: 5, texto: '"Muy satisfecho con la calidad óptica y la rapidez en la entrega. Se nota la dedicación y el profesionalismo en cada detalle."' }
    ];

    const soloCincoEstrellas = poolResenasGoogle.filter(r => r.estrellas === 5);
    const mezcladas = soloCincoEstrellas.sort(() => Math.random() - 0.5).slice(0, 3);

    grid.innerHTML = mezcladas.map(r => `
        <article class="testimonio-google-card">
            <div class="card-header">
                <div class="avatar-placeholder" aria-hidden="true">${r.inicial}</div>
                <div class="reviewer-info">
                    <p class="reviewer-name">${r.nombre}</p>
                    <p class="review-date">Reseña Verificada 5★</p>
                </div>
                <img src="${RUTA_BASE}img/google-logo.webp" alt="Google" class="google-icon-small" loading="lazy">
            </div>
            <div class="google-stars-yellow" aria-label="5 estrellas de calificación">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
            </div>
            <blockquote class="review-text">${r.texto}</blockquote>
        </article>
    `).join('');
}


/*============================================================
    7. RENDERIZADO 3D ANATÓMICO REALISTA (PUENTE NASAL + PERSPECTIVA + OREJAS)
============================================================*/
function dibujarArmazonEnRostro(ctx, w, h, landmarks, armazonData, escalaExtra = 1, offsetYExtra = 0, espejado = true) {
    if (!armazonData || !armazonData.canvas) return;

    // Nunca usar multiply porque ensucia la piel; si aún no se procesó en servidor HTTP, aplicar contraste limpio
    if (ctx.canvas) {
        ctx.canvas.style.mixBlendMode = 'normal';
    }

    const mapX = (normX) => (espejado ? (1 - normX) : normX) * w;
    const mapY = (normY) => normY * h;

    // 1. Puntos de pupilas (MediaPipe Iris Landmarks 468 y 473)
    const ojoDer = landmarks[468]
        ? { x: mapX(landmarks[468].x), y: mapY(landmarks[468].y) }
        : { x: mapX((landmarks[33].x + landmarks[133].x) / 2), y: mapY((landmarks[33].y + landmarks[133].y) / 2) };

    const ojoIzq = landmarks[473]
        ? { x: mapX(landmarks[473].x), y: mapY(landmarks[473].y) }
        : { x: mapX((landmarks[263].x + landmarks[362].x) / 2), y: mapY((landmarks[263].y + landmarks[362].y) / 2) };

    const pIzq = ojoIzq.x < ojoDer.x ? ojoIzq : ojoDer;
    const pDer = ojoIzq.x < ojoDer.x ? ojoDer : ojoIzq;

    // 2. Puntos anatómicos clave: Orejas/Sienes (234, 454), Puente Nasal (168), Frente (10), Mentón (152)
    const sienA = { x: mapX(landmarks[234].x), y: mapY(landmarks[234].y) };
    const sienB = { x: mapX(landmarks[454].x), y: mapY(landmarks[454].y) };
    const orejaIzq = sienA.x < sienB.x ? sienA : sienB;
    const orejaDer = sienA.x < sienB.x ? sienB : sienA;

    const puenteNasal = { x: mapX(landmarks[168].x), y: mapY(landmarks[168].y) };
    const frente = { x: mapX(landmarks[10].x), y: mapY(landmarks[10].y) };
    const menton = { x: mapX(landmarks[152].x), y: mapY(landmarks[152].y) };

    const distPupilar = Math.hypot(pDer.x - pIzq.x, pDer.y - pIzq.y);
    const anchoSienes = Math.hypot(orejaDer.x - orejaIzq.x, orejaDer.y - orejaIzq.y);
    const anguloRoll = Math.atan2(pDer.y - pIzq.y, pDer.x - pIzq.x);

    // 3. Cálculo de giro horizontal (Yaw: izquierda / derecha) e inclinación vertical (Pitch: arriba / abajo)
    const distPuenteIzq = Math.abs(puenteNasal.x - orejaIzq.x);
    const distPuenteDer = Math.abs(orejaDer.x - puenteNasal.x);
    const yaw = Math.max(-0.72, Math.min(0.72, (distPuenteDer - distPuenteIzq) / ((distPuenteDer + distPuenteIzq) || 1)));

    const midPupilasY = (pIzq.y + pDer.y) / 2;
    const distFrenteOjos = Math.abs(midPupilasY - frente.y);
    const distOjosMenton = Math.abs(menton.y - midPupilasY);
    const ratioVertical = distFrenteOjos / (distOjosMenton || 1);
    const pitch = Math.max(-0.48, Math.min(0.48, (ratioVertical - 0.56) * 1.45));

    // 4. Anclaje real en el puente nasal (70% puente nasal 168 + 30% centro de pupilas) para que no flote al girar
    const midPupilasX = (pIzq.x + pDer.x) / 2;
    const centroX = (puenteNasal.x * 0.70 + midPupilasX * 0.30);
    const centroY = (midPupilasY * 0.82 + puenteNasal.y * 0.18) + offsetYExtra + (pitch * distPupilar * 0.22);

    const anchoFrente = Math.max(distPupilar * 2.15, anchoSienes * 0.93) * escalaExtra * Math.cos(yaw * 0.68);
    const imgCanvas = armazonData.canvas;
    const proporcion = (imgCanvas.height || 150) / (imgCanvas.width || 300);
    const altoFrente = anchoFrente * proporcion * Math.cos(pitch * 0.55);

    const cosR = Math.cos(anguloRoll);
    const sinR = Math.sin(anguloRoll);

    // Posiciones 3D de las bisagras exteriores del armazón
    const factorIzq = 1 - yaw * 0.22;
    const factorDer = 1 + yaw * 0.22;

    const bisagraIzqX = centroX - (anchoFrente * 0.48) * cosR;
    const bisagraIzqY = centroY - (anchoFrente * 0.48) * sinR - (altoFrente * 0.16 * factorIzq);

    const bisagraDerX = centroX + (anchoFrente * 0.48) * cosR;
    const bisagraDerY = centroY + (anchoFrente * 0.48) * sinR - (altoFrente * 0.16 * factorDer);

    // 5. Dibujar patitas anatómicas con oclusión realista (solo se dibuja el lado visible hacia la oreja)
    ctx.save();
    ctx.strokeStyle = armazonData.colorPatita || 'rgba(28, 32, 38, 0.92)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Si giras la cabeza hacia la izquierda (yaw > 0.07), tu oreja izquierda queda visible al frente
    if (yaw > 0.07) {
        const grosor = Math.max(3.5, anchoFrente * 0.026);
        ctx.lineWidth = grosor;
        const destinoOrejaX = orejaIzq.x + 2;
        const destinoOrejaY = orejaIzq.y - (altoFrente * 0.14);
        const ctrlX = (bisagraIzqX + destinoOrejaX) / 2;
        const ctrlY = Math.min(bisagraIzqY, destinoOrejaY) - (altoFrente * 0.06);

        ctx.beginPath();
        ctx.moveTo(bisagraIzqX, bisagraIzqY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, destinoOrejaX, destinoOrejaY);
        ctx.stroke();
    }

    // Si giras la cabeza hacia la derecha (yaw < -0.07), tu oreja derecha queda visible al frente
    if (yaw < -0.07) {
        const grosor = Math.max(3.5, anchoFrente * 0.026);
        ctx.lineWidth = grosor;
        const destinoOrejaX = orejaDer.x - 2;
        const destinoOrejaY = orejaDer.y - (altoFrente * 0.14);
        const ctrlX = (bisagraDerX + destinoOrejaX) / 2;
        const ctrlY = Math.min(bisagraDerY, destinoOrejaY) - (altoFrente * 0.06);

        ctx.beginPath();
        ctx.moveTo(bisagraDerX, bisagraDerY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, destinoOrejaX, destinoOrejaY);
        ctx.stroke();
    }
    ctx.restore();

    // 6. Dibujar el frente del armazón con escorzo trapezoidal en 16 bandas para efecto 3D envolvente
    ctx.save();
    ctx.translate(centroX, centroY);
    ctx.rotate(anguloRoll);

    if (armazonData.transparente) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 4;
    } else {
        // En modo file:// sin servidor HTTP, aplicar filtro limpio
        ctx.filter = 'contrast(1.15)';
    }

    const numFranjas = 16;
    const srcW = imgCanvas.width;
    const srcH = imgCanvas.height;

    for (let i = 0; i < numFranjas; i++) {
        const t0 = i / numFranjas;
        const t1 = (i + 1) / numFranjas;
        const tMid = (t0 + t1) / 2; // 0 = izquierda, 1 = derecha
        const ladoNormalizado = (tMid - 0.5) * 2; // -1 a +1

        // El lado más cercano a la cámara es ligeramente más alto por perspectiva real
        const escalaPerspectiva = 1 + (yaw * 0.24 * ladoNormalizado);
        const dstX = -anchoFrente / 2 + t0 * anchoFrente;
        const dstW = (anchoFrente / numFranjas) + 0.6;
        const dstH = altoFrente * escalaPerspectiva;
        const dstY = -dstH / 2 + (pitch * altoFrente * 0.12 * Math.abs(ladoNormalizado));

        ctx.drawImage(
            imgCanvas,
            t0 * srcW, 0, srcW / numFranjas, srcH,
            dstX, dstY, dstW, dstH
        );
    }

    ctx.restore();
}

function dibujarArmazonCentradoFallback(ctx, w, h, armazonData, escalaExtra = 1, offsetYExtra = 0) {
    if (!armazonData || !armazonData.canvas) return;
    if (ctx.canvas) ctx.canvas.style.mixBlendMode = 'normal';
    const imgCanvas = armazonData.canvas;
    const ancho = w * 0.46 * escalaExtra;
    const alto = ancho * ((imgCanvas.height || 150) / (imgCanvas.width || 300));
    ctx.save();
    ctx.drawImage(imgCanvas, (w - ancho) / 2, (h * 0.45) - (alto / 2) + offsetYExtra, ancho, alto);
    ctx.restore();
}

async function validarFotoRostroBiometrica(archivo) {
    if (!archivo) return { valido: false, motivo: 'No se seleccionó ningún archivo.' };

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
        return { valido: false, motivo: 'Formato no válido. Sube únicamente una imagen JPG, PNG o WEBP de tu rostro.' };
    }

    if (archivo.size > 12 * 1024 * 1024) {
        return { valido: false, motivo: 'La imagen es demasiado pesada (máximo 12 MB).' };
    }

    if (typeof FaceMesh === 'undefined') {
        return { valido: false, motivo: 'El motor de validación facial aún está cargando. Intenta de nuevo en 2 segundos.' };
    }

    const urlTemporal = URL.createObjectURL(archivo);
    const img = new Image();

    const cargada = await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = urlTemporal;
    });

    if (!cargada || !img.naturalWidth) {
        URL.revokeObjectURL(urlTemporal);
        return { valido: false, motivo: 'No se pudo leer la imagen seleccionada.' };
    }

    return new Promise((resolve) => {
        const detector = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        detector.setOptions({
            maxNumFaces: 2,
            refineLandmarks: true,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.65
        });

        let respondido = false;
        const timeoutId = setTimeout(() => {
            if (!respondido) {
                respondido = true;
                URL.revokeObjectURL(urlTemporal);
                resolve({ valido: false, motivo: 'No se logró detectar un rostro claro en la fotografía.' });
            }
        }, 8000);

        detector.onResults((results) => {
            if (respondido) return;
            respondido = true;
            clearTimeout(timeoutId);

            const rostros = results.multiFaceLandmarks || [];
            if (rostros.length !== 1) {
                URL.revokeObjectURL(urlTemporal);
                resolve({
                    valido: false,
                    motivo: rostros.length === 0
                        ? 'Imagen rechazada: No se detectó un rostro humano claro. Sube únicamente una fotografía frontal de tu rostro.'
                        : 'Imagen rechazada: Se detectaron múltiples rostros. Sube una foto individual de tu rostro.'
                });
                return;
            }

            const lm = rostros[0];
            const distOjos = Math.hypot(lm[263].x - lm[33].x, lm[263].y - lm[33].y);
            const altoRostro = Math.hypot(lm[152].x - lm[10].x, lm[152].y - lm[10].y);
            const nariz = lm[1];

            const rostroValido = (
                distOjos >= 0.10 &&
                distOjos <= 0.72 &&
                altoRostro >= 0.22 &&
                nariz.x > 0.15 && nariz.x < 0.85 &&
                nariz.y > 0.15 && nariz.y < 0.85
            );

            if (!rostroValido) {
                URL.revokeObjectURL(urlTemporal);
                resolve({
                    valido: false,
                    motivo: 'Imagen rechazada: El rostro está muy lejos o recortado. Sube un retrato frontal centrado.'
                });
                return;
            }

            resolve({ valido: true, img, landmarks: lm, urlTemporal });
        });

        detector.send({ image: img }).catch(() => {
            if (!respondido) {
                respondido = true;
                clearTimeout(timeoutId);
                URL.revokeObjectURL(urlTemporal);
                resolve({ valido: false, motivo: 'Error al analizar la imagen. Intenta con otra foto.' });
            }
        });
    });
}


/*============================================================
    8. PÁGINA ARMÁZONES: LIMPIEZA DE FONDOS Y PROBADOR AR
============================================================*/
async function limpiarFondosCatalogoTarjetas() {
    const imagenesCatalogo = document.querySelectorAll('.armazon-img');
    for (const imgEl of imagenesCatalogo) {
        const srcOriginal = imgEl.getAttribute('src');
        if (!srcOriginal) continue;
        const limpio = await obtenerArmazonProcesado(srcOriginal);
        if (limpio && limpio.canvasCatalogo && limpio.canvasCatalogo.toDataURL) {
            try {
                imgEl.src = limpio.canvasCatalogo.toDataURL('image/png');
            } catch (e) {}
        }
    }
}

async function abrirModal(nombre, imagen, material, descripcion) {
    document.getElementById('modal-titulo').innerText = nombre;
    const modalImg = document.getElementById('modal-img');
    modalImg.src = imagen;
    const limpio = await obtenerArmazonProcesado(imagen);
    if (limpio && limpio.canvasCatalogo && limpio.canvasCatalogo.toDataURL) {
        try {
            modalImg.src = limpio.canvasCatalogo.toDataURL('image/png');
        } catch (e) {}
    }
    document.getElementById('modal-material').innerText = `Material: ${material}`;
    document.getElementById('modal-descripcion').innerText = descripcion;
    document.getElementById('modal-detalles').style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modal-detalles');
    if (modal) modal.style.display = 'none';
}

let streamARIndividual = null;
let animacionARIndividualId = null;
let faceMeshIndividual = null;
let ultimosLandmarksIndividual = null;
let armazonModalActual = null;
let fotoEstaticaModal = null;
let landmarksFotoModal = null;

async function abrirProbadorVirtual(nombre, imagenRuta) {
    const modal = document.getElementById('modal-probador-ar');
    const video = document.getElementById('webcam-ar');
    const canvas = document.getElementById('canvas-ar-individual');
    const badge = document.getElementById('badge-tracking-individual');
    if (!modal || !video || !canvas) return;

    const controlesExistentes = modal.querySelector('.ar-controles-ajuste');
    if (controlesExistentes && !document.getElementById('ar-brillo-modal')) {
        controlesExistentes.insertAdjacentHTML('beforeend', `
            <label>
                Brillo de cámara / foto
                <input type="range" id="ar-brillo-modal" min="60" max="160" step="5" value="100">
            </label>
            <label>
                Contraste
                <input type="range" id="ar-contraste-modal" min="70" max="150" step="5" value="100">
            </label>
        `);
        controlesExistentes.insertAdjacentHTML('afterend', `
            <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                <input type="file" id="input-foto-modal-ar" accept="image/jpeg,image/png,image/webp" style="display:none;">
                <button type="button" id="btn-subir-foto-modal" class="btn-detalles" style="flex:1;">
                    <i class="fas fa-upload"></i> Subir foto de mi rostro
                </button>
                <button type="button" id="btn-volver-camara-modal" class="btn-detalles oculto" style="flex:1;">
                    <i class="fas fa-video"></i> Volver a cámara
                </button>
            </div>
        `);

        document.getElementById('btn-subir-foto-modal').onclick = () => {
            document.getElementById('input-foto-modal-ar').click();
        };

        document.getElementById('input-foto-modal-ar').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (badge) badge.innerHTML = '<span class="punto-estado"></span> Validando rostro con IA...';
            const res = await validarFotoRostroBiometrica(file);
            if (!res.valido) {
                alert(res.motivo);
                e.target.value = '';
                return;
            }
            if (streamARIndividual) {
                streamARIndividual.getTracks().forEach(t => t.stop());
                streamARIndividual = null;
            }
            video.style.display = 'none';
            fotoEstaticaModal = res.img;
            landmarksFotoModal = res.landmarks;
            document.getElementById('btn-volver-camara-modal').classList.remove('oculto');
            if (badge) badge.innerHTML = '<span class="punto-estado activo"></span> Foto de rostro verificada';
        };

        document.getElementById('btn-volver-camara-modal').onclick = () => {
            fotoEstaticaModal = null;
            landmarksFotoModal = null;
            video.style.display = 'block';
            document.getElementById('btn-volver-camara-modal').classList.add('oculto');
            abrirProbadorVirtual(nombre, imagenRuta);
        };
    }

    document.getElementById('probador-titulo').innerText = `Probador AR: ${nombre}`;
    document.getElementById('ar-escala').value = 1;
    document.getElementById('ar-posicion-y').value = 0;
    if (document.getElementById('ar-brillo-modal')) document.getElementById('ar-brillo-modal').value = 100;
    if (document.getElementById('ar-contraste-modal')) document.getElementById('ar-contraste-modal').value = 100;

    fotoEstaticaModal = null;
    landmarksFotoModal = null;
    video.style.display = 'block';
    document.getElementById('btn-volver-camara-modal')?.classList.add('oculto');
    modal.style.display = 'flex';

    armazonModalActual = await obtenerArmazonProcesado(imagenRuta);

    const ctx = canvas.getContext('2d');
    if (animacionARIndividualId) cancelAnimationFrame(animacionARIndividualId);

    async function bucleRenderAR() {
        const escalaUsuario = parseFloat(document.getElementById('ar-escala')?.value || '1');
        const offsetYUsuario = parseFloat(document.getElementById('ar-posicion-y')?.value || '0');
        const brillo = document.getElementById('ar-brillo-modal')?.value || '100';
        const contraste = document.getElementById('ar-contraste-modal')?.value || '100';

        video.style.filter = `brightness(${brillo}%) contrast(${contraste}%)`;

        if (fotoEstaticaModal && landmarksFotoModal) {
            canvas.width = fotoEstaticaModal.naturalWidth || 640;
            canvas.height = fotoEstaticaModal.naturalHeight || 480;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
            ctx.drawImage(fotoEstaticaModal, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            dibujarArmazonEnRostro(ctx, canvas.width, canvas.height, landmarksFotoModal, armazonModalActual, escalaUsuario, offsetYUsuario, false);
            animacionARIndividualId = requestAnimationFrame(bucleRenderAR);
            return;
        }

        if (!streamARIndividual) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faceMeshIndividual && video.readyState >= 2) {
            try { await faceMeshIndividual.send({ image: video }); } catch (e) {}
        }

        if (ultimosLandmarksIndividual && armazonModalActual) {
            if (badge) badge.innerHTML = '<span class="punto-estado activo"></span> Rostro rastreado en vivo';
            dibujarArmazonEnRostro(ctx, canvas.width, canvas.height, ultimosLandmarksIndividual, armazonModalActual, escalaUsuario, offsetYUsuario, true);
        } else if (armazonModalActual) {
            if (badge) badge.innerHTML = '<span class="punto-estado"></span> Centra tu rostro frente a la cámara';
            dibujarArmazonCentradoFallback(ctx, canvas.width, canvas.height, armazonModalActual, escalaUsuario, offsetYUsuario);
        }

        animacionARIndividualId = requestAnimationFrame(bucleRenderAR);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        bucleRenderAR();
        return;
    }

    try {
        streamARIndividual = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = streamARIndividual;
        await video.play();

        if (typeof FaceMesh !== 'undefined' && !faceMeshIndividual) {
            faceMeshIndividual = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            faceMeshIndividual.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.55,
                minTrackingConfidence: 0.55
            });
            faceMeshIndividual.onResults((results) => {
                ultimosLandmarksIndividual = (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null;
            });
        }

        bucleRenderAR();
    } catch (err) {
        if (badge) badge.innerHTML = '<span class="punto-estado"></span> Cámara no disponible · Usa "Subir foto"';
        bucleRenderAR();
    }
}

function cerrarProbadorVirtual() {
    if (animacionARIndividualId) {
        cancelAnimationFrame(animacionARIndividualId);
        animacionARIndividualId = null;
    }
    if (streamARIndividual) {
        streamARIndividual.getTracks().forEach(track => track.stop());
        streamARIndividual = null;
    }
    fotoEstaticaModal = null;
    landmarksFotoModal = null;
    const video = document.getElementById('webcam-ar');
    if (video) video.srcObject = null;
    const modal = document.getElementById('modal-probador-ar');
    if (modal) modal.style.display = 'none';
}

function tomarCapturaProbadorAR() {
    const video = document.getElementById('webcam-ar');
    const canvasOverlay = document.getElementById('canvas-ar-individual');
    if (!canvasOverlay) return;

    const canvasFinal = document.createElement('canvas');
    canvasFinal.width = canvasOverlay.width || 640;
    canvasFinal.height = canvasOverlay.height || 480;
    const ctx = canvasFinal.getContext('2d');

    if (streamARIndividual && video && !fotoEstaticaModal) {
        const brillo = document.getElementById('ar-brillo-modal')?.value || '100';
        const contraste = document.getElementById('ar-contraste-modal')?.value || '100';
        ctx.save();
        ctx.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
        ctx.translate(canvasFinal.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvasFinal.width, canvasFinal.height);
        ctx.restore();
    }

    ctx.drawImage(canvasOverlay, 0, 0, canvasFinal.width, canvasFinal.height);

    const enlace = document.createElement('a');
    enlace.href = canvasFinal.toDataURL('image/png');
    enlace.download = 'ziGO-Prueba-AR.png';
    enlace.click();
}

function actualizarContador() {
    const seleccionados = document.querySelectorAll('.seleccionar-armazon:checked');
    const contadorSpan = document.getElementById('contador-seleccionados');
    const panelFlotante = document.querySelector('.panel-agendar-flotante');

    if (contadorSpan && panelFlotante) {
        contadorSpan.innerText = seleccionados.length;
        panelFlotante.classList.toggle('activo', seleccionados.length > 0);
    }
}

function inicializarFiltros() {
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    const tarjetas = document.querySelectorAll('.armazon-card');
    if (botonesFiltro.length === 0) return;

    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            boton.classList.add('activo');
            const filtro = boton.getAttribute('data-filtro');

            tarjetas.forEach(tarjeta => {
                const cat = tarjeta.getAttribute('data-categoria');
                const visible = filtro === 'todos' || cat === filtro;
                tarjeta.style.display = visible ? 'flex' : 'none';
            });
        });
    });
}

function irAColocarCita() {
    const seleccionados = Array.from(document.querySelectorAll('.seleccionar-armazon:checked')).map(cb => cb.value);
    if (seleccionados.length === 0) return;
    window.location.href = `agenda.html?armazones=${encodeURIComponent(seleccionados.join(', '))}`;
}


/*============================================================
    9. PÁGINA RECOMENDACIÓN FACIAL IA (PROBADOR.HTML)
============================================================*/
function inicializarAsistenteIA() {
    const video = document.getElementById('webcam-feed');
    const canvasOverlay = document.getElementById('ar-overlay');
    const btnActivarCamara = document.getElementById('btn-activar-camara');
    const btnCaptura = document.getElementById('btn-captura');
    const btnEscanear = document.getElementById('btn-escanear-ia');
    const alertaIA = document.getElementById('alerta-ia-rostro');
    const panelResultado = document.getElementById('resultado-ia');
    const statusTexto = document.getElementById('ar-status-texto');
    const statusDot = document.getElementById('ar-status-dot');
    const selectCatalogo = document.getElementById('select-armazon-ia');

    if (!video || !btnEscanear || !canvasOverlay) return;

    const tieneControlesNativos = Boolean(
        document.getElementById('btn-subir-foto') ||
        document.getElementById('slider-brillo') ||
        document.getElementById('slider-escala-ia')
    );

    const visorContainer = video.closest('.ar-visor-container');
    if (visorContainer && !tieneControlesNativos && !document.getElementById('controles-extra-probador-ia')) {
        visorContainer.insertAdjacentHTML('afterend', `
            <div id="controles-extra-probador-ia" style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="file" id="input-subir-foto-ia" accept="image/jpeg,image/png,image/webp" style="display:none;">
                    <button type="button" id="btn-subir-foto-ia" class="btn-detalles">
                        <i class="fas fa-image"></i> Subir foto de mi rostro
                    </button>
                    <button type="button" id="btn-volver-camara-ia" class="btn-detalles oculto">
                        <i class="fas fa-video"></i> Volver a cámara en vivo
                    </button>
                </div>
                <div class="ar-controles-ajuste" style="margin-bottom:0;">
                    <label>Brillo de imagen <input type="range" id="ia-brillo" min="60" max="165" step="5" value="100"></label>
                    <label>Contraste <input type="range" id="ia-contraste" min="70" max="150" step="5" value="100"></label>
                    <label>Tamaño del armazón <input type="range" id="ia-escala-lente" min="0.7" max="1.4" step="0.05" value="1"></label>
                    <label>Altura en nariz <input type="range" id="ia-offset-y" min="-30" max="30" step="1" value="0"></label>
                </div>
            </div>
        `);
    }

    const sliderBrillo = document.getElementById('slider-brillo') || document.getElementById('ia-brillo');
    const sliderContraste = document.getElementById('slider-contraste') || document.getElementById('ia-contraste');
    const sliderEscala = document.getElementById('slider-escala-ia') || document.getElementById('ia-escala-lente');
    const sliderOffset = document.getElementById('slider-offset-ia') || document.getElementById('ia-offset-y');
    const btnSubirFoto = document.getElementById('btn-subir-foto') || document.getElementById('btn-subir-foto-ia');
    const inputSubirFoto = document.getElementById('input-foto-rostro') || document.getElementById('input-subir-foto-ia');
    const btnVolverCamara = document.getElementById('btn-usar-camara') || document.getElementById('btn-volver-camara-ia');

    let streamIA = null;
    let faceMeshIA = null;
    let ultimosLandmarksIA = null;
    let armazonActivoIA = null;
    let rafIA = null;
    let fotoSubidaIA = null;
    let landmarksFotoSubidaIA = null;

    function mostrarAlertaIA(msg) {
        if (!alertaIA) return;
        alertaIA.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
        alertaIA.classList.remove('oculto');
    }

    function aplicarFiltrosLuzIA() {
        const brillo = sliderBrillo?.value || '100';
        const contraste = sliderContraste?.value || '100';
        const spanBrillo = document.getElementById('val-brillo');
        const spanContraste = document.getElementById('val-contraste');
        if (spanBrillo) spanBrillo.innerText = `${brillo}%`;
        if (spanContraste) spanContraste.innerText = `${contraste}%`;
        video.style.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
    }

    sliderBrillo?.addEventListener('input', aplicarFiltrosLuzIA);
    sliderContraste?.addEventListener('input', aplicarFiltrosLuzIA);

    async function seleccionarArmazonEnVivoIA(nombre, rutaRelativa) {
        armazonActivoIA = await obtenerArmazonProcesado(rutaRelativa);
        document.querySelectorAll('.btn-modelo-lente').forEach(btn => {
            btn.classList.toggle('activo', btn.getAttribute('data-nombre') === nombre);
        });
    }

    function iniciarBucleRenderIA() {
        if (rafIA) cancelAnimationFrame(rafIA);
        const ctx = canvasOverlay.getContext('2d');

        async function bucleIA() {
            const escala = parseFloat(sliderEscala?.value || '1');
            const offsetY = parseFloat(sliderOffset?.value || '0');
            const brillo = sliderBrillo?.value || '100';
            const contraste = sliderContraste?.value || '100';

            if (fotoSubidaIA && landmarksFotoSubidaIA) {
                canvasOverlay.width = fotoSubidaIA.naturalWidth || 640;
                canvasOverlay.height = fotoSubidaIA.naturalHeight || 480;
                ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
                ctx.save();
                ctx.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
                ctx.drawImage(fotoSubidaIA, 0, 0, canvasOverlay.width, canvasOverlay.height);
                ctx.restore();

                if (armazonActivoIA) {
                    dibujarArmazonEnRostro(ctx, canvasOverlay.width, canvasOverlay.height, landmarksFotoSubidaIA, armazonActivoIA, escala, offsetY, false);
                }
                rafIA = requestAnimationFrame(bucleIA);
                return;
            }

            if (!streamIA) return;
            canvasOverlay.width = video.videoWidth || 640;
            canvasOverlay.height = video.videoHeight || 480;
            ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

            if (faceMeshIA && video.readyState >= 2) {
                try { await faceMeshIA.send({ image: video }); } catch (e) {}
            }

            if (ultimosLandmarksIA && armazonActivoIA) {
                dibujarArmazonEnRostro(ctx, canvasOverlay.width, canvasOverlay.height, ultimosLandmarksIA, armazonActivoIA, escala, offsetY, true);
            } else if (armazonActivoIA) {
                dibujarArmazonCentradoFallback(ctx, canvasOverlay.width, canvasOverlay.height, armazonActivoIA, escala, offsetY);
            }

            rafIA = requestAnimationFrame(bucleIA);
        }
        bucleIA();
    }

    async function encenderCamaraIA() {
        fotoSubidaIA = null;
        landmarksFotoSubidaIA = null;
        video.style.display = 'block';
        btnVolverCamara?.classList.add('oculto');

        if (streamIA) return true;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarAlertaIA('Tu navegador no permite acceso directo a cámara. Puedes usar el botón "Subir foto de mi rostro".');
            return false;
        }
        try {
            streamIA = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            video.srcObject = streamIA;
            await video.play();

            if (statusTexto) statusTexto.innerText = 'Cámara activa';
            if (statusDot) statusDot.classList.add('activo');
            if (btnActivarCamara) btnActivarCamara.style.display = 'none';
            if (alertaIA) alertaIA.classList.add('oculto');

            if (typeof FaceMesh !== 'undefined' && !faceMeshIA) {
                faceMeshIA = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
                faceMeshIA.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.55,
                    minTrackingConfidence: 0.55
                });
                faceMeshIA.onResults((res) => {
                    ultimosLandmarksIA = (res.multiFaceLandmarks && res.multiFaceLandmarks[0]) || null;
                });
            }

            iniciarBucleRenderIA();
            return true;
        } catch (err) {
            mostrarAlertaIA('Permite el acceso a tu cámara o sube una fotografía de tu rostro para recibir tu recomendación.');
            return false;
        }
    }

    if (btnSubirFoto && inputSubirFoto) {
        btnSubirFoto.addEventListener('click', () => inputSubirFoto.click());

        inputSubirFoto.addEventListener('change', async (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return;

            const textoOriginal = btnSubirFoto.innerHTML;
            btnSubirFoto.disabled = true;
            btnSubirFoto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando rostro...';

            const validacion = await validarFotoRostroBiometrica(archivo);
            btnSubirFoto.disabled = false;
            btnSubirFoto.innerHTML = textoOriginal;

            if (!validacion.valido) {
                mostrarAlertaIA(validacion.motivo);
                inputSubirFoto.value = '';
                return;
            }

            if (streamIA) {
                streamIA.getTracks().forEach(t => t.stop());
                streamIA = null;
            }

            video.style.display = 'none';
            fotoSubidaIA = validacion.img;
            landmarksFotoSubidaIA = validacion.landmarks;
            if (alertaIA) alertaIA.classList.add('oculto');
            if (statusTexto) statusTexto.innerText = 'Foto verificada con IA';
            if (statusDot) statusDot.classList.add('activo');
            btnVolverCamara?.classList.remove('oculto');

            iniciarBucleRenderIA();
        });
    }

    btnVolverCamara?.addEventListener('click', encenderCamaraIA);
    btnActivarCamara?.addEventListener('click', encenderCamaraIA);

    selectCatalogo?.addEventListener('change', async () => {
        if (!selectCatalogo.value) return;
        const [nombre, ruta] = selectCatalogo.value.split('|');
        if (!fotoSubidaIA && !streamIA) {
            await encenderCamaraIA();
        }
        await seleccionarArmazonEnVivoIA(nombre, ruta);
    });

    async function calcularYMostrarDiagnostico(muestras) {
        const promLargo = muestras.reduce((a, b) => a + b.ratioLargoAncho, 0) / muestras.length;
        const promFrenteMand = muestras.reduce((a, b) => a + b.ratioFrenteMandibula, 0) / muestras.length;
        const promPomuloMand = muestras.reduce((a, b) => a + b.ratioPomuloMandibula, 0) / muestras.length;

        let tipoRostro = 'Ovalado';
        let explicacion = 'Tus proporciones faciales son equilibradas. Te favorecen los armazones rectangulares, geométricos y contemporáneos que realzan tu mirada.';
        let recomendados = ['ziGO Focus', 'ziGO Kinetic', 'ziGO Bold'];

        if (promLargo > 1.48) {
            tipoRostro = 'Alargado / Rectangular';
            explicacion = 'Tu rostro presenta mayor longitud vertical. Te recomendamos armazones redondeados, ovalados o de puente marcado para equilibrar visualmente las proporciones.';
            recomendados = ['ziGO Metro', 'ziGO Sport', 'ziGO Urban'];
        } else if (promLargo < 1.24 && promPomuloMand > 1.12) {
            tipoRostro = 'Redondo';
            explicacion = 'Tus líneas faciales son suaves y simétricas. Los armazones cuadrados y rectangulares aportan ángulos definidos y estilizan tus facciones.';
            recomendados = ['ziGO Edge', 'ziGO Focus', 'ziGO Bold'];
        } else if (promFrenteMand > 1.16) {
            tipoRostro = 'Corazón / Triangular';
            explicacion = 'Tu frente es ligeramente más amplia que la línea mandibular. Los diseños minimalistas, aviador o ligeros armonizan el tercio inferior.';
            recomendados = ['ziGO Nova', 'ziGO Urban', 'ziGO Kinetic'];
        } else if (promPomuloMand < 1.07 && promLargo <= 1.36) {
            tipoRostro = 'Cuadrado';
            explicacion = 'Posees una mandíbula definida y estructurada. Los armazones ovalados y redondeados suavizan los ángulos y aportan armonía.';
            recomendados = ['ziGO Metro', 'ziGO Sport', 'ziGO Nova'];
        }

        document.getElementById('ia-tipo-rostro').innerText = tipoRostro;
        document.getElementById('ia-explicacion-rostro').innerText = explicacion;

        const listaObjetosRec = recomendados.map(nom => CATALOGO_ARMAZONES.find(c => c.nombre === nom)).filter(Boolean);
        const contenedorBotones = document.getElementById('contenedor-botones-recomendados');

        // Procesar miniaturas limpias sobre pedestal blanco para que luzcan en el panel derecho
        const tarjetasMini = await Promise.all(listaObjetosRec.map(async (arm, idx) => {
            const proc = await obtenerArmazonProcesado(arm.archivo);
            let srcMini = `${RUTA_BASE}${arm.archivo}`;
            if (proc && proc.canvasCatalogo && proc.canvasCatalogo.toDataURL) {
                try { srcMini = proc.canvasCatalogo.toDataURL('image/png'); } catch (e) {}
            }
            return `
                <button type="button" class="btn-modelo-lente ${idx === 0 ? 'activo' : ''}" data-nombre="${arm.nombre}" data-ruta="${arm.archivo}">
                    ${idx === 0 ? '<span class="badge-top-rec">#1 IDEAL</span>' : '<span style="font-size:9px;opacity:0.85;">OPCIÓN ' + (idx + 1) + '</span>'}
                    <img src="${srcMini}" alt="${arm.nombre}">
                    <span>${arm.nombre}</span>
                </button>
            `;
        }));

        contenedorBotones.innerHTML = tarjetasMini.join('');

        contenedorBotones.querySelectorAll('.btn-modelo-lente').forEach(btn => {
            btn.addEventListener('click', () => {
                seleccionarArmazonEnVivoIA(btn.getAttribute('data-nombre'), btn.getAttribute('data-ruta'));
            });
        });

        panelResultado.classList.remove('oculto');
        if (listaObjetosRec[0]) {
            seleccionarArmazonEnVivoIA(listaObjetosRec[0].nombre, listaObjetosRec[0].archivo);
        }
    }

    function extraerMetricasLandmarks(lm) {
        const anchoPomulos = Math.hypot(lm[454].x - lm[234].x, lm[454].y - lm[234].y);
        const altoRostro = Math.hypot(lm[152].x - lm[10].x, lm[152].y - lm[10].y);
        const anchoFrente = Math.hypot(lm[284].x - lm[54].x, lm[284].y - lm[54].y);
        const anchoMandibula = Math.hypot(lm[288].x - lm[58].x, lm[288].y - lm[58].y);
        return {
            ratioLargoAncho: altoRostro / (anchoPomulos || 1),
            ratioFrenteMandibula: anchoFrente / (anchoMandibula || 1),
            ratioPomuloMandibula: anchoPomulos / (anchoMandibula || 1)
        };
    }

    btnEscanear.addEventListener('click', async () => {
        if (fotoSubidaIA && landmarksFotoSubidaIA) {
            await calcularYMostrarDiagnostico([extraerMetricasLandmarks(landmarksFotoSubidaIA)]);
            return;
        }

        const camaraLista = await encenderCamaraIA();
        if (!camaraLista) return;

        btnEscanear.disabled = true;
        btnEscanear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Midiendo proporciones faciales...';
        if (alertaIA) alertaIA.classList.add('oculto');

        const muestras = [];
        const recolector = setInterval(() => {
            if (ultimosLandmarksIA) {
                muestras.push(extraerMetricasLandmarks(ultimosLandmarksIA));
            }
        }, 120);

        setTimeout(async () => {
            clearInterval(recolector);
            btnEscanear.disabled = false;
            btnEscanear.innerHTML = '<i class="fas fa-magic"></i> Volver a Analizar Rostro';

            if (muestras.length < 3) {
                panelResultado.classList.add('oculto');
                mostrarAlertaIA('No se detectó un rostro claro frente a la cámara. Asegúrate de tener buena iluminación o sube una foto frontal.');
                return;
            }

            await calcularYMostrarDiagnostico(muestras);
        }, 1800);
    });

    btnCaptura?.addEventListener('click', () => {
        if (!streamIA && !fotoSubidaIA) {
            mostrarAlertaIA('Enciende la cámara o sube una foto primero para guardar tu prueba.');
            return;
        }
        const c = document.createElement('canvas');
        c.width = canvasOverlay.width || 640;
        c.height = canvasOverlay.height || 480;
        const ctx = c.getContext('2d');

        if (streamIA && !fotoSubidaIA) {
            const brillo = sliderBrillo?.value || '100';
            const contraste = sliderContraste?.value || '100';
            ctx.save();
            ctx.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
            ctx.translate(c.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, c.width, c.height);
            ctx.restore();
        }

        ctx.drawImage(canvasOverlay, 0, 0, c.width, c.height);

        const a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = 'ziGO-Recomendacion-IA.png';
        a.click();
    });

    window.addEventListener('beforeunload', () => {
        if (rafIA) cancelAnimationFrame(rafIA);
        if (streamIA) streamIA.getTracks().forEach(t => t.stop());
    });
}


/*============================================================
    10. PÁGINA AGENDA: MASCOTA ziGO + SITIO VS DOMICILIO CONDICIONAL
============================================================*/
function inicializarAgenda() {
    const inlineContainer = document.getElementById('inline-container');
    if (!inlineContainer) return;

    // Reemplazar el ícono del ojo por la mascota ziGO del <head>
    const avatarOptica = document.querySelector('.avatar-optica');
    if (avatarOptica) {
        const iconoHead = document.querySelector('link[rel*="icon"]')?.getAttribute('href') || '../img/favicon.png';
        avatarOptica.innerHTML = `<img src="${iconoHead}" alt="Mascota ziGO">`;
    }

    document.querySelectorAll('.accesos-previos-agenda a').forEach(btn => {
        btn.classList.add('btn-acceso-agenda-unificado');
    });

    const parametrosURL = new URLSearchParams(window.location.search);
    const armazonesURL = parametrosURL.get('armazones') ? decodeURIComponent(parametrosURL.get('armazones')) : '';

    let modalidadSeleccionada = 'En Sitio / Consultorio (Entre semana)';
    let enlaceGoogleMaps = '';
    let direccionDetectada = '';
    let mapaInstancia = null;

    const resumenDiv = document.getElementById('resumen-datos-cita');
    const btnCopiar = document.getElementById('btn-copiar-armazones');
    const notasAyuda = document.querySelector('.notas-ayuda');

    if (notasAyuda) {
        notasAyuda.innerHTML = 'Al seleccionar fecha, hora y pulsar <strong>Siguiente</strong>, toda tu ubicación y armazones aparecerán cargados automáticamente.';
    }

    const controlesDomicilio = document.querySelector('.controles-mapa-agenda');
    const mapaBox = document.getElementById('mapa-ubicacion-agenda');
    const textoCoords = document.getElementById('texto-coordenadas-elegidas');
    const bloqueUbicacion = controlesDomicilio ? controlesDomicilio.closest('.bloque-config-cita') : null;
    const tituloUbicacion = bloqueUbicacion ? bloqueUbicacion.querySelector('h3') : null;

    // Garantizar que el mapa y las coordenadas queden dentro de controlesDomicilio para ocultarlos en modo Sitio
    if (controlesDomicilio) {
        if (mapaBox && !controlesDomicilio.contains(mapaBox)) controlesDomicilio.appendChild(mapaBox);
        if (textoCoords && !controlesDomicilio.contains(textoCoords)) controlesDomicilio.appendChild(textoCoords);
    }

    let tarjetaSitio = document.getElementById('tarjeta-direccion-sitio-zigo');
    if (bloqueUbicacion && !tarjetaSitio) {
        tarjetaSitio = document.createElement('div');
        tarjetaSitio.id = 'tarjeta-direccion-sitio-zigo';
        tarjetaSitio.className = 'tarjeta-direccion-sitio';
        tarjetaSitio.innerHTML = `
            <strong><i class="fas fa-store-alt"></i> Dirección del Consultorio ziGO:</strong>
            <div style="margin-top:4px;">${CONFIG_ZIGO.direccionSitioZigo}</div>
            <div style="font-size:11px; opacity:0.85; margin-top:6px;">(Si deseas consulta en tu hogar, selecciona arriba <strong>"A Domicilio"</strong> para ingresar tu dirección).</div>
        `;
        bloqueUbicacion.insertBefore(tarjetaSitio, controlesDomicilio);
    }

    function actualizarVistaModalidad() {
        const esDomicilio = modalidadSeleccionada.toLowerCase().includes('domicilio');
        if (tituloUbicacion) {
            tituloUbicacion.innerHTML = esDomicilio
                ? '<i class="fas fa-map-marker-alt"></i> 2. Tu Ubicación para Visita a Domicilio'
                : '<i class="fas fa-clinic-medical"></i> 2. Ubicación de Atención en Sitio';
        }
        if (tarjetaSitio) tarjetaSitio.classList.toggle('oculto', esDomicilio);
        if (controlesDomicilio) {
            controlesDomicilio.classList.toggle('oculto', !esDomicilio);
            if (esDomicilio && mapaInstancia) {
                setTimeout(() => mapaInstancia.invalidateSize(), 200);
            }
        }
    }

    function construirTextoResumen() {
        const esDomicilio = modalidadSeleccionada.toLowerCase().includes('domicilio');
        const partes = [`Modalidad: ${modalidadSeleccionada}`];
        if (armazonesURL) partes.push(`Armazones: ${armazonesURL}`);
        if (esDomicilio) {
            if (direccionDetectada) partes.push(`Dirección Domicilio: ${direccionDetectada}`);
            if (enlaceGoogleMaps) partes.push(`Maps: ${enlaceGoogleMaps}`);
        } else {
            partes.push(`Lugar: ${CONFIG_ZIGO.direccionSitioZigo}`);
        }
        return partes.join(' | ');
    }

    function cargarZohoConDatosPrellenados() {
        if (typeof Bookings === 'undefined') return;
        const resumen = construirTextoResumen();
        const encResumen = encodeURIComponent(resumen);
        const encArmazones = encodeURIComponent(armazonesURL || 'Por definir en consulta');

        const zohoUrl = `https://zigo1.zohobookings.com/portal-embed#/5013970000000035045?Notas%20o%20armazones%20de%20inter%C3%A9s=${encResumen}&Notas=${encResumen}&armazones=${encArmazones}`;

        inlineContainer.innerHTML = '';
        Bookings.inlineEmbed({
            url: zohoUrl,
            parent: '#inline-container',
            height: '780px'
        });
        setTimeout(ajustarCalendarioMovilEstrecho, 700);
    }

    function actualizarResumenVisual(recargarCalendario = true) {
        const esDomicilio = modalidadSeleccionada.toLowerCase().includes('domicilio');
        if (resumenDiv) {
            let html = `<div><strong>Modalidad:</strong> ${modalidadSeleccionada}</div>`;
            if (armazonesURL) {
                html += `<div><strong>Armazones:</strong> ${armazonesURL}</div>`;
            }
            if (esDomicilio) {
                if (direccionDetectada) {
                    html += `<div><strong>Dirección Domicilio:</strong> ${direccionDetectada}</div>`;
                }
                if (enlaceGoogleMaps) {
                    html += `<div><strong>Google Maps:</strong> <a href="${enlaceGoogleMaps}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;font-weight:bold;">Abrir pin exacto</a></div>`;
                }
            } else {
                html += `<div><strong>Punto de atención:</strong> ${CONFIG_ZIGO.direccionSitioZigo}</div>`;
            }
            resumenDiv.innerHTML = html;
        }

        if (recargarCalendario) {
            cargarZohoConDatosPrellenados();
        }
    }

    document.querySelectorAll('input[name="modalidad-cita"]').forEach(radio => {
        radio.addEventListener('change', () => {
            modalidadSeleccionada = radio.value;
            actualizarVistaModalidad();
            actualizarResumenVisual(true);
        });
    });

    if (mapaBox && typeof L !== 'undefined') {
        const cdmxCentro = [19.4326, -99.1332];
        const mapa = L.map('mapa-ubicacion-agenda').setView(cdmxCentro, 12);
        mapaInstancia = mapa;

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; OpenStreetMap &copy; Esri',
            maxZoom: 19
        }).addTo(mapa);

        let marcador = null;

        async function fijarPuntoMapa(lat, lng, etiqueta = '', precisionMetros = null) {
            if (marcador) mapa.removeLayer(marcador);

            marcador = L.marker([lat, lng], { draggable: true }).addTo(mapa);
            marcador.on('dragend', () => {
                const pos = marcador.getLatLng();
                fijarPuntoMapa(pos.lat, pos.lng, '(Pin ajustado)');
            });

            mapa.setView([lat, lng], 16);
            enlaceGoogleMaps = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await resp.json();
                if (data && data.display_name) {
                    direccionDetectada = data.display_name.split(',').slice(0, 3).join(',');
                    const inputDir = document.getElementById('input-buscar-direccion');
                    if (inputDir) inputDir.value = direccionDetectada;
                }
            } catch (e) {
                direccionDetectada = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }

            if (textoCoords) {
                const notaAjuste = (precisionMetros && precisionMetros > 300)
                    ? ' <span style="color:#38bdf8;">(Arrastra el pin azul o escribe tu calle y número exactos arriba si deseas afinarlo)</span>'
                    : '';
                textoCoords.innerHTML = `<i class="fas fa-check-circle" style="color:var(--neon-cyan);"></i> Ubicación lista ${etiqueta}: <strong>${direccionDetectada || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</strong>${notaAjuste}`;
            }

            actualizarResumenVisual(true);
        }

        mapa.on('click', (e) => {
            fijarPuntoMapa(e.latlng.lat, e.latlng.lng, '(Pin en mapa)');
        });

        const btnMiUbicacion = document.getElementById('btn-mi-ubicacion');
        if (btnMiUbicacion) {
            btnMiUbicacion.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    alert('Tu dispositivo no soporta geolocalización GPS.');
                    return;
                }
                const textoOriginal = btnMiUbicacion.innerHTML;
                btnMiUbicacion.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calibrando GPS...';

                let mejorLectura = null;
                const watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        if (!mejorLectura || pos.coords.accuracy < mejorLectura.coords.accuracy) {
                            mejorLectura = pos;
                        }
                        if (pos.coords.accuracy <= 60) {
                            navigator.geolocation.clearWatch(watchId);
                            btnMiUbicacion.innerHTML = textoOriginal;
                            fijarPuntoMapa(pos.coords.latitude, pos.coords.longitude, `(GPS ±${Math.round(pos.coords.accuracy)}m)`, pos.coords.accuracy);
                        }
                    },
                    () => {
                        navigator.geolocation.clearWatch(watchId);
                        btnMiUbicacion.innerHTML = textoOriginal;
                        alert('No se pudo obtener el GPS automático. Escribe tu calle y número en el cuadro de arriba o toca tu casa en el mapa.');
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );

                setTimeout(() => {
                    navigator.geolocation.clearWatch(watchId);
                    if (mejorLectura) {
                        btnMiUbicacion.innerHTML = textoOriginal;
                        const { latitude, longitude, accuracy } = mejorLectura.coords;
                        fijarPuntoMapa(latitude, longitude, `(GPS ±${Math.round(accuracy)}m)`, accuracy);
                    }
                }, 3500);
            });
        }

        const btnBuscarDir = document.getElementById('btn-buscar-direccion');
        const inputDir = document.getElementById('input-buscar-direccion');
        if (btnBuscarDir && inputDir) {
            const buscarEnMapa = async () => {
                const q = inputDir.value.trim();
                if (!q) return;
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Ciudad de México')}&limit=1`);
                    const datos = await resp.json();
                    if (datos && datos[0]) {
                        fijarPuntoMapa(parseFloat(datos[0].lat), parseFloat(datos[0].lon), '(Dirección ingresada)');
                    } else {
                        alert('No encontramos esa calle exacta. Escribe tu colonia o haz clic directo en tu calle en el mapa.');
                    }
                } catch (e) {}
            };
            btnBuscarDir.addEventListener('click', buscarEnMapa);
            inputDir.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarEnMapa();
                }
            });
        }
    }

    if (btnCopiar) {
        btnCopiar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar datos en calendario';
        btnCopiar.addEventListener('click', () => {
            actualizarResumenVisual(true);
            const orig = btnCopiar.innerHTML;
            btnCopiar.innerHTML = '<i class="fas fa-check"></i> ¡Datos listos para Siguiente!';
            setTimeout(() => { btnCopiar.innerHTML = orig; }, 2200);
        });
    }

    actualizarVistaModalidad();
    actualizarResumenVisual(true);
}


/*============================================================
    11. PÁGINA NOSOTROS: BUZÓN DE QUEJAS DIRECTO A ÁNGEL Y MIGUEL
============================================================*/
function inicializarBuzonQuejas() {
    const formQuejas = document.getElementById('form-quejas-zigo');
    const respuesta = document.getElementById('respuesta-queja');
    if (!formQuejas) return;

    formQuejas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = formQuejas.querySelector('button[type="submit"]');
        const nombre = (document.getElementById('queja-nombre')?.value || '').trim() || 'Paciente Anónimo';
        const tipo = document.getElementById('queja-tipo')?.value || 'Comentario / Queja';
        const mensaje = (document.getElementById('queja-mensaje')?.value || '').trim();
        const folio = `ZIGO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const textoOriginalBtn = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando reporte por correo...';
        }

        let enviadoPorCorreo = false;
        try {
            const resp = await fetch(`https://formsubmit.co/ajax/${CONFIG_ZIGO.correoQuejasPrincipal}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `[${folio}] ${tipo} - Buzón de Calidad ziGO`,
                    _cc: CONFIG_ZIGO.correoQuejasCopia,
                    _template: 'table',
                    Folio: folio,
                    Tipo: tipo,
                    Paciente: nombre,
                    Mensaje: mensaje
                })
            });
            enviadoPorCorreo = resp.ok;
        } catch (err) {}

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
        }

        const textoFormateado = `Folio: ${folio}\nTipo: ${tipo}\nPaciente: ${nombre}\nMensaje: ${mensaje}`;
        const urlMail = `mailto:${CONFIG_ZIGO.correoQuejasPrincipal}?cc=${CONFIG_ZIGO.correoQuejasCopia}&subject=${encodeURIComponent(`[${folio}] ${tipo} - ziGO`)}&body=${encodeURIComponent(textoFormateado)}`;

        formQuejas.reset();

        if (respuesta) {
            respuesta.innerHTML = enviadoPorCorreo
                ? `<div><i class="fas fa-check-circle" style="color:var(--neon-cyan);"></i> <strong>Reporte enviado correctamente (Folio ${folio}).</strong> Tu mensaje fue canalizado al área de Calidad y Atención ziGO para darle seguimiento oportuno.</div>`
                : `<div style="display:flex; flex-direction:column; gap:10px;">
                    <div><i class="fas fa-check-circle" style="color:var(--neon-cyan);"></i> <strong>Folio generado: ${folio}.</strong> Haz clic abajo para completar el envío directo desde tu correo:</div>
                    <div>
                        <a href="${urlMail}" class="boton-agenda" style="font-size:12px; padding:9px 16px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fas fa-envelope"></i> Enviar reporte por Correo
                        </a>
                    </div>
                   </div>`;
            respuesta.classList.remove('oculto');
        }
    });
}


/*============================================================
    12. ADAPTACIÓN RESPONSIVA CALENDARIO ZOHO (< 400PX)
============================================================*/
function ajustarCalendarioMovilEstrecho() {
    const contenedor = document.getElementById('inline-container');
    if (!contenedor) return;

    const anchoPantalla = window.innerWidth;
    const iframe = contenedor.querySelector('iframe');
    if (!iframe) return;

    if (anchoPantalla < 400) {
        const anchoMinimoZoho = 390;
        const factorEscala = Math.max(0.76, (anchoPantalla - 20) / anchoMinimoZoho);
        iframe.style.width = `${anchoMinimoZoho}px`;
        iframe.style.transformOrigin = 'top left';
        iframe.style.transform = `scale(${factorEscala})`;
    } else {
        iframe.style.width = '100%';
        iframe.style.transform = 'none';
    }
}


/*============================================================
    INICIALIZACIÓN GLOBAL DEL SISTEMA
============================================================*/
document.addEventListener('DOMContentLoaded', () => {
    prepararIdentidadEInclusionDOM();
    inicializarBuscadorInterno();
    inicializarAccesibilidadYWidgets();
    inicializarTestimonios5Estrellas();
    adaptarImagenesIndexATema();
    limpiarFondosCatalogoTarjetas();

    document.querySelectorAll('.seleccionar-armazon').forEach(box => {
        box.addEventListener('change', actualizarContador);
    });
    actualizarContador();
    inicializarFiltros();
    inicializarAsistenteIA();
    inicializarBuzonQuejas();
});

window.addEventListener('load', () => {
    inicializarAgenda();
    setTimeout(ajustarCalendarioMovilEstrecho, 800);
});

window.addEventListener('resize', ajustarCalendarioMovilEstrecho);
window.addEventListener('pageshow', actualizarContador);