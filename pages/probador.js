// js/probador-ar.js
(() => {
  const CATALOGO = JSON.parse(localStorage.getItem('zigo_catalogo') || 'null') || [
    { id: 'zigo-focus', nombre: 'ziGO Focus', subtitulo: 'Acetato Premium · Rectangular', imagen: '../assets/img/armazones/focus.png', colorMarco: '#5c3a21', forma: 'rectangular', rostrosIdeales: ['Ovalado', 'Redondo', 'Corazón'] },
    { id: 'zigo-kinetic', nombre: 'ziGO Kinetic', subtitulo: 'Titanio Ligero · Geométrico', imagen: '../assets/img/armazones/kinetic.png', colorMarco: '#8b7d6b', forma: 'geometrico', rostrosIdeales: ['Redondo', 'Ovalado', 'Diamante'] },
    { id: 'zigo-metro', nombre: 'ziGO Metro', subtitulo: 'Acetato Urbano · Redondeado', imagen: '../assets/img/armazones/metro.png', colorMarco: '#c97b84', forma: 'redondo', rostrosIdeales: ['Cuadrado', 'Alargado', 'Diamante'] },
    { id: 'zigo-urban', nombre: 'ziGO Urban', subtitulo: 'Metálico Aviador · Clásico', imagen: '../assets/img/armazones/urban.png', colorMarco: '#2b2d2f', forma: 'aviador', rostrosIdeales: ['Cuadrado', 'Ovalado', 'Corazón'] }
  ];

  // Estado del probador
  const state = {
    modeloActivo: CATALOGO[0],
    spriteProcesado: null,
    usandoFoto: false,
    imagenEstatica: null,
    camaraActiva: false,
    brillo: 100,
    contraste: 100,
    ultimoDiagnostico: null,
    // Suavizado exponencial (EMA) para eliminar temblor
    poseSuavizada: null
  };

  // Leer modelo desde URL (?modelo=...) o localStorage
  const params = new URLSearchParams(window.location.search);
  const modeloParam = params.get('modelo') || localStorage.getItem('zigo_ar_modelo_activo');
  if (modeloParam) {
    const encontrado = CATALOGO.find(m => m.id === modeloParam || m.nombre.toLowerCase().includes(modeloParam.toLowerCase()));
    if (encontrado) state.modeloActivo = encontrado;
  }

  // 1. Limpiar fondo blanco y recortar márgenes vacíos del armazón automáticamente
  function generarSpriteVectorial(modelo) {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 220;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = modelo.colorMarco || '#222';
    ctx.lineWidth = 14;
    ctx.fillStyle = 'rgba(200, 235, 255, 0.16)';

    // Puente nasal
    ctx.beginPath();
    ctx.moveTo(270, 82);
    ctx.quadraticCurveTo(300, 72, 330, 82);
    ctx.stroke();

    // Lente izquierdo y derecho según forma
    const drawLens = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      ctx.stroke();
      // Reflejo cristal realista
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + 25, y + h - 22);
      ctx.lineTo(x + 55, y + 22);
      ctx.stroke();
      ctx.restore();
    };

    const radio = modelo.forma === 'redondo' ? 65 : modelo.forma === 'aviador' ? [18, 18, 55, 45] : 22;
    drawLens(40, 42, 230, 132, radio);
    drawLens(330, 42, 230, 132, radio);

    // Bisagras laterales
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(26, 72, 16, 12);
    ctx.fillRect(558, 72, 16, 12);
    return c;
  }

  function cargarSpriteArmazon(modelo) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const temp = document.createElement('canvas');
        temp.width = img.naturalWidth;
        temp.height = img.naturalHeight;
        const tctx = temp.getContext('2d');
        tctx.drawImage(img, 0, 0);

        const imgData = tctx.getImageData(0, 0, temp.width, temp.height);
        const data = imgData.data;
        let minX = temp.width, minY = temp.height, maxX = 0, maxY = 0;
        let hayPixeles = false;

        // Quitar fondo blanco/gris claro y detectar caja exacta del lente
        for (let y = 0; y < temp.height; y++) {
          for (let x = 0; x < temp.width; x++) {
            const i = (y * temp.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a > 20 && r > 232 && g > 232 && b > 232) {
              data[i + 3] = 0; // Hacer transparente el fondo blanco
            } else if (data[i + 3] > 30) {
              hayPixeles = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!hayPixeles || maxX <= minX || maxY <= minY) {
          resolve(generarSpriteVectorial(modelo));
          return;
        }

        tctx.putImageData(imgData, 0, 0);
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const cropped = document.createElement('canvas');
        cropped.width = cropW;
        cropped.height = cropH;
        cropped.getContext('2d').drawImage(temp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(cropped);
      };
      img.onerror = () => resolve(generarSpriteVectorial(modelo));
      img.src = modelo.imagen;
    });
  }

  // 2. Privacidad y Aviso Legal (LFPDPPP)
  function mostrarModalPrivacidad(onAceptar = null) {
    let modal = document.getElementById('zigo-privacy-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zigo-privacy-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(3,10,22,0.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;padding:1rem;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#0a192f;border:1px solid #0ea5e9;border-radius:18px;max-width:500px;width:100%;padding:1.75rem;color:#f8fafc;box-shadow:0 25px 60px rgba(0,0,0,0.75);">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem;">
          <span style="font-size:1.5rem;">🔒</span>
          <h3 style="margin:0;color:#38bdf8;font-size:1.2rem;">Tu Privacidad y Seguridad en ziGO</h3>
        </div>
        <p style="font-size:0.93rem;line-height:1.6;color:#cbd5e1;margin-bottom:0.85rem;">
          Para tu total tranquilidad, nuestro <strong>Probador Virtual AR</strong> y <strong>Recomendador IA</strong> funcionan <strong>100% en tiempo real dentro de tu navegador</strong>:
        </p>
        <ul style="font-size:0.88rem;line-height:1.6;color:#94a3b8;padding-left:1.2rem;margin-bottom:1.25rem;">
          <li><strong>Cero almacenamiento:</strong> No grabamos video ni guardamos fotografías de tu rostro en ningún servidor.</li>
          <li><strong>Sin huella biométrica:</strong> Los puntos faciales se calculan en memoria volátil y se destruyen al instante al cerrar o cambiar de página.</li>
          <li><strong>Uso exclusivo de prueba:</strong> La imagen solo se utiliza para ajustar el tamaño del armazón sobre tu rostro.</li>
        </ul>
        <div style="background:rgba(14,165,233,0.1);border-left:3px solid #0ea5e9;padding:0.65rem 0.85rem;border-radius:6px;font-size:0.82rem;color:#bae6fd;margin-bottom:1.25rem;">
          <strong>Aviso de Privacidad Simplificado:</strong> ziGO Óptica Móvil protege tus datos personales conforme a la LFPDPPP. No transferimos ni comercializamos información personal o biométrica de nuestros usuarios.
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
          <button id="btn-privacidad-ok" style="background:#0ea5e9;color:#04101e;border:none;font-weight:700;padding:0.7rem 1.4rem;border-radius:999px;cursor:pointer;">
            ${onAceptar ? 'Entendido, continuar' : 'Cerrar aviso'}
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('btn-privacidad-ok').onclick = () => {
      modal.style.display = 'none';
      sessionStorage.setItem('zigo_privacidad_vista', '1');
      if (typeof onAceptar === 'function') onAceptar();
    };
  }

  // 3. Cálculo anatómico y renderizado 2.5D estilo Lux.mx
  function suavizar(prev, curr, alpha = 0.38) {
    if (!prev) return { ...curr };
    const out = {};
    for (const k in curr) {
      out[k] = prev[k] + alpha * (curr[k] - prev[k]);
    }
    return out;
  }

  function calcularPoseYProporciones(landmarks, width, height, espejado) {
    const mapX = (lm) => (espejado ? (1 - lm.x) : lm.x) * width;
    const mapY = (lm) => lm.y * height;

    // Puntos clave de MediaPipe FaceMesh
    const sienIzq = { x: mapX(landmarks[234]), y: mapY(landmarks[234]) };
    const sienDer = { x: mapX(landmarks[454]), y: mapY(landmarks[454]) };
    const puenteNasal = { x: mapX(landmarks[168]), y: mapY(landmarks[168]) };
    const ojoIzqExt = { x: mapX(landmarks[33]), y: mapY(landmarks[33]) };
    const ojoDerExt = { x: mapX(landmarks[263]), y: mapY(landmarks[263]) };
    const puntaNariz = { x: mapX(landmarks[1]), y: mapY(landmarks[1]) };
    const frente = { x: mapX(landmarks[10]), y: mapY(landmarks[10]) };
    const menton = { x: mapX(landmarks[152]), y: mapY(landmarks[152]) };
    const mandibulaIzq = { x: mapX(landmarks[172]), y: mapY(landmarks[172]) };
    const mandibulaDer = { x: mapX(landmarks[397]), y: mapY(landmarks[397]) };
    const frenteIzq = { x: mapX(landmarks[103]), y: mapY(landmarks[103]) };
    const frenteDer = { x: mapX(landmarks[332]), y: mapY(landmarks[332]) };

    // Ordenar izquierda/derecha real en pantalla
    const leftT = sienIzq.x < sienDer.x ? sienIzq : sienDer;
    const rightT = sienIzq.x < sienDer.x ? sienDer : sienIzq;
    const leftEye = ojoIzqExt.x < ojoDerExt.x ? ojoIzqExt : ojoDerExt;
    const rightEye = ojoIzqExt.x < ojoDerExt.x ? ojoDerExt : ojoIzqExt;

    // Ancho total de rostro (sien a sien) * 1.08 para ajuste natural de varillas
    const anchoSienes = Math.hypot(rightT.x - leftT.x, rightT.y - leftT.y);
    const anchoArmazon = anchoSienes * 1.08;

    // Inclinación lateral (Roll)
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    // Giro horizontal (Yaw): qué tanto mira a izquierda o derecha
    const centroSienesX = (leftT.x + rightT.x) / 2;
    const ratioYaw = Math.max(-1, Math.min(1, (puntaNariz.x - centroSienesX) / (anchoSienes * 0.48)));
    const yawAngle = ratioYaw * 0.85; // radianes aproximados
    const escalaYaw = Math.max(0.48, Math.cos(yawAngle));

    // Inclinación vertical (Pitch)
    const altoRostro = Math.hypot(menton.x - frente.x, menton.y - frente.y);
    const centroVertical = (frente.y + menton.y) / 2;
    const ratioPitch = (puenteNasal.y - centroVertical) / (altoRostro || 1);

    // Proporciones para Diagnóstico IA
    const anchoFrente = Math.hypot(frenteDer.x - frenteIzq.x, frenteDer.y - frenteIzq.y);
    const anchoMandibula = Math.hypot(mandibulaDer.x - mandibulaIzq.x, mandibulaDer.y - mandibulaIzq.y);

    return {
      pose: {
        x: puenteNasal.x + ratioYaw * (anchoSienes * 0.06),
        y: puenteNasal.y + altoRostro * 0.018,
        width: anchoArmazon,
        roll,
        escalaYaw,
        ratioYaw,
        ratioPitch
      },
      proporciones: {
        anchoFrente,
        anchoPomulos: anchoSienes,
        anchoMandibula,
        altoRostro
      }
    };
  }

  function dibujarArmazonEnCanvas(ctx, sprite, poseRaw) {
    if (!sprite || !poseRaw) return;
    state.poseSuavizada = suavizar(state.poseSuavizada, poseRaw, 0.4);
    const p = state.poseSuavizada;

    const aspect = sprite.height / sprite.width;
    const drawW = p.width * p.escalaYaw;
    const drawH = p.width * aspect;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.roll);

    // Ligera perspectiva 2.5D al girar la cabeza de perfil
    const skewY = p.ratioYaw * 0.14;
    ctx.transform(1, skewY, 0, 1, 0, 0);

    // Sombra sutil sobre la nariz y mejillas para realismo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    ctx.drawImage(sprite, -drawW / 2, -drawH * 0.44, drawW, drawH);
    ctx.restore();
  }

  function diagnosticarRostro(prop) {
    const ratioAltoAncho = prop.altoRostro / (prop.anchoPomulos || 1);
    const diffFrenteMandibula = (prop.anchoFrente - prop.anchoMandibula) / (prop.anchoPomulos || 1);
    const ratioMandibulaPomulo = prop.anchoMandibula / (prop.anchoPomulos || 1);

    let forma = 'Ovalado';
    let descripcion = 'Tus proporciones entre frente, pómulos y mandíbula son equilibradas; prácticamente cualquier estilo armoniza contigo.';

    if (ratioAltoAncho > 1.38) {
      forma = 'Alargado';
      descripcion = 'Tu rostro es más largo que ancho. Los armazones altos y redondeados aportan amplitud y equilibrio.';
    } else if (diffFrenteMandibula > 0.14) {
      forma = 'Corazón';
      descripcion = 'Frente ligeramente más amplia y mentón afinado. Los modelos aviador o rectangulares suaves suavizan la parte superior.';
    } else if (ratioMandibulaPomulo > 0.88 && ratioAltoAncho < 1.18) {
      forma = 'Cuadrado';
      descripcion = 'Línea mandibular definida y frente amplia. Los armazones redondeados u ovalados suavizan tus facciones.';
    } else if (ratioAltoAncho < 1.14) {
      forma = 'Redondo';
      descripcion = 'Mejillas suaves y proporciones simétricas. Los armazones rectangulares o geométricos estilizan y alargan visualmente.';
    } else if (ratioMandibulaPomulo < 0.76 && diffFrenteMandibula < 0.05) {
      forma = 'Diamante';
      descripcion = 'Pómulos prominentes con frente y mentón estrechos. Los diseños redondeados y de titanio ligero destacan tu mirada.';
    }

    const recomendados = CATALOGO.filter(m => m.rostrosIdeales.includes(forma));
    return {
      forma,
      descripcion,
      recomendados: recomendados.length ? recomendados : CATALOGO.slice(0, 3)
    };
  }

  // 4. Inicialización de UI y Cámara / Foto
  document.addEventListener('DOMContentLoaded', async () => {
    state.spriteProcesado = await cargarSpriteArmazon(state.modeloActivo);

    // Conectar selector de armazones en probador.html
    const selectArmazon = document.querySelector('select');
    if (selectArmazon) {
      selectArmazon.innerHTML = CATALOGO.map(m =>
        `<option value="${m.id}" ${m.id === state.modeloActivo.id ? 'selected' : ''}>${m.nombre} (${m.subtitulo})</option>`
      ).join('');

      selectArmazon.addEventListener('change', async () => {
        const sel = CATALOGO.find(m => m.id === selectArmazon.value);
        if (sel) {
          state.modeloActivo = sel;
          state.spriteProcesado = await cargarSpriteArmazon(sel);
          if (state.usandoFoto && state.imagenEstatica) procesarImagenEstatica(state.imagenEstatica);
        }
      });
    }

    // Mostrar aviso de privacidad automático la primera vez que entra al probador
    if (!sessionStorage.getItem('zigo_privacidad_vista')) {
      mostrarModalPrivacidad();
    }

    // Hacer clicable el sello de privacidad para abrir el Aviso completo
    document.querySelectorAll('p, div, span').forEach(el => {
      if (el.children.length === 0 && el.textContent.includes('Privacidad Garantizada')) {
        el.style.cursor = 'pointer';
        el.title = 'Haz clic para leer el Aviso de Privacidad';
        el.addEventListener('click', () => mostrarModalPrivacidad());
      }
    });

    // Eliminar botón duplicado "Subir foto de mi rostro" si existen dos en el DOM
    const botonesSubir = [...document.querySelectorAll('button, label')].filter(b =>
      b.textContent.trim().toLowerCase() === 'subir foto de mi rostro'
    );
    if (botonesSubir.length > 1) {
      botonesSubir[1].style.display = 'none';
    }

    // Botón "Analizar mi Rostro" (Recomendador IA)
    const btnAnalizar = [...document.querySelectorAll('button')].find(b =>
      b.textContent.toLowerCase().includes('analizar mi rostro')
    );
    if (btnAnalizar) {
      btnAnalizar.addEventListener('click', async () => {
        if (!state.ultimoDiagnostico) {
          alert('Coloca tu rostro frente a la cámara o sube una fotografía clara primero.');
          return;
        }
        const diag = state.ultimoDiagnostico;
        // Seleccionar automáticamente el primer modelo recomendado y probarlo en vivo
        const mejorModelo = diag.recomendados[0];
        if (mejorModelo) {
          state.modeloActivo = mejorModelo;
          if (selectArmazon) selectArmazon.value = mejorModelo.id;
          state.spriteProcesado = await cargarSpriteArmazon(mejorModelo);
          if (state.usandoFoto && state.imagenEstatica) procesarImagenEstatica(state.imagenEstatica);
        }
        mostrarResultadoDiagnosticoIA(diag, btnAnalizar.parentElement);
      });
    }
  });

  function mostrarResultadoDiagnosticoIA(diag, contenedor) {
    let box = document.getElementById('zigo-resultado-ia');
    if (!box) {
      box = document.createElement('div');
      box.id = 'zigo-resultado-ia';
      box.style.cssText = 'margin-top:1rem;padding:1rem;background:rgba(14,165,233,0.1);border:1px solid #0284c7;border-radius:12px;color:#e2e8f0;font-size:0.9rem;';
      contenedor.appendChild(box);
    }
    box.innerHTML = `
      <div style="font-weight:700;color:#38bdf8;margin-bottom:0.35rem;">✨ Rostro detectado: ${diag.forma}</div>
      <p style="margin:0 0 0.75rem;color:#cbd5e1;font-size:0.85rem;">${diag.descripcion}</p>
      <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:0.4rem;">Haz clic para probarte los modelos ideales:</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
        ${diag.recomendados.map(m => `
          <button type="button" data-try-model="${m.id}" style="background:#0ea5e9;color:#04101e;border:none;border-radius:999px;padding:0.35rem 0.8rem;font-weight:700;font-size:0.8rem;cursor:pointer;">
            👓 ${m.nombre}
          </button>
        `).join('')}
      </div>
    `;

    box.querySelectorAll('[data-try-model]').forEach(btn => {
      btn.onclick = async () => {
        const m = CATALOGO.find(item => item.id === btn.dataset.tryModel);
        if (!m) return;
        state.modeloActivo = m;
        const sel = document.querySelector('select');
        if (sel) sel.value = m.id;
        state.spriteProcesado = await cargarSpriteArmazon(m);
        if (state.usandoFoto && state.imagenEstatica) procesarImagenEstatica(state.imagenEstatica);
      };
    });
  }

  // Exponer API global para conectar con tu canvas/video existente
  window.ZiGOAR = {
    calcularPoseYProporciones,
    dibujarArmazonEnCanvas,
    diagnosticarRostro,
    mostrarModalPrivacidad,
    setUltimoDiagnostico: (d) => { state.ultimoDiagnostico = d; },
    getSpriteActivo: () => state.spriteProcesado
  };
})();