/**
***********************************************************************
    Motor Integral Unificado ziGO - Versión Producción v3.0
    - Unificado 100% en un solo archivo (Catálogo, AR, IA, Agenda, Admin)
    - Sincronización en la nube vía Google Apps Script + respaldo local
    - Modales Detalles y Probador AR corregidos en armazones.html
    - Botones flotantes con respuesta inmediata a 1 clic / 1 toque
    - Autorización por Token de 6 dígitos en Admin (CSV y Reinicio)
***********************************************************************
 */
'use strict';

/*============================================================
    0. CONFIGURACIÓN GLOBAL, CATÁLOGO Y GOOGLE APPS SCRIPT
============================================================*/
const CONFIG_ZIGO = {
    nombreNegocio: 'ziGO Óptica & Salud Visual',
    sitioWeb: 'https://zigomx.com',
    whatsappEscarlet: '5215573839561',
    telegramUsuario: '+525573839561',
    telefonoEscarlet: '55 7383 9561',
    correoEscarlet: 'skar@zigomx.com',
    correoQuejasPrincipal: 'angel.rochab@zigomx.com',
    correoQuejasCopia: 'miguel.rochab@zigomx.com',
    direccionSitioZigo: 'Consultorio ziGO · Ciudad de México (Dirección exacta confirmada al reservar cita)',
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbyoobdgG1Nvka_TFuRwsITOcuiWP3VSSHf5lBZ4azulikxjhdABsKCkGW_rj70uKmR9vQ/exec',
    ga4MeasurementId: ''
};

const RUTA_BASE = window.location.pathname.includes('/pages/') ? '../' : './';

const CATALOGO_ARMAZONES = [
    { id: 'zigo-focus', nombre: 'ziGO Focus', archivo: 'img/armazones/1.jpeg', forma: 'Rectangular', material: 'Acetato Premium', categoria: 'premium', descripcion: 'Diseño ergonómico rectangular ideal para uso diario y graduaciones versátiles.' },
    { id: 'zigo-kinetic', nombre: 'ziGO Kinetic', archivo: 'img/armazones/2.avif', forma: 'Geométrico', material: 'Titanio Ligero', categoria: 'premium', descripcion: 'Estructura ultrafina y flexible de alta gama que aporta ligereza y elegancia.' },
    { id: 'zigo-metro', nombre: 'ziGO Metro', archivo: 'img/armazones/3.jpeg', forma: 'Redondeado', material: 'Acetato Urbano', categoria: 'urbano', descripcion: 'Estilo moderno con líneas suaves que equilibran facciones angulares.' },
    { id: 'zigo-edge', nombre: 'ziGO Edge', archivo: 'img/armazones/4.avif', forma: 'Cuadrado', material: 'Polímero Resistente', categoria: 'deportivo', descripcion: 'Máxima resistencia a impactos, ajuste firme y estructura cuadrada definida.' },
    { id: 'zigo-urban', nombre: 'ziGO Urban', archivo: 'img/armazones/5.webp', forma: 'Aviador', material: 'Aleación Metálica', categoria: 'urbano', descripcion: 'Perfil delgado, sofisticado y ligero con puente doble estilizado.' },
    { id: 'zigo-sport', nombre: 'ziGO Sport', archivo: 'img/armazones/6.webp', forma: 'Ovalado', material: 'TR90 Flexible', categoria: 'deportivo', descripcion: 'Diseño aerodinámico y antideslizante para movimiento constante.' },
    { id: 'zigo-nova', nombre: 'ziGO Nova', archivo: 'img/armazones/7.jpeg', forma: 'Minimalista', material: 'Diseño Minimalista', categoria: 'urbano', descripcion: 'Apariencia limpia y ligera que resalta la expresión natural del rostro.' },
    { id: 'zigo-flex', nombre: 'ziGO Flex', archivo: 'img/armazones/8.webp', forma: 'Rectangular', material: 'Bisagra Reforzada', categoria: 'deportivo', descripcion: 'Sistema de alta durabilidad en varillas con adaptación anatómica.' },
    { id: 'zigo-bold', nombre: 'ziGO Bold', archivo: 'img/armazones/9.avif', forma: 'Cuadrado', material: 'Estilo Contemporáneo', categoria: 'urbano', descripcion: 'Armazón con presencia imponente y equilibrio geométrico.' }
];

/*============================================================
    UTILIDADES GLOBALES DE SEGURIDAD Y ENLACES
============================================================*/
function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function construirUrlWhatsApp(mensaje) {
    return `https://wa.me/${CONFIG_ZIGO.whatsappEscarlet}?text=${encodeURIComponent(mensaje)}`;
}

function construirUrlTelegram(mensaje) {
    const usuario = CONFIG_ZIGO.telegramUsuario.trim();
    if (usuario.startsWith('+')) return `https://t.me/${usuario}`;
    const limpio = usuario.replace(/^@/, '');
    return `https://t.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}

function resolverRutaSegura(ruta) {
    if (!ruta) return '';
    if (ruta.startsWith('http') || ruta.startsWith('data:') || ruta.startsWith('blob:')) return ruta;
    const limpia = ruta.replace(/^(\.\.\/|\.\/)+/, '');
    return `${RUTA_BASE}${limpia}`;
}

/*============================================================
    1. TELEMETRÍA Y BASE DE DATOS EN LA NUBE (APPS SCRIPT + LOCAL)
============================================================*/
const ZigoAnalytics = (function () {
    const STORAGE_KEY = 'zigo_analytics_v1';
    const ADMIN_KEY = 'zigo_admin_stats';
    const SESSION_KEY = 'zigo_session_activa';

    function obtenerEstadoInicial() {
        return {
            inicioRegistro: new Date().toISOString(),
            sesiones: 0,
            visitasPagina: {},
            fuentesTrafico: { Google: 0, RedesSociales: 0, Directo: 0 },
            busquedas: [],
            busquedasSinResultado: {},
            armazonesProbadosAR: {},
            rostrosDetectadosIA: {},
            modalidadesCita: {},
            conversiones: {
                whatsapp: 0,
                telegram: 0,
                llamada: 0,
                buzonQuejas: 0,
                capturasAR: 0
            },
            calificaciones: [],
            ultimosEventos: []
        };
    }

    function cargarDatos() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const adminRaw = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
            const base = obtenerEstadoInicial();

            const armazonesCombinados = {
                ...(raw.armazonesProbadosAR || {}),
                ...(adminRaw.modelosVistos || {})
            };

            const calificacionesCombinadas = Array.isArray(adminRaw.calificaciones) && adminRaw.calificaciones.length
                ? adminRaw.calificaciones
                : (raw.calificaciones || []);

            return {
                ...base,
                ...raw,
                fuentesTrafico: {
                    ...base.fuentesTrafico,
                    ...(raw.fuentesTrafico || raw.fuentesTráfico || {})
                },
                conversiones: {
                    ...base.conversiones,
                    ...(raw.conversiones || {})
                },
                armazonesProbadosAR: armazonesCombinados,
                calificaciones: calificacionesCombinadas
            };
        } catch (e) {
            return obtenerEstadoInicial();
        }
    }

    function guardarDatosLocales(datos) {
        try {
            if (datos.ultimosEventos.length > 80) datos.ultimosEventos = datos.ultimosEventos.slice(-80);
            if (datos.busquedas.length > 100) datos.busquedas = datos.busquedas.slice(-100);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));

            const adminMirror = {
                modelosVistos: datos.armazonesProbadosAR,
                calificaciones: datos.calificaciones,
                eventos: datos.ultimosEventos
            };
            localStorage.setItem(ADMIN_KEY, JSON.stringify(adminMirror));
        } catch (e) {}
    }

    // Envío asíncrono a Google Apps Script (sin bloquear la navegación ni fallar por CORS)
    function sincronizarConNube(accion, payload = {}) {
        const url = (CONFIG_ZIGO.googleScriptUrl || '').trim();
        if (!url) return;

        const cuerpo = JSON.stringify({
            action: accion,
            timestamp: new Date().toISOString(),
            page: window.location.pathname.split('/').pop() || 'index.html',
            ...payload
        });

        try {
            fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: cuerpo
            }).catch(() => {});
        } catch (e) {}
    }

    async function obtenerDatosDesdeNube() {
        const url = (CONFIG_ZIGO.googleScriptUrl || '').trim();
        if (!url) return null;
        try {
            const resp = await fetch(`${url}?action=getStats&t=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store'
            });
            if (!resp.ok) return null;
            const json = await resp.json();
            return json && typeof json === 'object' ? json : null;
        } catch (e) {
            return null;
        }
    }

    function enviarAGoogleAnalytics(nombreEvento, params = {}) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', nombreEvento, params);
        } else if (Array.isArray(window.dataLayer)) {
            window.dataLayer.push({ event: nombreEvento, ...params });
        }
    }

    function registrarEvento(tipo, detalle = '', meta = {}) {
        const datos = cargarDatos();
        datos.ultimosEventos.push({
            fecha: new Date().toISOString(),
            tipo,
            detalle
        });
        guardarDatosLocales(datos);
        enviarAGoogleAnalytics(tipo, { detalle, ...meta });
    }

    function registrarVistaPagina() {
        const datos = cargarDatos();
        let fuenteDetectada = '';

        if (!sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, '1');
            datos.sesiones = (datos.sesiones || 0) + 1;

            const ref = (document.referrer || '').toLowerCase();
            if (ref.includes('google.') || ref.includes('bing.') || ref.includes('yahoo.') || ref.includes('duckduckgo.')) {
                datos.fuentesTrafico.Google = (datos.fuentesTrafico.Google || 0) + 1;
                fuenteDetectada = 'Google';
            } else if (ref.includes('facebook.') || ref.includes('instagram.') || ref.includes('tiktok.') || ref.includes('t.co') || ref.includes('whatsapp.') || ref.includes('threads.')) {
                datos.fuentesTrafico.RedesSociales = (datos.fuentesTrafico.RedesSociales || 0) + 1;
                fuenteDetectada = 'RedesSociales';
            } else {
                datos.fuentesTrafico.Directo = (datos.fuentesTrafico.Directo || 0) + 1;
                fuenteDetectada = 'Directo';
            }
        }

        const ruta = window.location.pathname.split('/').pop() || 'index.html';
        datos.visitasPagina[ruta] = (datos.visitasPagina[ruta] || 0) + 1;
        guardarDatosLocales(datos);

        sincronizarConNube('page_view', {
            ruta,
            nuevaSesion: Boolean(fuenteDetectada),
            fuente: fuenteDetectada
        });
        enviarAGoogleAnalytics('page_view', { page_path: ruta });
    }

    function registrarBusqueda(termino, resultadosCount) {
        const limpio = (termino || '').trim().toLowerCase();
        if (!limpio) return;
        const datos = cargarDatos();
        datos.busquedas.push({ termino: limpio, resultados: resultadosCount, fecha: new Date().toISOString() });
        if (resultadosCount === 0) {
            datos.busquedasSinResultado[limpio] = (datos.busquedasSinResultado[limpio] || 0) + 1;
        }
        guardarDatosLocales(datos);
        sincronizarConNube('search', { termino: limpio, resultados: resultadosCount });
        enviarAGoogleAnalytics('search', { search_term: limpio, results_count: resultadosCount });
    }

    function registrarPruebaAR(nombreArmazon, origen = 'catalogo') {
        if (!nombreArmazon) return;
        const datos = cargarDatos();
        datos.armazonesProbadosAR[nombreArmazon] = (datos.armazonesProbadosAR[nombreArmazon] || 0) + 1;
        guardarDatosLocales(datos);
        registrarEvento('prueba_ar', `${nombreArmazon} (${origen})`, { armazon: nombreArmazon, origen });
        sincronizarConNube('prueba_ar', { armazon: nombreArmazon, origen });
    }

    function registrarRostroIA(tipoRostro) {
        if (!tipoRostro) return;
        const datos = cargarDatos();
        datos.rostrosDetectadosIA[tipoRostro] = (datos.rostrosDetectadosIA[tipoRostro] || 0) + 1;
        guardarDatosLocales(datos);
        registrarEvento('diagnostico_rostro_ia', tipoRostro, { tipo_rostro: tipoRostro });
        sincronizarConNube('rostro_ia', { tipoRostro });
    }

    function registrarModalidadCita(modalidad) {
        if (!modalidad) return;
        const datos = cargarDatos();
        datos.modalidadesCita[modalidad] = (datos.modalidadesCita[modalidad] || 0) + 1;
        guardarDatosLocales(datos);
        registrarEvento('seleccion_modalidad_cita', modalidad, { modalidad });
        sincronizarConNube('modalidad_cita', { modalidad });
    }

    function registrarConversion(canal, detalle = '') {
        const datos = cargarDatos();
        if (Object.prototype.hasOwnProperty.call(datos.conversiones, canal)) {
            datos.conversiones[canal] += 1;
        }
        guardarDatosLocales(datos);
        registrarEvento(`conversion_${canal}`, detalle, { canal });
        sincronizarConNube('conversion', { canal, detalle });
    }

    function registrarCalificacion(registro) {
        const datos = cargarDatos();
        const item = {
            score: Number(registro.score || 5),
            tipo: registro.tipo || 'Encuesta de Satisfacción',
            comentario: registro.comentario || '',
            nombre: registro.nombre || 'Visitante Web',
            fecha: new Date().toISOString()
        };
        datos.calificaciones.push(item);
        guardarDatosLocales(datos);
        sincronizarConNube('calificacion', item);
    }

    function limpiarDatosLocales() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ADMIN_KEY);
    }

    function inicializarGA4Opcional() {
        const id = (CONFIG_ZIGO.ga4MeasurementId || '').trim();
        if (!id || document.getElementById('script-ga4-zigo')) return;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', id, { anonymize_ip: true });
        const s = document.createElement('script');
        s.id = 'script-ga4-zigo';
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
        document.head.appendChild(s);
    }

    return {
        cargarDatos,
        obtenerDatosDesdeNube,
        sincronizarConNube,
        limpiarDatosLocales,
        inicializarGA4Opcional,
        registrarVistaPagina,
        registrarBusqueda,
        registrarPruebaAR,
        registrarRostroIA,
        registrarModalidadCita,
        registrarConversion,
        registrarCalificacion
    };
})();

