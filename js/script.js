/**
**************************************************************
            Motor ziGO: Armazones y Transferencia de Datos
**************************************************************
 */

// --- 1. Modales (Catálogo) ---
function abrirModal(nombre, imagen, material, descripcion) {
    document.getElementById('modal-titulo').innerText = nombre;
    document.getElementById('modal-img').src = imagen;
    document.getElementById('modal-material').innerText = `Material: ${material}`;
    document.getElementById('modal-descripcion').innerText = descripcion;
    document.getElementById('modal-detalles').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-detalles').style.display = 'none';
}

// --- 2. Contador de Selección y Barra Flotante ---
function actualizarContador() {
    const seleccionados = document.querySelectorAll('.seleccionar-armazon:checked');
    const contadorSpan = document.getElementById('contador-seleccionados');
    const panelFlotante = document.querySelector('.panel-agendar-flotante');

    if (contadorSpan && panelFlotante) {
        contadorSpan.innerText = seleccionados.length;
        
        // Reiniciamos la animación del latido para que se note el cambio
        contadorSpan.classList.remove('pop-anim');
        void contadorSpan.offsetWidth; 
        contadorSpan.classList.add('pop-anim');
        
        if (seleccionados.length > 0) {
            panelFlotante.classList.add('activo');
        } else {
            panelFlotante.classList.remove('activo');
        }
    }
}

// --- 3. Filtros del Catálogo ---
function inicializarFiltros() {
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    const tarjetas = document.querySelectorAll('.armazon-card');

    if (botonesFiltro.length === 0 || tarjetas.length === 0) return;

    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            botonesFiltro.forEach(b => b.classList.remove('activo'));
            boton.classList.add('activo');
            const filtroSeleccionado = boton.getAttribute('data-filtro');

            tarjetas.forEach(tarjeta => {
                const categoriaTarjeta = tarjeta.getAttribute('data-categoria');
                if (filtroSeleccionado === 'todos' || categoriaTarjeta === filtroSeleccionado) {
                    tarjeta.style.display = 'flex';
                    setTimeout(() => {
                        tarjeta.style.opacity = '1';
                        tarjeta.style.transform = 'translateY(0) scale(1)';
                    }, 10);
                } else {
                    tarjeta.style.opacity = '0';
                    tarjeta.style.transform = 'translateY(10px) scale(0.95)';
                    setTimeout(() => {
                        tarjeta.style.display = 'none';
                    }, 400); 
                }
            });
        });
    });
}

// --- 4. Empaquetado y Envío a la página de Agenda ---
function irAColocarCita() {
    const nodosSeleccionados = document.querySelectorAll('.seleccionar-armazon:checked');
    const seleccionados = Array.from(nodosSeleccionados).map(cb => cb.value);

    if (seleccionados.length === 0) {
        alert("Por favor selecciona al menos un armazón para continuar.");
        return;
    }
    
    // Convertimos el arreglo a un string seguro para la URL
    const listaArmazones = encodeURIComponent(seleccionados.join(", "));
    // Mandamos al usuario a la página de agenda pasando los datos por la URL (método GET visual)
    window.location.href = `agenda.html?armazones=${listaArmazones}`;
}

// --- 5. Recepción y Desempaquetado en la página de Agenda ---
function procesarArmazonesEnAgenda() {
    // Leemos los parámetros que vienen en la barra de direcciones (ej: ?armazones=ziGO%20Focus)
    const parametrosURL = new URLSearchParams(window.location.search);
    const armazonesCrudos = parametrosURL.get('armazones');
    const contenedorNotas = document.getElementById('notas-armazones-box');
    const listaHtml = document.getElementById('lista-armazones-interes');

    if (armazonesCrudos && contenedorNotas && listaHtml) {
        // Quitamos la clase 'oculto' para que el recuadro neón se haga visible
        contenedorNotas.classList.remove('oculto');
        // Separamos el string en un arreglo y los inyectamos al HTML
        const arrayArmazones = armazonesCrudos.split(',');
        
        let contenidoLista = '';
        arrayArmazones.forEach(modelo => {
            contenidoLista += `<li><i class="fas fa-glasses"></i> ${modelo.trim()}</li>`;
        });
        
        listaHtml.innerHTML = contenidoLista;
    }
}

