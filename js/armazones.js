// js/armazones.js
const ZIGO_CATALOGO = [
  {
    id: 'zigo-focus',
    nombre: 'ziGO Focus',
    categoria: 'premium',
    subtitulo: 'Acetato Premium · Rectangular',
    material: 'Acetato italiano hipoalergénico de alta densidad',
    medidas: '52-18-140 mm',
    rostrosIdeales: ['Ovalado', 'Redondo', 'Corazón'],
    imagen: '../assets/img/armazones/focus.png',
    colorMarco: '#5c3a21',
    forma: 'rectangular'
  },
  {
    id: 'zigo-kinetic',
    nombre: 'ziGO Kinetic',
    categoria: 'deportivo',
    subtitulo: 'Titanio Ligero · Geométrico',
    material: 'Aleación de titanio ultraligero con plaquetas suaves',
    medidas: '54-17-142 mm',
    rostrosIdeales: ['Redondo', 'Ovalado', 'Diamante'],
    imagen: '../assets/img/armazones/kinetic.png',
    colorMarco: '#8b7d6b',
    forma: 'geometrico'
  },
  {
    id: 'zigo-metro',
    nombre: 'ziGO Metro',
    categoria: 'urbano',
    subtitulo: 'Acetato Urbano · Redondeado',
    material: 'Acetato translúcido resistente a impactos',
    medidas: '50-19-138 mm',
    rostrosIdeales: ['Cuadrado', 'Alargado', 'Diamante'],
    imagen: '../assets/img/armazones/metro.png',
    colorMarco: '#c97b84',
    forma: 'redondo'
  },
  {
    id: 'zigo-urban',
    nombre: 'ziGO Urban',
    categoria: 'urbano',
    subtitulo: 'Metálico Aviador · Clásico',
    material: 'Acero inoxidable anticorrosión con puente doble',
    medidas: '55-16-145 mm',
    rostrosIdeales: ['Cuadrado', 'Ovalado', 'Corazón'],
    imagen: '../assets/img/armazones/urban.png',
    colorMarco: '#2b2d2f',
    forma: 'aviador'
  }
];

// Guardar catálogo globalmente para que probador.html y admin.html lo compartan
localStorage.setItem('zigo_catalogo', JSON.stringify(ZIGO_CATALOGO));

function registrarEventoAdmin(tipo, payload = {}) {
  const stats = JSON.parse(localStorage.getItem('zigo_admin_stats') || '{}');
  stats.eventos = stats.eventos || [];
  stats.modelosVistos = stats.modelosVistos || {};
  stats.modelosCita = stats.modelosCita || {};

  if (tipo === 'probar_ar' && payload.modelo) {
    stats.modelosVistos[payload.modelo] = (stats.modelosVistos[payload.modelo] || 0) + 1;
  }
  if (tipo === 'seleccion_cita' && Array.isArray(payload.modelos)) {
    payload.modelos.forEach(m => {
      stats.modelosCita[m] = (stats.modelosCita[m] || 0) + 1;
    });
  }

  stats.eventos.push({
    tipo,
    payload,
    fecha: new Date().toISOString()
  });

  // Mantener últimos 500 eventos para no saturar almacenamiento
  if (stats.eventos.length > 500) stats.eventos = stats.eventos.slice(-500);
  localStorage.setItem('zigo_admin_stats', JSON.stringify(stats));
}