/*============================================================
    2. SEO ESTRUCTURADO DINÁMICO (SCHEMA.ORG JSON-LD + ALT TAGS)
============================================================*/
function inicializarSEOEstructurado() {
    document.querySelectorAll('img').forEach((img) => {
        if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
            const src = img.getAttribute('src') || '';
            const nombreArchivo = src.split('/').pop()?.split('.')[0] || 'Óptica ziGO';
            img.setAttribute('alt', `${CONFIG_ZIGO.nombreNegocio} - ${nombreArchivo.replace(/[-_]/g, ' ')}`);
        }
    });

    if (document.getElementById('zigo-schema-jsonld')) return;

    const schemaData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': ['Optician', 'MedicalBusiness'],
                '@id': `${CONFIG_ZIGO.sitioWeb}/#optica`,
                name: CONFIG_ZIGO.nombreNegocio,
                url: CONFIG_ZIGO.sitioWeb,
                telephone: `+${CONFIG_ZIGO.whatsappEscarlet}`,
                email: CONFIG_ZIGO.correoEscarlet,
                priceRange: '$$',
                areaServed: { '@type': 'City', name: 'Ciudad de México' },
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: 'Ciudad de México',
                    addressRegion: 'CDMX',
                    addressCountry: 'MX'
                },
                medicalSpecialty: 'Optometry',
                founder: {
                    '@type': 'Person',
                    name: 'Dra. Escarlet Alcocer',
                    jobTitle: 'Especialista en Optometría'
                }
            }
        ]
    };

    const scriptLD = document.createElement('script');
    scriptLD.id = 'zigo-schema-jsonld';
    scriptLD.type = 'application/ld+json';
    scriptLD.textContent = JSON.stringify(schemaData);
    document.head.appendChild(scriptLD);
}

/*============================================================
    3. FONDO ESTELAR ZIGO (OPTIMIZADO CON PAUSA EN 2DO PLANO)
============================================================*/
(function () {
    const canvas = document.getElementById('zigo-starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colors = [
        { core: '#ffffff', glow: 'rgba(255, 255, 255, 0.85)' },
        { core: '#a5f3fc', glow: 'rgba(0, 229, 255, 0.85)' },
        { core: '#f5d0fe', glow: 'rgba(217, 70, 239, 0.80)' },
        { core: '#bbf7d0', glow: 'rgba(16, 185, 129, 0.75)' }
    ];

    let stars = [];
    let sparkles = [];
    let rafEstelar = null;
    const prefiereMenosMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initStars();
    }

    function initStars() {
        const area = canvas.width * canvas.height;
        const starCount = Math.min(200, Math.floor(area / 8000));
        const sparkleCount = Math.min(16, Math.floor(area / 100000));

        stars = Array.from({ length: starCount }, () => {
            const palette = colors[Math.floor(Math.random() * colors.length)];
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.4 + 0.4,
                palette,
                alpha: Math.random() * 0.6 + 0.25,
                speed: (Math.random() * 0.012 + 0.004) * (Math.random() < 0.5 ? 1 : -1)
            };
        });

        sparkles = Array.from({ length: sparkleCount }, () => {
            const palette = colors[Math.floor(Math.random() * 3)];
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 5 + 4,
                palette,
                alpha: Math.random() * 0.5 + 0.4,
                speed: (Math.random() * 0.01 + 0.003) * (Math.random() < 0.5 ? 1 : -1)
            };
        });
    }

    function drawSparkle(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = s.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.palette.glow;
        ctx.fillStyle = s.palette.core;
        ctx.beginPath();
        const outer = s.size;
        const inner = s.size * 0.18;
        for (let i = 0; i < 8; i++) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = (i * Math.PI) / 4;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function dibujarFotograma() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const st of stars) {
            if (!prefiereMenosMovimiento) {
                st.alpha += st.speed;
                if (st.alpha >= 0.9 || st.alpha <= 0.15) st.speed *= -1;
            }
            ctx.save();
            ctx.globalAlpha = st.alpha;
            ctx.shadowBlur = st.r > 1.2 ? 8 : 3;
            ctx.shadowColor = st.palette.glow;
            ctx.fillStyle = st.palette.core;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        for (const sp of sparkles) {
            if (!prefiereMenosMovimiento) {
                sp.alpha += sp.speed;
                if (sp.alpha >= 0.95 || sp.alpha <= 0.25) sp.speed *= -1;
            }
            drawSparkle(sp);
        }
    }

    function animate() {
        if (document.hidden) {
            rafEstelar = null;
            return;
        }
        dibujarFotograma();
        if (!prefiereMenosMovimiento) {
            rafEstelar = requestAnimationFrame(animate);
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !rafEstelar && !prefiereMenosMovimiento) animate();
    });

    window.addEventListener('resize', resize);
    resize();
    animate();
})();

/*============================================================
    4. EXTRACCIÓN ÓPTICA SIN FONDO (FLOOD-FILL + SOPORTE FILE://)
============================================================*/
const cacheArmazonesAR = {};

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

        const esPixelClaroFondo = (idx) => {
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            if (a < 30) return true;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            const diffBg = (Math.abs(r - rBg) + Math.abs(g - gBg) + Math.abs(b - bBg)) / 3;
            return (lum > 214 && sat < 26) || diffBg < 28;
        };

        const esFondo = new Uint8Array(w * h);
        const colaFondo = [];

        for (let x = 0; x < w; x++) colaFondo.push([x, 0], [x, h - 1]);
        for (let y = 0; y < h; y++) colaFondo.push([0, y], [w - 1, y]);

        const semillasMicas = [
            [Math.round(w * 0.28), Math.round(h * 0.52)],
            [Math.round(w * 0.72), Math.round(h * 0.52)]
        ];
        for (const [sx, sy] of semillasMicas) {
            if (sx >= 0 && sx < w && sy >= 0 && sy < h && esPixelClaroFondo((sy * w + sx) * 4)) {
                colaFondo.push([sx, sy]);
            }
        }

        while (colaFondo.length > 0) {
            const [cx, cy] = colaFondo.pop();
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            const pos = cy * w + cx;
            if (esFondo[pos]) continue;

            const idx = pos * 4;
            if (esPixelClaroFondo(idx)) {
                esFondo[pos] = 1;
                data[idx + 3] = 0;
                colaFondo.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
            }
        }

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const pos = y * w + x;
                if (esFondo[pos]) continue;
                const tocaFondo = esFondo[pos - 1] || esFondo[pos + 1] || esFondo[pos - w] || esFondo[pos + w];
                if (tocaFondo) {
                    const idx = pos * 4;
                    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    const sat = Math.max(data[idx], data[idx + 1], data[idx + 2]) - Math.min(data[idx], data[idx + 1], data[idx + 2]);
                    if (lum > 192 && sat < 24) {
                        const alphaSuave = Math.round(((214 - lum) / 22) * 255);
                        data[idx + 3] = Math.max(0, Math.min(255, alphaSuave));
                    }
                }
            }
        }

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

                if (grupo.length > mayorComponente.length) mayorComponente = grupo;
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

        const catW = Math.max(30, maxX - minX + 1);
        const catH = Math.max(15, maxY - minY + 1);
        const canvasCatalogo = document.createElement('canvas');
        canvasCatalogo.width = catW;
        canvasCatalogo.height = catH;
        canvasCatalogo.getContext('2d').drawImage(canvas, minX, minY, catW, catH, 0, 0, catW, catH);

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
    5. ADAPTACIÓN DE IMÁGENES DEL INDEX, DOM Y BOTÓN FOOTER STATS