// --- 6. Inicialización Maestra ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners del catálogo
    const checkboxes = document.querySelectorAll('.seleccionar-armazon');
    checkboxes.forEach(box => {
        box.addEventListener('change', actualizarContador);
    });
    
    // Verificamos estado inicial por si el navegador guardó selecciones previas
    actualizarContador(); 
    inicializarFiltros();
    
    // Verificamos si estamos en la página de agenda para procesar la lista
    procesarArmazonesEnAgenda();
});

// Respaldo para navegadores que usan caché de retroceso (Botón Atrás del celular)
window.addEventListener('pageshow', actualizarContador);

/**
**************************************************************
            Probador Virtual (Optimizado On-Demand)
**************************************************************
 */

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('webcam-feed');
    const btnCaptura = document.getElementById('btn-captura');
    const btnEscanear = document.getElementById('btn-escanear-ia');
    const panelResultado = document.getElementById('resultado-ia');
    
    // Referencia opcional a un botón que abra el probador (Asegúrate de tenerlo en tu HTML o ajústalo a tu lógica)
    // const btnAbrirProbador = document.getElementById('btn-abrir-probador');
    
    let streamActivo = null;

    // 1. Función para iniciar la cámara (SOLO se ejecuta cuando el usuario lo solicita explícitamente)
    function iniciarCamara() {
        if (streamActivo) return; // Si ya está encendida, no hace nada

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                .then(function(stream) {
                    streamActivo = stream;
                    video.srcObject = stream;
                })
                .catch(function(error) {
                    console.error("Error al acceder a la cámara:", error);
                    alert("Por favor, permite el acceso a la cámara para usar el probador virtual.");
                });
        } else {
            alert("Tu navegador no soporta el acceso a la cámara.");
        }
    }

    // OPCIÓN A: Si tienes un botón para abrir el probador, enlázalo aquí:
    /*
    if (btnAbrirProbador) {
        btnAbrirProbador.addEventListener('click', () => {
            // Aquí abres tu modal/sección y luego enciendes la cámara
            iniciarCamara();
        });
    }
    */

    // NOTA: Si prefieres que la cámara arranque cuando el usuario haga clic en cualquier parte de la sección del probador 
    // o al presionar un botón específico, simplemente llama a `iniciarCamara()` dentro de ese evento de clic.


    // 2. Funcionalidad del Botón: Tomar Foto / Captura
    btnCaptura.addEventListener('click', () => {
        if (!streamActivo) {
            alert("La cámara no está activa. Por favor, actívala primero.");
            return;
        }

        // Creamos un canvas temporal en memoria para dibujar el frame del video
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const context = canvas.getContext('2d');
        
        // Espejamos el canvas antes de dibujar para que la foto no salga al revés
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        // Dibujamos lo que la cámara ve en este instante
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convertimos el canvas a una imagen (Base64) y forzamos la descarga
        const dataURL = canvas.toDataURL('image/png');
        const enlaceDescarga = document.createElement('a');
        enlaceDescarga.href = dataURL;
        enlaceDescarga.download = 'ziGO-Mi-Estilo-Cosmico.png';
        enlaceDescarga.click();
    });

    // 3. Simulación del Análisis IA
    btnEscanear.addEventListener('click', () => {
        // Cambiamos el estado del botón para simular carga
        const originalText = btnEscanear.innerHTML;
        btnEscanear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando biometría...';
        btnEscanear.disabled = true;

        // Simulamos un retraso de 2.5 segundos de procesamiento
        setTimeout(() => {
            btnEscanear.innerHTML = '<i class="fas fa-check"></i> Análisis Completado';
            btnEscanear.style.backgroundColor = 'var(--bg-color-dark)';
            btnEscanear.style.border = '2px solid var(--neon-cyan)';
            btnEscanear.style.color = 'var(--neon-cyan)';
            
            // Mostramos el panel de resultados
            panelResultado.classList.remove('oculto');
        }, 2500);
    });
});