document.addEventListener('DOMContentLoaded', () => {
  const seleccionados = new Set(JSON.parse(localStorage.getItem('zigo_cita_seleccion') || '[]'));

  // 1. Actualizar barra inferior de selección
  const contadorEl = document.querySelector('#contador-seleccion, .selected-count, [data-selected-count]');
  const btnAgendarSeleccion = document.querySelector('#btn-agendar-seleccion, .btn-agendar-seleccion');

  function actualizarBarraSeleccion() {
    localStorage.setItem('zigo_cita_seleccion', JSON.stringify([...seleccionados]));
    if (contadorEl) {
      contadorEl.textContent = `Armazones seleccionados: ${seleccionados.size}`;
    } else {
      // Fallback por si el texto está directo en un span/div
      document.querySelectorAll('span, p, div').forEach(el => {
        if (el.children.length === 0 && el.textContent.trim().startsWith('Armazones seleccionados:')) {
          el.textContent = `Armazones seleccionados: ${seleccionados.size}`;
        }
      });
    }
  }

  // 2. Delegación de eventos en toda la página para que ningún botón falle
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, input[type="checkbox"], label');
    if (!target) return;

    const texto = (target.textContent || '').trim().toUpperCase();
    const card = target.closest('.armazon-card, .product-card, article, .card');
    const nombreCard = card ? (card.querySelector('h3, h4, .title')?.textContent || '').trim() : '';
    const modeloObj = ZIGO_CATALOGO.find(m => m.nombre.toLowerCase() === nombreCard.toLowerCase());
    const modeloId = modeloObj ? modeloObj.id : nombreCard.toLowerCase().replace(/\s+/g, '-');

    // A) Botón "PROBAR AR" dentro de cada tarjeta
    if (texto.includes('PROBAR AR') || target.dataset.action === 'probar-ar') {
      e.preventDefault();
      if (nombreCard) {
        localStorage.setItem('zigo_ar_modelo_activo', modeloId);
        registrarEventoAdmin('probar_ar', { modelo: nombreCard });
      }
      window.location.href = `probador.html?modelo=${encodeURIComponent(modeloId)}`;
      return;
    }

    // B) Botón "DETALLES" dentro de cada tarjeta
    if (texto.includes('DETALLES') || target.dataset.action === 'detalles') {
      e.preventDefault();
      mostrarModalDetalles(modeloObj || {
        nombre: nombreCard || 'Armazón ziGO',
        subtitulo: 'Colección Óptica ziGO',
        material: 'Acetato / Aleación ligera de alta resistencia',
        medidas: 'Estándar adulto (52-18-140 mm)',
        rostrosIdeales: ['Ovalado', 'Redondo', 'Cuadrado'],
        id: modeloId
      });
      return;
    }

    // C) Botón "AGENDAR CITA CON MI SELECCIÓN"
    if (texto.includes('AGENDAR CITA CON MI SELECCIÓN') || target.id === 'btn-agendar-seleccion') {
      e.preventDefault();
      const lista = [...seleccionados];
      if (lista.length === 0) {
        alert('Selecciona al menos un armazón marcando la casilla "Seleccionar para cita" en los modelos que te gusten.');
        return;
      }
      registrarEventoAdmin('seleccion_cita', { modelos: lista });
      localStorage.setItem('zigo_cita_seleccion', JSON.stringify(lista));
      // Redirige a index.html#agendar pasando los modelos en la URL
      window.location.href = `../index.html?armazones=${encodeURIComponent(lista.join(','))}#agendar`;
      return;
    }
  });

  // 3. Manejo de checkboxes "Seleccionar para cita"
  document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    const card = chk.closest('.armazon-card, .product-card, article, .card');
    const nombreCard = card ? (card.querySelector('h3, h4, .title')?.textContent || '').trim() : '';
    if (!nombreCard) return;

    if (seleccionados.has(nombreCard)) chk.checked = true;

    chk.addEventListener('change', () => {
      if (chk.checked) {
        seleccionados.add(nombreCard);
      } else {
        seleccionados.delete(nombreCard);
      }
      actualizarBarraSeleccion();
    });
  });

  actualizarBarraSeleccion();
});

function mostrarModalDetalles(modelo) {
  let modal = document.getElementById('zigo-modal-detalles');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'zigo-modal-detalles';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(4,12,24,0.82);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem;';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#0b192c;border:1px solid #1e3a5f;border-radius:16px;max-width:440px;width:100%;padding:1.5rem;color:#f1f5f9;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;color:#38bdf8;font-size:1.3rem;">${modelo.nombre}</h3>
        <button id="cerrar-modal-detalles" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
      </div>
      <p style="color:#cbd5e1;margin:0 0 0.75rem;">${modelo.subtitulo}</p>
      <ul style="list-style:none;padding:0;margin:0 0 1.25rem;font-size:0.92rem;line-height:1.7;color:#94a3b8;">
        <li><strong style="color:#e2e8f0;">Material:</strong> ${modelo.material}</li>
        <li><strong style="color:#e2e8f0;">Medidas:</strong> ${modelo.medidas}</li>
        <li><strong style="color:#e2e8f0;">Rostros recomendados:</strong> ${modelo.rostrosIdeales.join(', ')}</li>
        <li><strong style="color:#e2e8f0;">Graduación:</strong> Compatible con monofocal, bifocal y progresivo</li>
      </ul>
      <div style="display:flex;gap:0.75rem;">
        <a href="probador.html?modelo=${encodeURIComponent(modelo.id)}" style="flex:1;text-align:center;background:#0ea5e9;color:#04101e;font-weight:700;padding:0.7rem;border-radius:999px;text-decoration:none;">Probar en AR</a>
        <button id="cerrar-modal-detalles-btn" style="flex:1;background:transparent;border:1px solid #334155;color:#e2e8f0;padding:0.7rem;border-radius:999px;cursor:pointer;">Cerrar</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
  modal.querySelectorAll('#cerrar-modal-detalles, #cerrar-modal-detalles-btn').forEach(b => {
    b.onclick = () => { modal.style.display = 'none'; };
  });
}