============================================================*/
function adaptarImagenesIndexATema() {
    const esIndex = !window.location.pathname.includes('/pages/');
    if (!esIndex) return;

    document.querySelectorAll('.hero-imagen img, .contenido-tarjeta img').forEach((img) => {
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

function prepararIdentidadEInclusionDOM() {
    document.querySelectorAll('.skip-link, .saltar-contenido, a[href="#contenido-principal"], a[href="#main-content"]').forEach(el => {
        if (el.textContent.toLowerCase().includes('saltar') || el.classList.contains('skip-link')) {
            el.remove();
        }
    });

    const menuContenedor = document.querySelector('.contenedor-menu');
    if (menuContenedor && !document.getElementById('switch-tema-menu-izq')) {
        const switchIzq = document.createElement('div');
        switchIzq.id = 'switch-tema-menu-izq';
        switchIzq.className = 'switch-tema-menu-izq';
        switchIzq.setAttribute('role', 'group');
        switchIzq.setAttribute('aria-label', 'Cambiar modo oscuro o claro');
        switchIzq.innerHTML = `
            <button type="button" class="btn-switch-top" id="btn-top-oscuro" title="Activar Modo Oscuro">
                <i class="fas fa-moon" aria-hidden="true"></i> Oscuro
            </button>
            <button type="button" class="btn-switch-top" id="btn-top-claro" title="Activar Modo Claro">
                <i class="fas fa-sun" aria-hidden="true"></i> Claro
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

    // Botón de acceso directo al Panel de Estadísticas en el footer
    const footer = document.querySelector('footer');
    if (footer && !document.getElementById('btn-footer-stats-zigo')) {
        const contenedorBoton = document.createElement('div');
        contenedorBoton.style.cssText = 'text-align:center; padding:1rem 0 0; margin-top:1rem; width:100%; display:flex; justify-content:center;';
        const rutaAdmin = window.location.pathname.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
        contenedorBoton.innerHTML = `
            <a href="${rutaAdmin}" id="btn-footer-stats-zigo" style="background:#0b192c; color:#38bdf8; border:1px solid #1e3a5f; padding:0.55rem 1.3rem; border-radius:999px; font-weight:700; font-size:0.84rem; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                <i class="fas fa-chart-bar"></i> Estadísticas ziGO
            </a>
        `;
        footer.appendChild(contenedorBoton);
    }
}

/*============================================================
    6. BUSCADOR TOLERANTE A ERRORES
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
        probador: 'Recomendación Facial IA', rostro: 'Recomendación Facial IA',
        keja: 'Quejas y sugerencias', quejas: 'Quejas y sugerencias'
    };

    const indiceSitio = [
        { titulo: 'Inicio · Ciencia y Arte en tu Mirada', desc: 'Portada principal, examen de la vista, pupilentes y experiencias reales.', url: `${RUTA_BASE}index.html`, tags: 'inicio portada principal bienvenida pupilentes lentes contacto examen vista' },
        { titulo: 'Catálogo de Armazones y Probador AR', desc: 'Modelos en Acetato, Titanio, Urbano y Deportivo con probador virtual.', url: `${RUTA_BASE}pages/armazones.html`, tags: 'lentes armazones gafas catalogo modelo probar ar virtual acetato titanio' },
        { titulo: 'Recomendación Facial IA · Tu Lente Ideal', desc: 'Escanea tu rostro en vivo o sube una foto para descubrir qué lente te queda mejor.', url: `${RUTA_BASE}pages/probador.html`, tags: 'recomendacion ia asesor rostro cara ovalada redonda cuadrada foto camara' },
        { titulo: 'Agendar Examen de la Vista (Sitio o Domicilio)', desc: 'Elige fecha y hora con la Dra. Escarlet Alcocer en consultorio o a domicilio.', url: `${RUTA_BASE}pages/agenda.html`, tags: 'cita agendar examen vista horario domicilio consultorio ubicacion direccion mapa' },
        { titulo: 'Experiencias en Consulta', desc: 'Conoce paso a paso cómo es la atención clínica con nuestros pacientes.', url: `${RUTA_BASE}pages/experiencias.html`, tags: 'experiencias fotos pacientes consulta proceso testimonio' },
        { titulo: 'Nosotros · Dra. Escarlet Alcocer y Buzón de Quejas', desc: 'Conoce a nuestra especialista, misión, visión y buzón de quejas y sugerencias.', url: `${RUTA_BASE}pages/nosotros.html`, tags: 'nosotros mision vision valores doctora escarlet alcocer quejas sugerencias reclamo' },
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
        const consultaSegura = escaparHTML(consultaOriginal);

        let modalBusqueda = document.getElementById('modal-busqueda-global');
        if (!modalBusqueda) {
            modalBusqueda = document.createElement('div');
            modalBusqueda.id = 'modal-busqueda-global';
            modalBusqueda.className = 'modal-busqueda-overlay';
            document.body.appendChild(modalBusqueda);
        }

        const tokens = normalizarFonetico(consultaOriginal).split(' ');
        const sugerencias = tokens.map(t => diccionarioCorrecciones[t]).filter(Boolean);
        const sugerenciaUnica = escaparHTML([...new Set(sugerencias)].join(', '));

        const esContactoDirecto = coincideDifuso(consultaOriginal, 'marcar llamar telefono celular whatsapp wasap telegram contacto hablar numero mensaje correo');
        const esConsultaPrecioPromo = coincideDifuso(consultaOriginal, 'promo promocion costo precio cuanto cuesta vale descuento oferta cotizacion paquete barato');

        let bloquesHTML = '';
        if (sugerenciaUnica) {
            bloquesHTML += `<div class="sugerencia-ortografia-box"><i class="fas fa-magic"></i> ¿Quisiste decir: <strong>${sugerenciaUnica}</strong>? Aquí tienes las opciones relacionadas:</div>`;
        }

        const msgCita = 'Hola Dra. Escarlet, visité la página de ziGO y me gustaría agendar una cita o solicitar información de costos.';
        const urlWa = construirUrlWhatsApp(msgCita);
        const urlTg = construirUrlTelegram(msgCita);

        if (esContactoDirecto || esConsultaPrecioPromo) {
            bloquesHTML += `
                <div class="alerta-promo-escarlet" style="margin-top:10px;">
                    <strong><i class="fas fa-user-md"></i> Atención Directa · Dra. Escarlet Alcocer</strong>
                    <p>Para citas, costos personalizados y promociones vigentes comunícate directamente al <strong>${CONFIG_ZIGO.telefonoEscarlet}</strong>:</p>
                    <div class="acciones-promo-escarlet">
                        <a href="${urlWa}" data-canal="whatsapp" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-escarlet"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                        <a href="${urlTg}" data-canal="telegram" target="_blank" rel="noopener noreferrer" class="boton-agenda" style="font-size:13px;"><i class="fab fa-telegram"></i> Telegram</a>
                        <a href="tel:+${CONFIG_ZIGO.whatsappEscarlet}" data-canal="llamada" class="btn-detalles" style="background:#ffffff;color:#02102b;font-size:12px;"><i class="fas fa-phone"></i> Llamar</a>
                    </div>
                </div>
            `;
        }

        const coincidencias = indiceSitio.filter(item => coincideDifuso(consultaOriginal, `${item.titulo} ${item.desc} ${item.tags}`));
        ZigoAnalytics.registrarBusqueda(consultaOriginal, coincidencias.length);

        if (coincidencias.length > 0) {
            bloquesHTML += coincidencias.map(c => `
                <a href="${c.url}" class="item-resultado-busqueda">
                    <div>
                        <strong>${escaparHTML(c.titulo)}</strong>
                        <div style="font-size: 12px; opacity: 0.85; margin-top: 3px;">${escaparHTML(c.desc)}</div>
                    </div>
                    <i class="fas fa-arrow-right" style="color: var(--neon-cyan);"></i>
                </a>
            `).join('');
        } else if (!esContactoDirecto && !esConsultaPrecioPromo) {
            bloquesHTML += `
                <p style="font-size: 14px; margin-bottom: 6px;">No encontramos una coincidencia exacta para "<strong>${consultaSegura}</strong>", pero quizá buscabas:</p>
                <a href="${RUTA_BASE}pages/armazones.html" class="item-resultado-busqueda"><div><strong>Catálogo de Armazones y Probador AR</strong></div><i class="fas fa-glasses"></i></a>
                <a href="${RUTA_BASE}pages/agenda.html" class="item-resultado-busqueda"><div><strong>Agendar Examen de la Vista</strong></div><i class="fas fa-calendar-check"></i></a>
                <a href="${urlWa}" data-canal="whatsapp" target="_blank" rel="noopener noreferrer" class="item-resultado-busqueda"><div><strong>WhatsApp Escarlet (${CONFIG_ZIGO.telefonoEscarlet})</strong></div><i class="fab fa-whatsapp" style="color:#25D366;"></i></a>
            `;
        }

        modalBusqueda.innerHTML = `
            <div class="modal-busqueda-caja" role="dialog" aria-modal="true" aria-label="Resultados de búsqueda">
                <button type="button" class="modal-cerrar" id="cerrar-busqueda-modal" aria-label="Cerrar búsqueda">&times;</button>
                <h3 style="margin: 0;"><i class="fas fa-search"></i> Resultados para: "${consultaSegura}"</h3>
                <div class="lista-resultados-busqueda">${bloquesHTML}</div>
            </div>
        `;
        modalBusqueda.style.display = 'flex';
        document.getElementById('cerrar-busqueda-modal').onclick = () => { modalBusqueda.style.display = 'none'; };
        modalBusqueda.onclick = (e) => { if (e.target === modalBusqueda) modalBusqueda.style.display = 'none'; };
    }

    inputBuscador.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ejecutarBusqueda();
        }
    });
    btnLupa?.addEventListener('click', ejecutarBusqueda);
}

/*============================================================
    7. MODAL RÁPIDO DE QUEJAS + WIDGET DE SATISFACCIÓN (1 A 5 CARITAS)
============================================================*/
function abrirModalQuejasGlobal() {
    let modalQueja = document.getElementById('modal-quejas-rapido-zigo');
    if (!modalQueja) {
        modalQueja = document.createElement('div');
        modalQueja.id = 'modal-quejas-rapido-zigo';
        modalQueja.className = 'modal-busqueda-overlay';
        document.body.appendChild(modalQueja);
    }

    modalQueja.innerHTML = `
        <div class="modal-busqueda-caja" role="dialog" aria-modal="true" aria-label="Buzón de Quejas y Sugerencias ziGO" style="max-width:480px;">
            <button type="button" class="modal-cerrar" id="cerrar-modal-queja-rapida" aria-label="Cerrar buzón">&times;</button>
            <h3 style="margin:0 0 6px 0;"><i class="fas fa-comment-medical" style="color:#f43f5e;"></i> Buzón de Quejas y Sugerencias</h3>
            <p style="font-size:12px;opacity:0.85;margin-bottom:10px;">Tu opinión nos ayuda a mejorar. Tu reporte llega directamente al área de Calidad ziGO.</p>
            <form id="form-queja-rapida-modal" class="form-queja-rapida-grid">
                <input type="text" id="qr-nombre" placeholder="Tu nombre (opcional)">
                <select id="qr-tipo" required>
                    <option value="Queja / Inconformidad">Queja / Inconformidad</option>
                    <option value="Sugerencia de mejora">Sugerencia de mejora</option>
                    <option value="Felicitación / Reconocimiento">Felicitación / Reconocimiento</option>
                </select>
                <textarea id="qr-mensaje" rows="4" required placeholder="Describe tu queja, comentario o sugerencia..."></textarea>
                <button type="submit" class="boton-agenda" style="justify-content:center;">
                    <i class="fas fa-paper-plane"></i> Enviar Reporte
                </button>
            </form>
            <div id="qr-respuesta" class="oculto" style="margin-top:12px;padding:10px;border-radius:10px;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.4);font-size:13px;"></div>
        </div>
    `;
    modalQueja.style.display = 'flex';

    document.getElementById('cerrar-modal-queja-rapida').onclick = () => { modalQueja.style.display = 'none'; };
    modalQueja.onclick = (e) => { if (e.target === modalQueja) modalQueja.style.display = 'none'; };

    const form = document.getElementById('form-queja-rapida-modal');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const nombre = (document.getElementById('qr-nombre').value || '').trim() || 'Paciente Anónimo';
        const tipo = document.getElementById('qr-tipo').value;
        const mensaje = (document.getElementById('qr-mensaje').value || '').trim();
        const folio = `ZIGO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const txtOrig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando reporte...';

        // Guardar en estadísticas locales + Google Apps Script
        const scoreEquiv = tipo.toLowerCase().includes('felicitación') ? 5 : (tipo.toLowerCase().includes('queja') ? 1 : 3);
        ZigoAnalytics.registrarCalificacion({ score: scoreEquiv, tipo, comentario: mensaje, nombre });
        ZigoAnalytics.registrarConversion('buzonQuejas', `${folio} - ${tipo}`);

        let enviado = false;
        try {
            const resp = await fetch(`https://formsubmit.co/ajax/${CONFIG_ZIGO.correoQuejasPrincipal}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `[${folio}] ${tipo} - Buzón ziGO`,
                    _cc: CONFIG_ZIGO.correoQuejasCopia,
                    _template: 'table',
                    Folio: folio,
                    Tipo: tipo,
                    Paciente: nombre,
                    Mensaje: mensaje
                })
            });
            enviado = resp.ok;
        } catch (err) {}

        btn.disabled = false;
        btn.innerHTML = txtOrig;

        const textoFormateado = `Folio: ${folio}\nTipo: ${tipo}\nPaciente: ${nombre}\nMensaje: ${mensaje}`;
        const urlMail = `mailto:${CONFIG_ZIGO.correoQuejasPrincipal}?cc=${CONFIG_ZIGO.correoQuejasCopia}&subject=${encodeURIComponent(`[${folio}] ${tipo} - ziGO`)}&body=${encodeURIComponent(textoFormateado)}`;

        form.reset();
        const respBox = document.getElementById('qr-respuesta');
        respBox.innerHTML = enviado
            ? `<i class="fas fa-check-circle" style="color:#10b981;"></i> <strong>Reporte registrado con Folio ${escaparHTML(folio)}.</strong> Fue enviado al equipo de Calidad ziGO y guardado en estadísticas.`
            : `<i class="fas fa-check-circle" style="color:#10b981;"></i> <strong>Folio generado: ${escaparHTML(folio)}.</strong> <a href="${urlMail}" style="text-decoration:underline;font-weight:bold;">Haz clic aquí para enviarlo por correo</a>.`;
        respBox.classList.remove('oculto');
    };
}

function inicializarWidgetSatisfaccion() {
    const widget = document.getElementById('zigo-feedback-widget');
    if (!widget || widget.dataset.inicializado === '1') return;
    widget.dataset.inicializado = '1';

    let scoreElegido = 0;
    const botones = widget.querySelectorAll('#zigo-caritas button');
    const extra = document.getElementById('zigo-feedback-extra');
    const gracias = document.getElementById('zigo-feedback-gracias');
    const inputTexto = document.getElementById('zigo-feedback-texto');
    const btnEnviar = document.getElementById('zigo-feedback-enviar');

    botones.forEach(btn => {
        btn.onclick = () => {
            scoreElegido = Number(btn.dataset.score);
            botones.forEach(b => {
                b.style.borderColor = 'transparent';
                b.style.transform = 'scale(1)';
            });
            btn.style.borderColor = '#38bdf8';
            btn.style.transform = 'scale(1.15)';
            if (extra) extra.style.display = 'block';
            if (gracias) gracias.style.display = 'none';
        };
    });

    if (btnEnviar) {
        btnEnviar.onclick = () => {
            if (!scoreElegido) return;
            const comentario = (inputTexto?.value || '').trim();
            ZigoAnalytics.registrarCalificacion({
                score: scoreElegido,
                tipo: scoreElegido >= 4 ? 'Valoración Positiva' : (scoreElegido <= 2 ? 'Inconformidad en Encuesta' : 'Opinión Neutral'),
                comentario,
                nombre: 'Cliente Web'
            });
            if (extra) extra.style.display = 'none';
            if (inputTexto) inputTexto.value = '';
            if (gracias) gracias.style.display = 'block';
        };
    }
}

/*============================================================
    8. BOTONES FLOTANTES CON RESPUESTA INMEDIATA (1 CLIC / 1 TOQUE)
============================================================*/
function inicializarAccesibilidadYWidgets() {
    const mensajeCitaDirecto = 'Hola Dra. Escarlet, vengo de la página de ziGO y me gustaría agendar una cita.';
    const urlWaDirecto = construirUrlWhatsApp(mensajeCitaDirecto);
    const urlTgDirecto = construirUrlTelegram(mensajeCitaDirecto);

    const widgetAcc = document.createElement('div');
    widgetAcc.id = 'widget-accesibilidad';
    widgetAcc.className = 'widget-flotante-arrastrable';
    widgetAcc.innerHTML = `
        <div id="panel-accesibilidad" class="panel-accesibilidad oculto" role="region" aria-label="Opciones de accesibilidad visual">
            <h3><span><i class="fas fa-universal-access"></i> Inclusión Visual</span></h3>
            <div class="fila-modo-base-acc">
                <button type="button" class="btn-modo-principal btn-modo-oscuro-card" data-tema="oscuro"><i class="fas fa-moon"></i> Oscuro</button>
                <button type="button" class="btn-modo-principal btn-modo-claro-card" data-tema="claro"><i class="fas fa-sun"></i> Claro</button>
            </div>
            <div class="bloque-temas-color">
                <span><i class="fas fa-palette"></i> Color de fondo personalizado:</span>
                <div class="paleta-colores-grid">
                    <button type="button" class="btn-color-tema" data-tema="azul-uveg" title="Azul UVEG" style="background:#1e3a8a;"></button>
                    <button type="button" class="btn-color-tema" data-tema="morado" title="Morado Cósmico" style="background:#6d28d9;"></button>
                    <button type="button" class="btn-color-tema" data-tema="azul-botones" title="Azul Botones ziGO" style="background:#0284c7;"></button>
                    <button type="button" class="btn-color-tema" data-tema="menta-uveg" title="Verde Menta UVEG" style="background:#34d399;"></button>
                    <button type="button" class="btn-color-tema" data-tema="pizarra-uveg" title="Gris Pizarra UVEG" style="background:#8e99a8;"></button>
                    <button type="button" class="btn-color-tema" data-tema="rosa" title="Rosa Suave ziGO" style="background:#ec4899;"></button>
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
            <button type="button" class="btn-acc-opcion" id="acc-daltonismo"><i class="fas fa-low-vision"></i> Visión de Color (Daltonismo)</button>
            <button type="button" class="btn-acc-opcion" id="acc-alto-contraste"><i class="fas fa-adjust"></i> Alto Contraste</button>
            <button type="button" class="btn-acc-opcion" id="acc-guia-lectura"><i class="fas fa-grip-lines"></i> Guía de Lectura</button>
            <button type="button" class="btn-acc-opcion" id="acc-vista-simple"><i class="fas fa-eye"></i> Vista Simplificada</button>
            <button type="button" class="btn-acc-opcion" id="acc-leer-pagina"><i class="fas fa-volume-up"></i> Escuchar página</button>
            <button type="button" class="btn-acc-opcion" id="acc-detener-voz"><i class="fas fa-stop-circle"></i> Detener lectura</button>
            <button type="button" class="btn-acc-opcion btn-acc-reset" id="acc-restablecer"><i class="fas fa-undo"></i> Restablecer todo</button>
        </div>
        <button type="button" id="btn-toggle-acc" class="btn-burbuja-maestra" aria-expanded="false" aria-label="Abrir menú de accesibilidad" title="Accesibilidad e Inclusión Visual">
            <i class="fas fa-universal-access"></i>
        </button>
    `;
    document.body.appendChild(widgetAcc);

    const widgetRedes = document.createElement('div');
    widgetRedes.id = 'widget-redes-flotante';
    widgetRedes.className = 'widget-flotante-arrastrable';
    widgetRedes.innerHTML = `
        <div id="globos-redes-lista" class="globos-redes-lista oculto">
            <a href="${urlWaDirecto}" data-canal="whatsapp" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-whatsapp" style="color:#25D366;"></i> WhatsApp · Escarlet</a>
            <a href="${urlTgDirecto}" data-canal="telegram" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-telegram" style="color:#26A5E4;"></i> Telegram · Escarlet</a>
            <button type="button" id="btn-abrir-quejas-flotante" class="globo-red-item globo-queja-btn"><i class="fas fa-comment-medical" style="color:#f43f5e;"></i> Quejas y Sugerencias</button>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-instagram" style="color:#E1306C;"></i> Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-facebook-f" style="color:#1877F2;"></i> Facebook</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-tiktok" style="color:#00f0ff;"></i> TikTok</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fab fa-x-twitter"></i> X / Twitter</a>
            <a href="https://threads.com" target="_blank" rel="noopener noreferrer" class="globo-red-item"><i class="fa-brands fa-threads"></i> Threads</a>
        </div>
        <button type="button" id="btn-toggle-redes" class="btn-burbuja-maestra btn-burbuja-redes" aria-expanded="false" aria-label="Abrir mensajes y quejas" title="Mensajes, Redes y Quejas">
            <i class="fas fa-comment-dots"></i>
        </button>
    `;
    document.body.appendChild(widgetRedes);

    document.getElementById('btn-abrir-quejas-flotante')?.addEventListener('click', () => {
        document.getElementById('globos-redes-lista')?.classList.add('oculto');
        document.getElementById('btn-toggle-redes')?.setAttribute('aria-expanded', 'false');
        abrirModalQuejasGlobal();
    });

    document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
        a.href = urlWaDirecto;
        a.dataset.canal = 'whatsapp';
    });
    document.querySelectorAll('a[href*="t.me"], a[href*="telegram"]').forEach(a => {
        a.href = urlTgDirecto;
        a.dataset.canal = 'telegram';
    });

    // Control unificado con Pointer Events: 1 clic / 1 toque abre al instante; solo arrastra si mueves >12px
    function hacerArrastrableInstantaneo(contenedor, botonDisparador, alHacerClic) {
        let pointerIdActivo = null;
        let inicioX = 0, inicioY = 0;
        let posInicialLeft = 0, posInicialTop = 0;
        let arrastrando = false;

        botonDisparador.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            pointerIdActivo = e.pointerId;
            inicioX = e.clientX;
            inicioY = e.clientY;
            arrastrando = false;
            const rect = contenedor.getBoundingClientRect();
            posInicialLeft = rect.left;
            posInicialTop = rect.top;
            try { botonDisparador.setPointerCapture(e.pointerId); } catch (err) {}
        });

        botonDisparador.addEventListener('pointermove', (e) => {
            if (e.pointerId !== pointerIdActivo) return;
            const deltaX = e.clientX - inicioX;
            const deltaY = e.clientY - inicioY;

            // Umbral de 12px para evitar falsos arrastres en pantallas táctiles
            if (!arrastrando && (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12)) {
                arrastrando = true;
                contenedor.style.bottom = 'auto';
                contenedor.style.right = 'auto';
            }

            if (arrastrando) {
                const maxLeft = window.innerWidth - contenedor.offsetWidth - 8;
                const maxTop = window.innerHeight - contenedor.offsetHeight - 8;
                contenedor.style.left = `${Math.max(8, Math.min(maxLeft, posInicialLeft + deltaX))}px`;
                contenedor.style.top = `${Math.max(8, Math.min(maxTop, posInicialTop + deltaY))}px`;
            }
        });

        const terminarInteraccion = (e) => {
            if (e.pointerId !== pointerIdActivo) return;
            try { botonDisparador.releasePointerCapture(e.pointerId); } catch (err) {}
            const fueArrastre = arrastrando;
            pointerIdActivo = null;
            arrastrando = false;

            if (!fueArrastre) {
                e.preventDefault();
                alHacerClic();
            }
        };

        botonDisparador.addEventListener('pointerup', terminarInteraccion);
        botonDisparador.addEventListener('pointercancel', () => {
            pointerIdActivo = null;
            arrastrando = false;
        });
    }

    const panelAcc = document.getElementById('panel-accesibilidad');
    const listaRedes = document.getElementById('globos-redes-lista');
    const btnToggleAcc = document.getElementById('btn-toggle-acc');
    const btnToggleRedes = document.getElementById('btn-toggle-redes');

    hacerArrastrableInstantaneo(widgetAcc, btnToggleAcc, () => {
        const abierto = !panelAcc.classList.toggle('oculto');
        listaRedes.classList.add('oculto');
        btnToggleAcc.setAttribute('aria-expanded', String(abierto));
        btnToggleRedes.setAttribute('aria-expanded', 'false');
    });

    hacerArrastrableInstantaneo(widgetRedes, btnToggleRedes, () => {
        const abierto = !listaRedes.classList.toggle('oculto');
        panelAcc.classList.add('oculto');
        btnToggleRedes.setAttribute('aria-expanded', String(abierto));
        btnToggleAcc.setAttribute('aria-expanded', 'false');
    });

    // Cerrar menús flotantes al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!widgetAcc.contains(e.target) && !panelAcc.classList.contains('oculto')) {
            panelAcc.classList.add('oculto');
            btnToggleAcc.setAttribute('aria-expanded', 'false');
        }
        if (!widgetRedes.contains(e.target) && !listaRedes.classList.contains('oculto')) {
            listaRedes.classList.add('oculto');
            btnToggleRedes.setAttribute('aria-expanded', 'false');
        }
    });

    function aplicarTemaColor(nombreTema) {
        const temaFinal = nombreTema || 'oscuro';
        document.body.classList.remove('tema-claro', 'tema-azul-uveg', 'tema-morado', 'tema-azul-botones', 'tema-menta-uveg', 'tema-pizarra-uveg', 'tema-rosa');
        if (temaFinal !== 'oscuro') document.body.classList.add(`tema-${temaFinal}`);

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
        document.getElementById('acc-espaciado')?.classList.add('activo');
    }

    let interlineadoActivo = localStorage.getItem('zigo_interlineado') === '1';
    if (interlineadoActivo) {
        document.documentElement.style.setProperty('--altura-linea', '1.85');
        document.getElementById('acc-interlineado')?.classList.add('activo');
    }

    if (localStorage.getItem('zigo_daltonismo') === '1') {
        document.documentElement.classList.add('modo-daltonismo');
        document.getElementById('acc-daltonismo')?.classList.add('activo');
    }
    if (localStorage.getItem('zigo_alto_contraste') === '1') {
        document.body.classList.add('modo-alto-contraste');
        document.getElementById('acc-alto-contraste')?.classList.add('activo');
    }
    if (localStorage.getItem('zigo_vista_simple') === '1') {
        document.body.classList.add('vista-simplificada');
        document.getElementById('acc-vista-simple')?.classList.add('activo');
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
    window.addEventListener('mousemove', (e) => { if (barraGuia) barraGuia.style.top = `${e.clientY}px`; });
    window.addEventListener('touchmove', (e) => { if (barraGuia && e.touches[0]) barraGuia.style.top = `${e.touches[0].clientY}px`; }, { passive: true });

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
            <div class="barra-lector-texto"><i class="fas fa-volume-up" style="color:var(--neon-cyan);"></i> Escuchando: <span>${escaparHTML(textoFrase)}</span></div>
            <button type="button" class="btn-parar-barra-voz" id="btn-cerrar-barra-voz"><i class="fas fa-stop"></i> Detener</button>
        `;
        document.getElementById('btn-cerrar-barra-voz').onclick = detenerLecturaVoz;
    }

    function detenerLecturaVoz() {
        lecturaActiva = false;
        if (timerRespaldoVoz) { clearTimeout(timerRespaldoVoz); timerRespaldoVoz = null; }
        if (audioTTSActual) {
            try { audioTTSActual.pause(); audioTTSActual.src = ''; } catch (e) {}
            audioTTSActual = null;
        }
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }
        document.getElementById('barra-lector-voz-zigo')?.remove();
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
            if (limpia.length <= maxLen) salida.push(limpia);
            else {
                const palabras = limpia.split(' ');
                let bloque = '';
                for (const p of palabras) {
                    if ((bloque + ' ' + p).trim().length > maxLen) {
                        salida.push(bloque.trim());
                        bloque = p;
                    } else bloque = (bloque + ' ' + p).trim();
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
                    utter.onend = () => { indice++; reproducirSiguienteFragmento(); };
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
            audio.onended = () => { indice++; reproducirSiguienteFragmento(); };
            audio.onerror = () => { timerRespaldoVoz = setTimeout(() => { indice++; reproducirSiguienteFragmento(); }, Math.max(2500, frase.length * 55)); };
            audio.play().catch(() => { timerRespaldoVoz = setTimeout(() => { indice++; reproducirSiguienteFragmento(); }, Math.max(2500, frase.length * 55)); });
        }
        reproducirSiguienteFragmento();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    document.getElementById('acc-espaciado')?.addEventListener('click', function () {
        espaciadoActivo = !espaciadoActivo;
        this.classList.toggle('activo', espaciadoActivo);
        document.documentElement.style.setProperty('--espaciado-letras', espaciadoActivo ? '0.07em' : 'normal');
        localStorage.setItem('zigo_espaciado', espaciadoActivo ? '1' : '0');
    });

    document.getElementById('acc-interlineado')?.addEventListener('click', function () {
        interlineadoActivo = !interlineadoActivo;
        this.classList.toggle('activo', interlineadoActivo);
        document.documentElement.style.setProperty('--altura-linea', interlineadoActivo ? '1.85' : '1.5');
        localStorage.setItem('zigo_interlineado', interlineadoActivo ? '1' : '0');
    });

    document.getElementById('acc-daltonismo')?.addEventListener('click', function () {
        const activo = document.documentElement.classList.toggle('modo-daltonismo');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_daltonismo', activo ? '1' : '0');
    });

    document.getElementById('acc-alto-contraste')?.addEventListener('click', function () {
        const activo = document.body.classList.toggle('modo-alto-contraste');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_alto_contraste', activo ? '1' : '0');
    });

    document.getElementById('acc-guia-lectura')?.addEventListener('click', function () {
        const activo = !this.classList.contains('activo');
        this.classList.toggle('activo', activo);
        activarGuiaLectura(activo);
    });

    document.getElementById('acc-vista-simple')?.addEventListener('click', function () {
        const activo = document.body.classList.toggle('vista-simplificada');
        this.classList.toggle('activo', activo);
        localStorage.setItem('zigo_vista_simple', activo ? '1' : '0');
    });

    document.getElementById('acc-texto-mas')?.addEventListener('click', () => {
        escalaActual = Math.min(1.32, +(escalaActual + 0.08).toFixed(2));
        document.documentElement.style.setProperty('--escala-fuente', escalaActual);
        localStorage.setItem('zigo_escala_fuente', escalaActual);
    });

    document.getElementById('acc-texto-menos')?.addEventListener('click', () => {
        escalaActual = Math.max(0.85, +(escalaActual - 0.08).toFixed(2));
        document.documentElement.style.setProperty('--escala-fuente', escalaActual);
        localStorage.setItem('zigo_escala_fuente', escalaActual);
    });

    document.getElementById('acc-leer-pagina')?.addEventListener('click', iniciarLecturaPagina);
    document.getElementById('acc-detener-voz')?.addEventListener('click', detenerLecturaVoz);

    document.getElementById('acc-restablecer')?.addEventListener('click', () => {
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
    9. PÁGINA INICIO: RESEÑAS VERIFICADAS 5 ESTRELLAS
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

    const mezcladas = [...poolResenasGoogle].sort(() => Math.random() - 0.5).slice(0, 3);
    grid.innerHTML = mezcladas.map(r => `
        <article class="testimonio-google-card">
            <div class="card-header">
                <div class="avatar-placeholder" aria-hidden="true">${escaparHTML(r.inicial)}</div>
                <div class="reviewer-info">
                    <p class="reviewer-name">${escaparHTML(r.nombre)}</p>
                    <p class="review-date">Reseña Verificada 5★</p>
                </div>
                <img src="${RUTA_BASE}img/google-logo.webp" alt="Google" class="google-icon-small" loading="lazy">
            </div>
            <div class="google-stars-yellow" aria-label="5 estrellas de calificación">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
            </div>
            <blockquote class="review-text">${escaparHTML(r.texto)}</blockquote>
        </article>
    `).join('');
}

/*============================================================
    10. RENDERIZADO 3D ANATÓMICO REALISTA + VALIDACIÓN FACIAL
============================================================*/
function suavizarLandmarks(anteriores, nuevos, factor = 0.68) {
    if (!anteriores || anteriores.length !== nuevos.length) return nuevos;
    const inv = 1 - factor;
    return nuevos.map((p, i) => ({
        x: p.x * factor + anteriores[i].x * inv,
        y: p.y * factor + anteriores[i].y * inv,
        z: (p.z || 0) * factor + (anteriores[i].z || 0) * inv
    }));
}

function dibujarArmazonEnRostro(ctx, w, h, landmarks, armazonData, escalaExtra = 1, offsetYExtra = 0, espejado = true) {
    if (!armazonData || !armazonData.canvas) return;
    if (ctx.canvas) {
        ctx.canvas.style.mixBlendMode = armazonData.transparente ? 'normal' : 'multiply';
    }

    const mapX = (normX) => (espejado ? (1 - normX) : normX) * w;
    const mapY = (normY) => normY * h;

    const ojoDer = landmarks[468]
        ? { x: mapX(landmarks[468].x), y: mapY(landmarks[468].y) }
        : { x: mapX((landmarks[33].x + landmarks[133].x) / 2), y: mapY((landmarks[33].y + landmarks[133].y) / 2) };

    const ojoIzq = landmarks[473]
        ? { x: mapX(landmarks[473].x), y: mapY(landmarks[473].y) }
        : { x: mapX((landmarks[263].x + landmarks[362].x) / 2), y: mapY((landmarks[263].y + landmarks[362].y) / 2) };

    const pIzq = ojoIzq.x < ojoDer.x ? ojoIzq : ojoDer;
    const pDer = ojoIzq.x < ojoDer.x ? ojoDer : ojoIzq;

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

    const distPuenteIzq = Math.abs(puenteNasal.x - orejaIzq.x);
    const distPuenteDer = Math.abs(orejaDer.x - puenteNasal.x);
    const yaw = Math.max(-0.75, Math.min(0.75, (distPuenteDer - distPuenteIzq) / ((distPuenteDer + distPuenteIzq) || 1)));

    const midPupilasY = (pIzq.y + pDer.y) / 2;
    const distFrenteOjos = Math.abs(midPupilasY - frente.y);
    const distOjosMenton = Math.abs(menton.y - midPupilasY);
    const ratioVertical = distFrenteOjos / (distOjosMenton || 1);
    const pitch = Math.max(-0.48, Math.min(0.48, (ratioVertical - 0.56) * 1.45));

    const midPupilasX = (pIzq.x + pDer.x) / 2;
    const centroX = (puenteNasal.x * 0.72 + midPupilasX * 0.28);
    const centroY = (midPupilasY * 0.84 + puenteNasal.y * 0.16) + offsetYExtra + (pitch * distPupilar * 0.22);

    const anchoFrente = Math.max(distPupilar * 2.18, anchoSienes * 0.94) * escalaExtra * Math.cos(yaw * 0.65);
    const imgCanvas = armazonData.canvas;
    const proporcion = (imgCanvas.height || 150) / (imgCanvas.width || 300);
    const altoFrente = anchoFrente * proporcion * Math.cos(pitch * 0.52);

    const cosR = Math.cos(anguloRoll);
    const sinR = Math.sin(anguloRoll);
    const factorIzq = 1 - yaw * 0.22;
    const factorDer = 1 + yaw * 0.22;

    const bisagraIzqX = centroX - (anchoFrente * 0.48) * cosR;
    const bisagraIzqY = centroY - (anchoFrente * 0.48) * sinR - (altoFrente * 0.16 * factorIzq);
    const bisagraDerX = centroX + (anchoFrente * 0.48) * cosR;
    const bisagraDerY = centroY + (anchoFrente * 0.48) * sinR - (altoFrente * 0.16 * factorDer);

    ctx.save();
    ctx.strokeStyle = armazonData.colorPatita || 'rgba(28, 32, 38, 0.92)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (yaw > 0.06) {
        ctx.lineWidth = Math.max(3.5, anchoFrente * 0.026);
        const destinoOrejaX = orejaIzq.x + 2;
        const destinoOrejaY = orejaIzq.y - (altoFrente * 0.14);
        const ctrlX = (bisagraIzqX + destinoOrejaX) / 2;
        const ctrlY = Math.min(bisagraIzqY, destinoOrejaY) - (altoFrente * 0.06);
        ctx.beginPath();
        ctx.moveTo(bisagraIzqX, bisagraIzqY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, destinoOrejaX, destinoOrejaY);
        ctx.stroke();
    }

    if (yaw < -0.06) {
        ctx.lineWidth = Math.max(3.5, anchoFrente * 0.026);
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

    ctx.save();
    ctx.translate(centroX, centroY);
    ctx.rotate(anguloRoll);

    if (armazonData.transparente) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 4;
    } else {
        ctx.filter = 'contrast(1.18) saturate(1.08)';
    }

    const numFranjas = 16;
    const srcW = imgCanvas.width;
    const srcH = imgCanvas.height;

    for (let i = 0; i < numFranjas; i++) {
        const t0 = i / numFranjas;
        const t1 = (i + 1) / numFranjas;
        const tMid = (t0 + t1) / 2;
        const ladoNormalizado = (tMid - 0.5) * 2;
        const escalaPerspectiva = 1 + (yaw * 0.24 * ladoNormalizado);
        const dstX = -anchoFrente / 2 + t0 * anchoFrente;
        const dstW = (anchoFrente / numFranjas) + 0.6;
        const dstH = altoFrente * escalaPerspectiva;
        const dstY = -dstH / 2 + (pitch * altoFrente * 0.12 * Math.abs(ladoNormalizado));

        ctx.drawImage(imgCanvas, t0 * srcW, 0, srcW / numFranjas, srcH, dstX, dstY, dstW, dstH);
    }
    ctx.restore();
}

function dibujarArmazonCentradoFallback(ctx, w, h, armazonData, escalaExtra = 1, offsetYExtra = 0) {
    if (!armazonData || !armazonData.canvas) return;
    if (ctx.canvas) ctx.canvas.style.mixBlendMode = armazonData.transparente ? 'normal' : 'multiply';
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
    URL.revokeObjectURL(urlTemporal);

    if (!cargada || !img.naturalWidth) {
        return { valido: false, motivo: 'No se pudo leer la imagen seleccionada.' };
    }

    return new Promise((resolve) => {
        const detector = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        detector.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 });

        let respondido = false;
        const liberarDetector = () => { try { detector.close(); } catch (e) {} };
        const timeoutId = setTimeout(() => {
            if (!respondido) {
                respondido = true;
                liberarDetector();
                resolve({ valido: false, motivo: 'No se logró detectar un rostro claro en la fotografía.' });
            }
        }, 8000);

        detector.onResults((results) => {
            if (respondido) return;
            respondido = true;
            clearTimeout(timeoutId);
            liberarDetector();

            const rostros = results.multiFaceLandmarks || [];
            if (rostros.length !== 1) {
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

            const rostroValido = distOjos >= 0.10 && distOjos <= 0.72 && altoRostro >= 0.22 && nariz.x > 0.15 && nariz.x < 0.85 && nariz.y > 0.15 && nariz.y < 0.85;
            if (!rostroValido) {
                resolve({ valido: false, motivo: 'Imagen rechazada: El rostro está muy lejos o recortado. Sube un retrato frontal centrado.' });
                return;
            }
            resolve({ valido: true, img, landmarks: lm });
        });

        detector.send({ image: img }).catch(() => {
            if (!respondido) {
                respondido = true;
                clearTimeout(timeoutId);
                liberarDetector();
                resolve({ valido: false, motivo: 'Error al analizar la imagen. Intenta con otra foto.' });
            }
        });
    });
}

/*============================================================
    11. PÁGINA ARMÁZONES: DETALLES, PROBADOR AR Y SELECCIÓN (CORREGIDO)
============================================================*/
async function limpiarFondosCatalogoTarjetas() {
    const imagenesCatalogo = document.querySelectorAll('.armazon-img');
    for (const imgEl of imagenesCatalogo) {
        const srcOriginal = imgEl.getAttribute('src');
        if (!srcOriginal) continue;
        const limpio = await obtenerArmazonProcesado(srcOriginal);
        if (limpio && limpio.canvasCatalogo && limpio.canvasCatalogo.toDataURL) {
            try { imgEl.src = limpio.canvasCatalogo.toDataURL('image/png'); } catch (e) {}
        }
    }
}

async function abrirModalDetallesArmazon(nombre, imagen, material, descripcion) {
    const modal = document.getElementById('modal-detalles');
    if (!modal) return;

    document.getElementById('modal-titulo').innerText = nombre;
    const modalImg = document.getElementById('modal-img');
    modalImg.src = resolverRutaSegura(imagen);

    const limpio = await obtenerArmazonProcesado(imagen);
    if (limpio && limpio.canvasCatalogo && limpio.canvasCatalogo.toDataURL) {
        try { modalImg.src = limpio.canvasCatalogo.toDataURL('image/png'); } catch (e) {}
    }

    document.getElementById('modal-material').innerText = `Material: ${material}`;
    document.getElementById('modal-descripcion').innerText = descripcion;

    // Quitar .oculto (que tiene display:none !important) y mostrar flex
    modal.classList.remove('oculto');
    modal.style.display = 'flex';
}

function cerrarModalDetallesArmazon() {
    const modal = document.getElementById('modal-detalles');
    if (modal) {
        modal.classList.add('oculto');
        modal.style.display = 'none';
    }
}

let streamARIndividual = null;
let animacionARIndividualId = null;
let faceMeshIndividual = null;
let ultimosLandmarksIndividual = null;
let framesPerdidosIndividual = 0;
let procesandoFrameIndividual = false;
let armazonModalActual = null;
let armazonNombreModalActual = '';
let armazonRutaModalActual = '';
let fotoEstaticaModal = null;
let landmarksFotoModal = null;

async function abrirProbadorVirtual(nombre, imagenRuta) {
    const modal = document.getElementById('modal-probador-ar');
    const video = document.getElementById('webcam-ar');
    const canvas = document.getElementById('canvas-ar-individual');
    const badge = document.getElementById('badge-tracking-individual');
    if (!modal || !video || !canvas) return;

    canvas.style.pointerEvents = 'none';
    armazonNombreModalActual = nombre;
    armazonRutaModalActual = imagenRuta;
    ZigoAnalytics.registrarPruebaAR(nombre, 'catalogo');

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
            abrirProbadorVirtual(armazonNombreModalActual, armazonRutaModalActual);
        };
    }

    document.getElementById('probador-titulo').innerText = `Probador AR: ${nombre}`;
    document.getElementById('ar-escala').value = 1;
    document.getElementById('ar-posicion-y').value = 0;
    if (document.getElementById('ar-brillo-modal')) document.getElementById('ar-brillo-modal').value = 100;
    if (document.getElementById('ar-contraste-modal')) document.getElementById('ar-contraste-modal').value = 100;

    fotoEstaticaModal = null;
    landmarksFotoModal = null;
    ultimosLandmarksIndividual = null;
    framesPerdidosIndividual = 0;
    procesandoFrameIndividual = false;
    video.style.display = 'block';
    document.getElementById('btn-volver-camara-modal')?.classList.add('oculto');

    // Quitar .oculto y mostrar flex
    modal.classList.remove('oculto');
    modal.style.display = 'flex';

    armazonModalActual = await obtenerArmazonProcesado(imagenRuta);
    const ctx = canvas.getContext('2d');
    if (animacionARIndividualId) cancelAnimationFrame(animacionARIndividualId);

    function bucleRenderAR() {
        const escalaUsuario = parseFloat(document.getElementById('ar-escala')?.value || '1');
        const offsetYUsuario = parseFloat(document.getElementById('ar-posicion-y')?.value || '0');
        const brillo = document.getElementById('ar-brillo-modal')?.value || '100';
        const contraste = document.getElementById('ar-contraste-modal')?.value || '100';

        video.style.filter = `brightness(${brillo}%) contrast(${contraste}%)`;

        if (fotoEstaticaModal && landmarksFotoModal) {
            const fw = fotoEstaticaModal.naturalWidth || 640;
            const fh = fotoEstaticaModal.naturalHeight || 480;
            if (canvas.width !== fw) canvas.width = fw;
            if (canvas.height !== fh) canvas.height = fh;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
            ctx.drawImage(fotoEstaticaModal, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            dibujarArmazonEnRostro(ctx, canvas.width, canvas.height, landmarksFotoModal, armazonModalActual, escalaUsuario, offsetYUsuario, false);
            animacionARIndividualId = requestAnimationFrame(bucleRenderAR);
            return;
        }

        if (!streamARIndividual) {
            if (armazonModalActual) {
                canvas.width = 640;
                canvas.height = 480;
                ctx.clearRect(0, 0, 640, 480);
                dibujarArmazonCentradoFallback(ctx, 640, 480, armazonModalActual, escalaUsuario, offsetYUsuario);
            }
            return;
        }

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        if (canvas.width !== vw) canvas.width = vw;
        if (canvas.height !== vh) canvas.height = vh;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faceMeshIndividual && !procesandoFrameIndividual && video.readyState >= 2) {
            procesandoFrameIndividual = true;
            faceMeshIndividual.send({ image: video }).catch(() => {}).finally(() => {
                procesandoFrameIndividual = false;
            });
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
        if (badge) badge.innerHTML = '<span class="punto-estado"></span> Usa "Subir foto de mi rostro"';
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
            faceMeshIndividual.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });
            faceMeshIndividual.onResults((results) => {
                const detectado = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
                if (detectado) {
                    ultimosLandmarksIndividual = suavizarLandmarks(ultimosLandmarksIndividual, detectado, 0.72);
                    framesPerdidosIndividual = 0;
                } else {
                    framesPerdidosIndividual++;
                    if (framesPerdidosIndividual > 12) ultimosLandmarksIndividual = null;
                }
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
    ultimosLandmarksIndividual = null;
    const video = document.getElementById('webcam-ar');
    if (video) video.srcObject = null;
    const modal = document.getElementById('modal-probador-ar');
    if (modal) {
        modal.classList.add('oculto');
        modal.style.display = 'none';
    }
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
    ZigoAnalytics.registrarConversion('capturasAR', armazonNombreModalActual);

    const enlace = document.createElement('a');
    enlace.href = canvasFinal.toDataURL('image/png');
    enlace.download = `ziGO-Prueba-AR-${(armazonNombreModalActual || 'Lente').replace(/\s+/g, '-')}.png`;
    enlace.click();
}

function actualizarContadorArmazones() {
    const seleccionados = document.querySelectorAll('.seleccionar-armazon:checked');
    const contadorSpan = document.getElementById('contador-seleccionados');
    const panelFlotante = document.querySelector('.panel-agendar-flotante');

    if (contadorSpan && panelFlotante) {
        contadorSpan.innerText = seleccionados.length;
        panelFlotante.classList.toggle('activo', seleccionados.length > 0);
    }
}

function inicializarCatalogoArmazones() {
    const grid = document.querySelector('.armazon-grid');
    if (!grid) return;

    // 1. Filtros de categoría
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    const tarjetas = document.querySelectorAll('.armazon-card');
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            boton.classList.add('activo');
            const filtro = boton.getAttribute('data-filtro');
            tarjetas.forEach(tarjeta => {
                const cat = tarjeta.getAttribute('data-categoria');
                tarjeta.style.display = (filtro === 'todos' || cat === filtro) ? 'flex' : 'none';
            });
        });
    });

    // 2. Enlace directo a TODOS los botones Detalles, Probar AR, Modales y Agendar
    grid.addEventListener('click', (e) => {
        const btnDetalles = e.target.closest('.btn-detalles');
        if (btnDetalles) {
            e.preventDefault();
            const card = btnDetalles.closest('.armazon-card');
            const nombre = btnDetalles.dataset.modelo || card?.dataset.modelo || 'Armazón ziGO';
            const catItem = CATALOGO_ARMAZONES.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
            const img = btnDetalles.dataset.img || catItem?.archivo || '';
            const material = btnDetalles.dataset.material || catItem?.material || 'Acetato / Aleación ligera';
            const descripcion = btnDetalles.dataset.descripcion || catItem?.descripcion || 'Diseño ergonómico ziGO adaptado a tu estilo.';
            abrirModalDetallesArmazon(nombre, img, material, descripcion);
            return;
        }

        const btnProbar = e.target.closest('.btn-probar-ar');
        if (btnProbar) {
            e.preventDefault();
            const card = btnProbar.closest('.armazon-card');
            const nombre = btnProbar.dataset.modelo || card?.dataset.modelo || 'Armazón ziGO';
            const catItem = CATALOGO_ARMAZONES.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
            const img = btnProbar.dataset.img || catItem?.archivo || '';
            abrirProbadorVirtual(nombre, img);
        }
    });

    // 3. Botones de cierre de modales, captura y agendar cita
    document.getElementById('btn-cerrar-modal-detalles')?.addEventListener('click', cerrarModalDetallesArmazon);
    document.getElementById('modal-detalles')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-detalles') cerrarModalDetallesArmazon();
    });

    document.getElementById('btn-cerrar-probador-ar')?.addEventListener('click', cerrarProbadorVirtual);
    document.getElementById('modal-probador-ar')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-probador-ar') cerrarProbadorVirtual();
    });

    document.getElementById('btn-captura-probador-ar')?.addEventListener('click', tomarCapturaProbadorAR);

    document.getElementById('btn-agendar-seleccionados')?.addEventListener('click', () => {
        const seleccionados = Array.from(document.querySelectorAll('.seleccionar-armazon:checked')).map(cb => cb.value);
        if (seleccionados.length === 0) return;
        window.location.href = `agenda.html?armazones=${encodeURIComponent(seleccionados.join(', '))}`;
    });

    document.querySelectorAll('.seleccionar-armazon').forEach(box => {
        box.addEventListener('change', actualizarContadorArmazones);
    });
    actualizarContadorArmazones();
}

/*============================================================
    12. PÁGINA RECOMENDACIÓN FACIAL IA (PROBADOR.HTML)
============================================================*/
function inicializarAsistenteIA() {
    const video = document.getElementById('webcam-feed');
    const canvasOverlay = document.getElementById('ar-overlay');
    if (!video || !canvasOverlay) return;

    canvasOverlay.style.pointerEvents = 'none';

    const btnActivarCamara = document.getElementById('btn-activar-camara');
    const btnCaptura = document.getElementById('btn-captura');
    const btnEscanear = document.getElementById('btn-escanear-ia');
    const alertaIA = document.getElementById('alerta-ia-rostro');
    const panelResultado = document.getElementById('resultado-ia');
    const statusTexto = document.getElementById('ar-status-texto');
    const statusDot = document.getElementById('ar-status-dot');
    const selectCatalogo = document.getElementById('select-armazon-ia');
    const inputSubirFoto = document.getElementById('input-subir-foto-ia');
    const btnVolverCamara = document.getElementById('btn-volver-camara-ia');
    const sliderBrillo = document.getElementById('ia-brillo');
    const sliderContraste = document.getElementById('ia-contraste');
    const sliderEscala = document.getElementById('ia-ar-escala');
    const sliderOffset = document.getElementById('ia-ar-posicion-y');

    if (!btnEscanear) return;

    let streamIA = null;
    let faceMeshIA = null;
    let ultimosLandmarksIA = null;
    let framesPerdidosIA = 0;
    let procesandoFrameIA = false;
    let armazonActivoIA = null;
    let rafIA = null;
    let fotoSubidaIA = null;
    let landmarksFotoSubidaIA = null;

    function mostrarAlertaIA(msg) {
        if (!alertaIA) { alert(msg); return; }
        alertaIA.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escaparHTML(msg)}`;
        alertaIA.classList.remove('oculto');
    }

    function aplicarFiltrosLuzIA() {
        const brillo = sliderBrillo?.value || '100';
        const contraste = sliderContraste?.value || '100';
        const spanBrillo = document.getElementById('val-brillo-ia');
        const spanContraste = document.getElementById('val-contraste-ia');
        if (spanBrillo) spanBrillo.innerText = `${brillo}%`;
        if (spanContraste) spanContraste.innerText = `${contraste}%`;
        video.style.filter = `brightness(${brillo}%) contrast(${contraste}%)`;
    }

    sliderBrillo?.addEventListener('input', aplicarFiltrosLuzIA);
    sliderContraste?.addEventListener('input', aplicarFiltrosLuzIA);

    async function seleccionarArmazonEnVivoIA(nombre, rutaRelativa) {
        ZigoAnalytics.registrarPruebaAR(nombre, 'recomendacion_ia');
        armazonActivoIA = await obtenerArmazonProcesado(rutaRelativa);
        document.querySelectorAll('.btn-modelo-lente').forEach(btn => {
            btn.classList.toggle('activo', btn.getAttribute('data-nombre') === nombre);
        });
        const btnAgendarIA = document.getElementById('btn-agendar-desde-ia');
        if (btnAgendarIA) {
            btnAgendarIA.href = `./agenda.html?armazones=${encodeURIComponent(nombre)}`;
        }
        if (!rafIA && (streamIA || fotoSubidaIA)) iniciarBucleRenderIA();
    }

    function iniciarBucleRenderIA() {
        if (rafIA) cancelAnimationFrame(rafIA);
        const ctx = canvasOverlay.getContext('2d');

        function bucleIA() {
            const escala = parseFloat(sliderEscala?.value || '1');
            const offsetY = parseFloat(sliderOffset?.value || '0');
            const brillo = sliderBrillo?.value || '100';
            const contraste = sliderContraste?.value || '100';

            if (fotoSubidaIA && landmarksFotoSubidaIA) {
                const fw = fotoSubidaIA.naturalWidth || 640;
                const fh = fotoSubidaIA.naturalHeight || 480;
                if (canvasOverlay.width !== fw) canvasOverlay.width = fw;
                if (canvasOverlay.height !== fh) canvasOverlay.height = fh;

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
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            if (canvasOverlay.width !== vw) canvasOverlay.width = vw;
            if (canvasOverlay.height !== vh) canvasOverlay.height = vh;
            ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

            if (faceMeshIA && !procesandoFrameIA && video.readyState >= 2) {
                procesandoFrameIA = true;
                faceMeshIA.send({ image: video }).catch(() => {}).finally(() => { procesandoFrameIA = false; });
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
        ultimosLandmarksIA = null;
        framesPerdidosIA = 0;
        procesandoFrameIA = false;
        video.style.display = 'block';
        btnVolverCamara?.classList.add('oculto');

        if (streamIA) {
            iniciarBucleRenderIA();
            return true;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostrarAlertaIA('Tu navegador no permite acceso directo a cámara. Usa "Subir foto de mi rostro".');
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
            alertaIA?.classList.add('oculto');

            if (typeof FaceMesh !== 'undefined' && !faceMeshIA) {
                faceMeshIA = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
                faceMeshIA.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });
                faceMeshIA.onResults((res) => {
                    const detectado = res.multiFaceLandmarks && res.multiFaceLandmarks[0];
                    if (detectado) {
                        ultimosLandmarksIA = suavizarLandmarks(ultimosLandmarksIA, detectado, 0.72);
                        framesPerdidosIA = 0;
                    } else {
                        framesPerdidosIA++;
                        if (framesPerdidosIA > 12) ultimosLandmarksIA = null;
                    }
                });
            }
            iniciarBucleRenderIA();
            return true;
        } catch (err) {
            mostrarAlertaIA('Permite el acceso a tu cámara o sube una fotografía de tu rostro para recibir tu recomendación.');
            return false;
        }
    }

    inputSubirFoto?.addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        const labelSubir = document.querySelector('label[for="input-subir-foto-ia"]');
        const txtOrig = labelSubir ? labelSubir.innerHTML : '';
        if (labelSubir) labelSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando rostro...';

        const validacion = await validarFotoRostroBiometrica(archivo);
        if (labelSubir) labelSubir.innerHTML = txtOrig;

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
        alertaIA?.classList.add('oculto');
        if (statusTexto) statusTexto.innerText = 'Foto verificada con IA';
        if (statusDot) statusDot.classList.add('activo');
        btnVolverCamara?.classList.remove('oculto');
        iniciarBucleRenderIA();
    });

    btnVolverCamara?.addEventListener('click', (e) => { e.preventDefault(); encenderCamaraIA(); });
    btnActivarCamara?.addEventListener('click', (e) => { e.preventDefault(); encenderCamaraIA(); });

    selectCatalogo?.addEventListener('change', async () => {
        if (!selectCatalogo.value) return;
        const [nombre, ruta] = selectCatalogo.value.split('|');
        if (!fotoSubidaIA && !streamIA) await encenderCamaraIA();
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

        ZigoAnalytics.registrarRostroIA(tipoRostro);
        document.getElementById('ia-tipo-rostro').innerText = tipoRostro;
        document.getElementById('ia-explicacion-rostro').innerText = explicacion;

        const listaObjetosRec = recomendados.map(nom => CATALOGO_ARMAZONES.find(c => c.nombre === nom)).filter(Boolean);
        const contenedorBotones = document.getElementById('contenedor-botones-recomendados');

        const tarjetasMini = await Promise.all(listaObjetosRec.map(async (arm, idx) => {
            const proc = await obtenerArmazonProcesado(arm.archivo);
            let srcMini = `${RUTA_BASE}${arm.archivo}`;
            if (proc && proc.canvasCatalogo && proc.canvasCatalogo.toDataURL) {
                try { srcMini = proc.canvasCatalogo.toDataURL('image/png'); } catch (e) {}
            }
            return `
                <button type="button" class="btn-modelo-lente ${idx === 0 ? 'activo' : ''}" data-nombre="${escaparHTML(arm.nombre)}" data-ruta="${escaparHTML(arm.archivo)}">
                    ${idx === 0 ? '<span class="badge-top-rec">#1 IDEAL</span>' : '<span style="font-size:9px;opacity:0.85;">OPCIÓN ' + (idx + 1) + '</span>'}
                    <img src="${srcMini}" alt="${escaparHTML(arm.nombre)}">
                    <span>${escaparHTML(arm.nombre)}</span>
                </button>
            `;
        }));

        contenedorBotones.innerHTML = tarjetasMini.join('');
        contenedorBotones.querySelectorAll('.btn-modelo-lente').forEach(btn => {
            btn.addEventListener('click', () => seleccionarArmazonEnVivoIA(btn.getAttribute('data-nombre'), btn.getAttribute('data-ruta')));
        });

        panelResultado.classList.remove('oculto');
        if (listaObjetosRec[0]) seleccionarArmazonEnVivoIA(listaObjetosRec[0].nombre, listaObjetosRec[0].archivo);
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

    btnEscanear.addEventListener('click', async (e) => {
        e.preventDefault();
        if (fotoSubidaIA && landmarksFotoSubidaIA) {
            await calcularYMostrarDiagnostico([extraerMetricasLandmarks(landmarksFotoSubidaIA)]);
            return;
        }
        const camaraLista = await encenderCamaraIA();
        if (!camaraLista) return;

        btnEscanear.disabled = true;
        btnEscanear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Midiendo proporciones faciales...';
        alertaIA?.classList.add('oculto');

        const muestras = [];
        const recolector = setInterval(() => {
            if (ultimosLandmarksIA) muestras.push(extraerMetricasLandmarks(ultimosLandmarksIA));
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

    btnCaptura?.addEventListener('click', (e) => {
        e.preventDefault();
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
        ZigoAnalytics.registrarConversion('capturasAR', 'Recomendacion_IA');

        const a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = 'ziGO-Recomendacion-IA.png';
        a.click();
    });

    window.addEventListener('beforeunload', () => {
        if (rafIA) cancelAnimationFrame(rafIA);
        if (streamIA) streamIA.getTracks().forEach(t => t.stop());
        try { faceMeshIA?.close(); } catch (e) {}
        try { faceMeshIndividual?.close(); } catch (e) {}
    });
}

/*============================================================
    13. PÁGINA AGENDA: MASCOTA ziGO + SITIO VS DOMICILIO
============================================================*/
function inicializarAgenda() {
    const inlineContainer = document.getElementById('inline-container');
    if (!inlineContainer) return;

    const avatarOptica = document.querySelector('.avatar-optica');
    if (avatarOptica) {
        const iconoHead = document.querySelector('link[rel*="icon"]')?.getAttribute('href') || '../img/mascota_logo2.ico';
        avatarOptica.innerHTML = `<img src="${iconoHead}" alt="Mascota ziGO">`;
    }

    document.querySelectorAll('.accesos-previos-agenda a').forEach(btn => btn.classList.add('btn-acceso-agenda-unificado'));

    const parametrosURL = new URLSearchParams(window.location.search);
    const armazonesURL = parametrosURL.get('armazones') ? decodeURIComponent(parametrosURL.get('armazones')) : '';

    let modalidadSeleccionada = 'En Sitio / Consultorio (Entre semana)';
    let enlaceGoogleMaps = '';
    let direccionDetectada = '';
    let mapaInstancia = null;

    const resumenDiv = document.getElementById('resumen-datos-cita');
    const controlesDomicilio = document.querySelector('.controles-mapa-agenda');
    const mapaBox = document.getElementById('mapa-ubicacion-agenda');
    const textoCoords = document.getElementById('texto-coordenadas-elegidas');
    const bloqueUbicacion = controlesDomicilio ? controlesDomicilio.closest('.bloque-config-cita') : null;
    const tituloUbicacion = bloqueUbicacion ? bloqueUbicacion.querySelector('h3') : null;

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
            <div style="margin-top:4px;">${escaparHTML(CONFIG_ZIGO.direccionSitioZigo)}</div>
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
        tarjetaSitio?.classList.toggle('oculto', esDomicilio);
        if (controlesDomicilio) {
            controlesDomicilio.classList.toggle('oculto', !esDomicilio);
            if (esDomicilio && mapaInstancia) setTimeout(() => mapaInstancia.invalidateSize(), 200);
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
        Bookings.inlineEmbed({ url: zohoUrl, parent: '#inline-container', height: '780px' });
        setTimeout(ajustarCalendarioMovilEstrecho, 700);
    }

    function actualizarResumenVisual(recargarCalendario = true) {
        const esDomicilio = modalidadSeleccionada.toLowerCase().includes('domicilio');
        if (resumenDiv) {
            let html = `<div><strong>Modalidad:</strong> ${escaparHTML(modalidadSeleccionada)}</div>`;
            if (armazonesURL) html += `<div><strong>Armazones:</strong> ${escaparHTML(armazonesURL)}</div>`;
            if (esDomicilio) {
                if (direccionDetectada) html += `<div><strong>Dirección Domicilio:</strong> ${escaparHTML(direccionDetectada)}</div>`;
                if (enlaceGoogleMaps) html += `<div><strong>Google Maps:</strong> <a href="${enlaceGoogleMaps}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;font-weight:bold;">Abrir pin exacto</a></div>`;
            } else {
                html += `<div><strong>Punto de atención:</strong> ${escaparHTML(CONFIG_ZIGO.direccionSitioZigo)}</div>`;
            }
            resumenDiv.innerHTML = html;
        }
        if (recargarCalendario) cargarZohoConDatosPrellenados();
    }

    document.querySelectorAll('input[name="modalidad-cita"]').forEach(radio => {
        radio.addEventListener('change', () => {
            modalidadSeleccionada = radio.value;
            ZigoAnalytics.registrarModalidadCita(modalidadSeleccionada);
            actualizarVistaModalidad();
            actualizarResumenVisual(true);
        });
    });

    if (mapaBox && typeof L !== 'undefined') {
        const mapa = L.map('mapa-ubicacion-agenda').setView([19.4326, -99.1332], 12);
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
                    ? ' <span style="color:#38bdf8;">(Arrastra el pin azul o escribe tu calle y número arriba si deseas afinarlo)</span>'
                    : '';
                textoCoords.innerHTML = `<i class="fas fa-check-circle" style="color:var(--neon-cyan);"></i> Ubicación lista ${escaparHTML(etiqueta)}: <strong>${escaparHTML(direccionDetectada || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)}</strong>${notaAjuste}`;
            }
            actualizarResumenVisual(true);
        }

        mapa.on('click', (e) => fijarPuntoMapa(e.latlng.lat, e.latlng.lng, '(Pin en mapa)'));

        const btnMiUbicacion = document.getElementById('btn-mi-ubicacion');
        btnMiUbicacion?.addEventListener('click', () => {
            if (!navigator.geolocation) { alert('Tu dispositivo no soporta geolocalización GPS.'); return; }
            const textoOriginal = btnMiUbicacion.innerHTML;
            btnMiUbicacion.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calibrando GPS...';

            let mejorLectura = null;
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!mejorLectura || pos.coords.accuracy < mejorLectura.coords.accuracy) mejorLectura = pos;
                    if (pos.coords.accuracy <= 60) {
                        navigator.geolocation.clearWatch(watchId);
                        btnMiUbicacion.innerHTML = textoOriginal;
                        fijarPuntoMapa(pos.coords.latitude, pos.coords.longitude, `(GPS ±${Math.round(pos.coords.accuracy)}m)`, pos.coords.accuracy);
                    }
                },
                () => {
                    navigator.geolocation.clearWatch(watchId);
                    btnMiUbicacion.innerHTML = textoOriginal;
                    alert('No se pudo obtener el GPS automático. Escribe tu calle y número arriba o toca tu casa en el mapa.');
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

        const btnBuscarDir = document.getElementById('btn-buscar-direccion');
        const inputDir = document.getElementById('input-buscar-direccion');
        if (btnBuscarDir && inputDir) {
            const buscarEnMapa = async () => {
                const q = inputDir.value.trim();
                if (!q) return;
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Ciudad de México')}&limit=1`);
                    const datos = await resp.json();
                    if (datos && datos[0]) fijarPuntoMapa(parseFloat(datos[0].lat), parseFloat(datos[0].lon), '(Dirección ingresada)');
                    else alert('No encontramos esa calle exacta. Escribe tu colonia o haz clic directo en tu calle en el mapa.');
                } catch (e) {}
            };
            btnBuscarDir.addEventListener('click', buscarEnMapa);
            inputDir.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarEnMapa(); } });
        }
    }

    actualizarVistaModalidad();
    actualizarResumenVisual(true);
}

function ajustarCalendarioMovilEstrecho() {
    const contenedor = document.getElementById('inline-container');
    if (!contenedor) return;
    const iframe = contenedor.querySelector('iframe');
    if (!iframe) return;
    const anchoPantalla = window.innerWidth;
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
    14. PÁGINA NOSOTROS: BUZÓN DE QUEJAS + NUBE + CORREO
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

        const scoreEquiv = tipo.toLowerCase().includes('felicitación') ? 5 : (tipo.toLowerCase().includes('queja') ? 1 : 3);
        ZigoAnalytics.registrarCalificacion({ score: scoreEquiv, tipo, comentario: mensaje, nombre });
        ZigoAnalytics.registrarConversion('buzonQuejas', `${folio} - ${tipo}`);

        const textoOriginalBtn = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando y enviando...';
        }

        try {
            await fetch(`https://formsubmit.co/ajax/${CONFIG_ZIGO.correoQuejasPrincipal}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
        } catch (err) {}

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
        }

        formQuejas.reset();
        if (respuesta) {
            respuesta.innerHTML = `<div><i class="fas fa-check-circle" style="color:var(--neon-cyan);"></i> <strong>Reporte registrado y guardado (Folio ${escaparHTML(folio)}).</strong> Ya es visible en tus estadísticas de administración.</div>`;
            respuesta.classList.remove('oculto');
        }
    });
}

/*============================================================
    15. PANEL DE ADMINISTRACIÓN (pages/admin.html) CON TOKEN Y NUBE
============================================================*/
function inicializarPanelAdmin() {
    if (!document.getElementById('kpi-rating')) return;

    let datosActualesPanel = ZigoAnalytics.cargarDatos();

    function dibujarGraficaMontana(datos) {
        const pathLine = document.getElementById('chart-line');
        const pathArea = document.getElementById('chart-area');
        if (!pathLine || !datos.length) return;

        const max = Math.max(...datos, 1);
        const width = 600;
        const height = 100;
        const step = width / (datos.length - 1 || 1);

        const points = datos.map((val, i) => {
            const x = i * step;
            const y = height - (val / max) * 75 - 15;
            return `${x},${y}`;
        });

        pathLine.setAttribute('d', `M ${points.join(' L ')}`);
        pathArea.setAttribute('d', `M 0,120 L ${points.join(' L ')} L ${width},120 Z`);
    }

    function renderDashboard(datosNube = null) {
        const local = ZigoAnalytics.cargarDatos();
        const d = datosNube ? {
            ...local,
            ...datosNube,
            fuentesTrafico: { ...local.fuentesTrafico, ...(datosNube.fuentesTrafico || {}) },
            armazonesProbadosAR: { ...local.armazonesProbadosAR, ...(datosNube.armazonesProbadosAR || {}) },
            calificaciones: Array.isArray(datosNube.calificaciones) && datosNube.calificaciones.length
                ? datosNube.calificaciones
                : local.calificaciones
        } : local;

        datosActualesPanel = d;

        const calificaciones = d.calificaciones || [];
        const modelosVistos = d.armazonesProbadosAR || {};
        const fuentes = d.fuentesTrafico || { Google: 0, RedesSociales: 0, Directo: 0 };

        const promedio = calificaciones.length
            ? (calificaciones.reduce((acc, c) => acc + Number(c.score || c.rating || 0), 0) / calificaciones.length).toFixed(1)
            : '0.0';

        document.getElementById('kpi-rating').textContent = `${promedio} / 5 ⭐`;
        document.getElementById('kpi-rating-count').textContent = `${calificaciones.length} valoraciones registradas`;
        document.getElementById('kpi-ar').textContent = Object.values(modelosVistos).reduce((a, b) => a + Number(b || 0), 0);
        document.getElementById('kpi-google').textContent = fuentes.Google || 0;
        document.getElementById('kpi-social').textContent = fuentes.RedesSociales || 0;

        const emojis = { 5: '🤩 Excelente (5)', 4: '🙂 Buena (4)', 3: '😐 Regular (3)', 2: '😕 Mala (2)', 1: '😡 Muy mala (1)' };
        const totalCal = calificaciones.length || 1;
        document.getElementById('chart-caritas').innerHTML = [5, 4, 3, 2, 1].map(n => {
            const count = calificaciones.filter(c => Number(c.score || c.rating) === n).length;
            const pct = Math.round((count / totalCal) * 100);
            return `
                <div style="margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.88rem;">
                        <span>${emojis[n]}</span><span>${count} (${pct}%)</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
                </div>
            `;
        }).join('');

        const totalFuentes = Object.values(fuentes).reduce((a, b) => a + Number(b || 0), 0) || 1;
        document.getElementById('chart-fuentes').innerHTML = Object.entries(fuentes).map(([canal, total]) => {
            const pct = Math.round((Number(total || 0) / totalFuentes) * 100);
            return `
                <div style="margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.88rem;">
                        <span><strong>${escaparHTML(canal)}</strong></span><span>${total} visitas (${pct}%)</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
                </div>
            `;
        }).join('');

        const felicitaciones = calificaciones.filter(c => Number(c.score || c.rating) >= 4 || (c.tipo && c.tipo.toLowerCase().includes('felicitación')));
        const quejas = calificaciones.filter(c => Number(c.score || c.rating) <= 2 || (c.tipo && (c.tipo.toLowerCase().includes('queja') || c.tipo.toLowerCase().includes('inconformidad'))));
        const sugerencias = calificaciones.filter(c => !felicitaciones.includes(c) && !quejas.includes(c));

        const listaFelic = felicitaciones.concat(sugerencias);
        document.getElementById('lista-felicitaciones').innerHTML = listaFelic.length
            ? listaFelic.map(c => `
                <div class="comentario-box">
                    <span class="badge-tipo ${Number(c.score || c.rating) >= 4 ? 'badge-felicitacion' : 'badge-sugerencia'}">${'⭐'.repeat(Number(c.score || c.rating || 5))} ${escaparHTML(c.tipo || 'Opinión')}</span>
                    <p style="margin:0.25rem 0;color:#e2e8f0;">"${escaparHTML(c.comentario || c.mensaje || 'Sin comentario escrito')}"</p>
                    <span style="color:#64748b;font-size:0.75rem;">${escaparHTML(c.nombre || 'Anónimo')} — ${new Date(c.fecha || Date.now()).toLocaleDateString('es-MX')}</span>
                </div>
            `).join('')
            : '<p style="color:#64748b;margin:0;font-size:0.88rem;">No hay felicitaciones registradas todavía.</p>';

        document.getElementById('lista-quejas').innerHTML = quejas.length
            ? quejas.map(c => `
                <div class="comentario-box">
                    <span class="badge-tipo badge-queja">⚠️ Queja / Inconformidad</span>
                    <p style="margin:0.25rem 0;color:#e2e8f0;">"${escaparHTML(c.comentario || c.mensaje || c.detalle || 'Sin descripción')}"</p>
                    <span style="color:#64748b;font-size:0.75rem;">${escaparHTML(c.nombre || 'Paciente / Cliente')} — ${new Date(c.fecha || Date.now()).toLocaleDateString('es-MX')}</span>
                </div>
            `).join('')
            : '<p style="color:#64748b;margin:0;font-size:0.88rem;">¡Excelente! No hay quejas registradas.</p>';

        const entries = Object.entries(modelosVistos).sort((a, b) => Number(b[1]) - Number(a[1]));
        const maxMod = entries.length ? Number(entries[0][1]) : 1;
        document.getElementById('chart-modelos').innerHTML = entries.length
            ? entries.map(([nombre, total]) => `
                <div style="margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.88rem;">
                        <span>${escaparHTML(nombre)}</span><span>${total} pruebas</span>
                    </div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${Math.round((Number(total) / maxMod) * 100)}%"></div></div>
                </div>
            `).join('')
            : '<p style="color:#64748b;">Aún no hay pruebas en AR registradas.</p>';

        const serieGrafica = entries.map(e => Number(e[1])).concat(Object.values(fuentes).map(Number));
        dibujarGraficaMontana(serieGrafica.length >= 2 ? serieGrafica : [2, 5, 4, 9, 7, 12]);
    }

    // Render inmediato con caché local + actualización automática desde Google Apps Script
    renderDashboard();
    ZigoAnalytics.obtenerDatosDesdeNube().then(datosNube => {
        if (datosNube) renderDashboard(datosNube);
    });

    // Sistema de Token de 6 dígitos para Exportar CSV y Reiniciar Datos
    let tokenGeneradoActual = null;
    let accionPendienteToken = null;

    async function iniciarVerificacionToken(callbackAccion) {
        tokenGeneradoActual = Math.floor(100000 + Math.random() * 900000).toString();
        accionPendienteToken = callbackAccion;

        const estadoTxt = document.getElementById('token-estado-txt');
        const contenedorInput = document.getElementById('contenedor-input-token');
        const modalOverlay = document.getElementById('modal-token-overlay');

        estadoTxt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando código de seguridad...';
        contenedorInput.style.display = 'none';
        document.getElementById('input-token-ingresado').value = '';
        document.getElementById('modal-token-error').style.display = 'none';
        modalOverlay.style.display = 'flex';

        try {
            await fetch(`https://formsubmit.co/ajax/${CONFIG_ZIGO.correoQuejasCopia}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `🔐 Token de Seguridad ziGO: ${tokenGeneradoActual}`,
                    _template: 'box',
                    Mensaje: `Tu código de verificación aleatorio de 6 dígitos es: ${tokenGeneradoActual}. Ingrésalo en el panel para autorizar la acción.`
                })
            });
        } catch (e) {}

        estadoTxt.innerHTML = 'Se ha enviado un token de seguridad al administrador de la web. Ingrésalo aquí:';
        contenedorInput.style.display = 'block';
        document.getElementById('input-token-ingresado').focus();
    }

    document.getElementById('btn-token-cancelar')?.addEventListener('click', () => {
        document.getElementById('modal-token-overlay').style.display = 'none';
        tokenGeneradoActual = null;
        accionPendienteToken = null;
    });

    document.getElementById('btn-token-verificar')?.addEventListener('click', () => {
        const ingresado = document.getElementById('input-token-ingresado').value.trim();
        if (ingresado === tokenGeneradoActual) {
            const tokenUsado = tokenGeneradoActual;
            document.getElementById('modal-token-overlay').style.display = 'none';
            if (typeof accionPendienteToken === 'function') accionPendienteToken(tokenUsado);
            tokenGeneradoActual = null;
            accionPendienteToken = null;
        } else {
            document.getElementById('modal-token-error').style.display = 'block';
        }
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
        iniciarVerificacionToken((tokenValido) => {
            if (confirm('¿Estás 100% seguro de borrar todas las estadísticas y reportes acumulados?')) {
                ZigoAnalytics.limpiarDatosLocales();
                ZigoAnalytics.sincronizarConNube('reset', { token: tokenValido });
                renderDashboard();
                alert('Datos reiniciados correctamente.');
            }
        });
    });

    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        iniciarVerificacionToken(() => {
            const d = datosActualesPanel;
            const filas = ['Categoria,Metrica,Valor'];
            (d.calificaciones || []).forEach(c => {
                const textoLimpio = String(c.comentario || c.mensaje || '').replace(/"/g, '""');
                filas.push(`Encuesta,"Estrellas: ${c.score || c.rating} (${c.tipo || 'Opinion'}) - ${textoLimpio}",${c.fecha || ''}`);
            });
            Object.entries(d.armazonesProbadosAR || {}).forEach(([k, v]) => filas.push(`ArmazonAR,"${k}",${v}`));
            Object.entries(d.fuentesTrafico || {}).forEach(([k, v]) => filas.push(`FuenteTrafico,"${k}",${v}`));
            Object.entries(d.visitasPagina || {}).forEach(([k, v]) => filas.push(`VisitaPagina,"${k}",${v}`));

            const blob = new Blob(['\uFEFF' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `zigo-reporte-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
        });
    });
}

/*============================================================
    16. SEGUIMIENTO GLOBAL DE CONVERSIONES E INICIALIZACIÓN
============================================================*/
function inicializarSeguimientoConversiones() {
    document.addEventListener('click', (e) => {
        const enlace = e.target.closest('a');
        if (!enlace) return;
        const href = enlace.getAttribute('href') || '';
        const canal = enlace.dataset.canal || '';

        if (canal === 'whatsapp' || href.includes('wa.me')) ZigoAnalytics.registrarConversion('whatsapp', href);
        else if (canal === 'telegram' || href.includes('t.me')) ZigoAnalytics.registrarConversion('telegram', href);
        else if (canal === 'llamada' || href.startsWith('tel:')) ZigoAnalytics.registrarConversion('llamada', href);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ZigoAnalytics.inicializarGA4Opcional();
    ZigoAnalytics.registrarVistaPagina();
    inicializarSEOEstructurado();

    prepararIdentidadEInclusionDOM();
    inicializarBuscadorInterno();
    inicializarAccesibilidadYWidgets();
    inicializarWidgetSatisfaccion();
    inicializarTestimonios5Estrellas();
    adaptarImagenesIndexATema();
    limpiarFondosCatalogoTarjetas();
    inicializarCatalogoArmazones();
    inicializarAsistenteIA();
    inicializarBuzonQuejas();
    inicializarPanelAdmin();
    inicializarSeguimientoConversiones();
});

window.addEventListener('load', () => {
    inicializarAgenda();
    setTimeout(ajustarCalendarioMovilEstrecho, 800);
});

window.addEventListener('resize', ajustarCalendarioMovilEstrecho);
window.addEventListener('pageshow', actualizarContadorArmazones);