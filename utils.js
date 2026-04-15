/**
 * utils.js — About Marketing · IES Alonso de Avellaneda
 * ─────────────────────────────────────────────────────
 * Responsabilidades:
 *  1. Cargar ponentes (LocalStorage tiene prioridad sobre data.json)
 *  2. Renderizar cards dinámicamente
 *  3. Panel de administración protegido por contraseña
 *  4. Persistencia en LocalStorage (simula base de datos)
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   CONSTANTES
═══════════════════════════════════════════════════════ */
const LS_KEY      = 'am_ponentes_extra'; // clave LocalStorage para ponentes nuevos
const ADMIN_PASS  = 'Vitoria3';
const DATA_URL    = 'data.json';

/* Paleta de colores para asignar automáticamente si no se elige */
const COLOR_PALETTE = ['#F5C800', '#D62828', '#1A2F5E', '#457B9D', '#E63946'];

/* Emojis de avatar según índice */
const AVATARS = ['🎤', '📣', '🚀', '💡', '🎯', '📊', '✨', '🌟'];

/* ═══════════════════════════════════════════════════════
   1. CARGA DE DATOS
═══════════════════════════════════════════════════════ */

/**
 * Carga los ponentes del LocalStorage (ponentes extra añadidos por el admin).
 * @returns {Array} Array de objetos ponente guardados localmente
 */
function cargarPonentesLocales() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[AM] Error al leer LocalStorage:', e);
    return [];
  }
}

/**
 * Guarda un ponente extra en LocalStorage.
 * @param {Object} ponente
 */
function guardarPonente(ponente) {
  const existentes = cargarPonentesLocales();
  existentes.push(ponente);
  localStorage.setItem(LS_KEY, JSON.stringify(existentes));
}

/**
 * Elimina un ponente del LocalStorage por su id.
 * @param {string|number} id
 */
function eliminarPonenteLocal(id) {
  const existentes = cargarPonentesLocales().filter(p => String(p.id) !== String(id));
  localStorage.setItem(LS_KEY, JSON.stringify(existentes));
}

/**
 * Limpia todos los ponentes extra del LocalStorage.
 */
function limpiarStorage() {
  localStorage.removeItem(LS_KEY);
}

/**
 * Función principal de carga.
 * Prioridad: LocalStorage (extra) + data.json (base)
 * Ambos se combinan y se muestran juntos.
 * @returns {Promise<Array>} Todos los ponentes combinados
 */
async function cargarTodosLosPonentes() {
  // 1. Ponentes del JSON base
  let ponentesBase = [];
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    ponentesBase = json.ponentes || [];
  } catch (e) {
    console.error('[AM] No se pudo cargar data.json:', e);
  }

  // 2. Ponentes extra del LocalStorage
  const ponentesLocales = cargarPonentesLocales();

  // 3. Combinar: base primero, luego los locales
  return [...ponentesBase, ...ponentesLocales];
}

/* ═══════════════════════════════════════════════════════
   2. RENDERIZADO DE CARDS
═══════════════════════════════════════════════════════ */

/**
 * Crea el HTML de una card de ponente.
 * Aplica duotono vía CSS si hay imagen, o muestra emoji placeholder.
 * @param {Object} ponente
 * @param {number} index - Para animar con delay escalonado
 * @returns {HTMLElement}
 */
function crearCard(ponente, index = 0) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');
  card.style.animationDelay = `${index * 0.1}s`;

  const color = ponente.color || COLOR_PALETTE[index % COLOR_PALETTE.length];
  const emoji = AVATARS[index % AVATARS.length];
  const esLocal = ponente._local === true;

  // ── Header con imagen o placeholder ──────────────────
  const headerBg = color;
  let headerHTML = '';

  if (ponente.imagen && ponente.imagen.trim() !== '') {
    // Imagen real con filtro duotono CSS
    headerHTML = `
      <div class="card__header" style="background:${headerBg};">
        <img
          src="${escapeHtml(ponente.imagen)}"
          alt="Foto de ${escapeHtml(ponente.nombre)}"
          class="card__img"
          loading="lazy"
        />
        <div class="card__img-duotone" style="background:${color};"></div>
        <span class="card__tag">${escapeHtml(ponente.tema || 'Ponente')}</span>
        ${esLocal ? '<span class="card__local-badge">Nuevo</span>' : ''}
      </div>`;
  } else {
    // Sin imagen: fondo de color + emoji
    headerHTML = `
      <div class="card__header" style="background:${headerBg};">
        <div class="card__avatar-placeholder" style="font-size:2.5rem;">${emoji}</div>
        <span class="card__tag">${escapeHtml(ponente.tema || 'Ponente')}</span>
        ${esLocal ? '<span class="card__local-badge">Nuevo</span>' : ''}
      </div>`;
  }

  // ── Redes sociales ────────────────────────────────────
  const redes = ponente.redes || {};
  const redesHTML = Object.entries(redes)
    .filter(([, url]) => url && url.trim() !== '')
    .map(([red, url]) => {
      const iconos = { linkedin: '💼', instagram: '📸', twitter: '🐦', web: '🌐' };
      const icon = iconos[red] || '🔗';
      return `<a href="${escapeHtml(url)}" class="card__red" style="color:${color};" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(red)} de ${escapeHtml(ponente.nombre)}">${icon} ${red}</a>`;
    })
    .join('');

  // ── Body ──────────────────────────────────────────────
  card.innerHTML = `
    ${headerHTML}
    <div class="card__body">
      <div class="card__accent-bar" style="background:${color};"></div>
      <h3 class="card__nombre">${escapeHtml(ponente.nombre)}</h3>
      <div class="card__meta">
        <span class="card__cargo">${escapeHtml(ponente.cargo || '')}</span>
        <span class="card__empresa">${escapeHtml(ponente.empresa || '')}</span>
      </div>
      <p class="card__bio">${escapeHtml(ponente.bio || '')}</p>
      ${redesHTML ? `<div class="card__redes">${redesHTML}</div>` : ''}
    </div>
  `;

  return card;
}

/**
 * Renderiza todos los ponentes en el grid del DOM.
 * @param {Array} ponentes
 */
function renderizarPonentes(ponentes) {
  const grid    = document.getElementById('ponentes-grid');
  const loading = document.getElementById('ponentes-loading');

  if (!grid) return;

  // Ocultar loader
  if (loading) loading.hidden = true;

  if (!ponentes || ponentes.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#777;">No hay ponentes disponibles.</p>';
    return;
  }

  grid.innerHTML = '';
  ponentes.forEach((ponente, index) => {
    const card = crearCard(ponente, index);
    grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════════════════════
   3. INICIALIZACIÓN PRINCIPAL
═══════════════════════════════════════════════════════ */
async function init() {
  try {
    const ponentes = await cargarTodosLosPonentes();
    renderizarPonentes(ponentes);
  } catch (e) {
    console.error('[AM] Error de inicialización:', e);
    const loading = document.getElementById('ponentes-loading');
    if (loading) loading.innerHTML = '<p style="color:var(--red)">Error al cargar los ponentes.</p>';
  }
}

/* ═══════════════════════════════════════════════════════
   4. NAV — STICKY & MOBILE TOGGLE
═══════════════════════════════════════════════════════ */
function initNav() {
  const header = document.getElementById('site-header');
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');

  // Scroll shadow
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Mobile toggle
  toggle?.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Cerrar al hacer click en un enlace
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ═══════════════════════════════════════════════════════
   5. SCROLL REVEAL
═══════════════════════════════════════════════════════ */
function initReveal() {
  const targets = document.querySelectorAll('.agenda__item, .multimedia__placeholder, .contacto__inner');
  targets.forEach(el => el.classList.add('reveal'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════════════════════════
   6. SHARE BUTTON
═══════════════════════════════════════════════════════ */
function initShare() {
  const btn = document.getElementById('share-btn');
  btn?.addEventListener('click', async () => {
    const data = {
      title: 'About Marketing — IES Alonso de Avellaneda',
      text: '🎤 Evento de marketing el 26 de marzo, 18:45h en el Salón de Actos del IES Alonso de Avellaneda.',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        btn.textContent = '¡Enlace copiado! 🎉';
        setTimeout(() => { btn.textContent = 'Compartir evento'; }, 2500);
      }
    } catch {}
  });
}

/* ═══════════════════════════════════════════════════════
   7. PANEL DE ADMINISTRACIÓN
═══════════════════════════════════════════════════════ */
function initAdmin() {
  const modal        = document.getElementById('admin-modal');
  const trigger      = document.getElementById('admin-trigger');
  const closeBtn     = document.getElementById('modal-close');
  const screenLogin  = document.getElementById('screen-login');
  const screenForm   = document.getElementById('screen-form');
  const passwordInput= document.getElementById('admin-password');
  const loginBtn     = document.getElementById('login-submit');
  const loginError   = document.getElementById('login-error');

  const fNombre    = document.getElementById('f-nombre');
  const fCargo     = document.getElementById('f-cargo');
  const fEmpresa   = document.getElementById('f-empresa');
  const fTema      = document.getElementById('f-tema');
  const fBio       = document.getElementById('f-bio');
  const fLinkedin  = document.getElementById('f-linkedin');
  const fInstagram = document.getElementById('f-instagram');
  const fColor     = document.getElementById('f-color');
  const fColorLabel= document.getElementById('f-color-label');
  const bioCounter = document.getElementById('bio-counter');
  const formError  = document.getElementById('form-error');
  const formSuccess= document.getElementById('form-success');
  const formSubmit = document.getElementById('form-submit');
  const formCancel = document.getElementById('form-cancel');
  const clearBtn   = document.getElementById('clear-storage');
  const savedList  = document.getElementById('saved-ponentes-list');

  if (!modal) return;

  /* ── Abrir / cerrar modal ── */
  function abrirModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    passwordInput?.focus();
  }
  function cerrarModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    // Reset
    passwordInput.value = '';
    loginError.hidden = true;
    screenLogin.hidden = false;
    screenForm.hidden = true;
    formError.hidden = true;
    formSuccess.hidden = true;
  }

  trigger?.addEventListener('click', abrirModal);
  closeBtn?.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });

  /* ── Login ── */
  function intentarLogin() {
    if (passwordInput.value === ADMIN_PASS) {
      loginError.hidden = true;
      screenLogin.hidden = true;
      screenForm.hidden = false;
      actualizarListaSaved();
    } else {
      loginError.hidden = false;
      passwordInput.value = '';
      passwordInput.focus();
      // Efecto shake
      passwordInput.style.animation = 'none';
      requestAnimationFrame(() => {
        passwordInput.style.animation = 'shake 0.4s';
      });
    }
  }
  loginBtn?.addEventListener('click', intentarLogin);
  passwordInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarLogin(); });

  /* ── Counter de palabras en bio ── */
  fBio?.addEventListener('input', () => {
    const words = fBio.value.trim().split(/\s+/).filter(Boolean).length;
    bioCounter.textContent = `${words} palabras`;
    bioCounter.style.color = (words >= 40 && words <= 60) ? '#2a7a2a' : (words > 60 ? 'var(--red)' : '#888');
  });

  /* ── Color picker label ── */
  fColor?.addEventListener('input', () => {
    fColorLabel.textContent = fColor.value.toUpperCase();
  });

  /* ── Guardar ponente ── */
  formSubmit?.addEventListener('click', () => {
    formError.hidden = true;
    formSuccess.hidden = true;

    // Validación
    if (!fNombre.value.trim() || !fCargo.value.trim() || !fEmpresa.value.trim() || !fTema.value.trim() || !fBio.value.trim()) {
      formError.hidden = false;
      return;
    }

    const nuevoPonente = {
      id: `local_${Date.now()}`,
      nombre:   fNombre.value.trim(),
      cargo:    fCargo.value.trim(),
      empresa:  fEmpresa.value.trim(),
      tema:     fTema.value.trim(),
      bio:      fBio.value.trim(),
      color:    fColor.value,
      imagen:   '',
      redes: {
        linkedin:  fLinkedin.value.trim(),
        instagram: fInstagram.value.trim()
      },
      _local: true  // marca para diferenciarlo de los del JSON
    };

    guardarPonente(nuevoPonente);

    // Feedback
    formSuccess.hidden = false;
    limpiarFormulario();
    actualizarListaSaved();

    // Re-renderizar la sección de ponentes
    cargarTodosLosPonentes().then(renderizarPonentes);
  });

  formCancel?.addEventListener('click', cerrarModal);

  /* ── Limpiar formulario ── */
  function limpiarFormulario() {
    [fNombre, fCargo, fEmpresa, fTema, fBio, fLinkedin, fInstagram].forEach(el => { if(el) el.value = ''; });
    if (fColor) fColor.value = '#FFD700';
    if (fColorLabel) fColorLabel.textContent = '#FFD700';
    if (bioCounter) bioCounter.textContent = '0 palabras';
  }

  /* ── Lista de ponentes en LocalStorage ── */
  function actualizarListaSaved() {
    const locales = cargarPonentesLocales();
    if (!savedList) return;

    if (locales.length === 0) {
      savedList.innerHTML = '<li style="color:#999;font-size:0.85rem;">No hay ponentes guardados en LocalStorage.</li>';
      return;
    }

    savedList.innerHTML = locales.map(p => `
      <li class="saved-item">
        <div>
          <span class="saved-item__name">${escapeHtml(p.nombre)}</span>
          <small style="display:block;color:#888">${escapeHtml(p.empresa)}</small>
        </div>
        <button class="saved-item__del" data-id="${p.id}" aria-label="Eliminar ${escapeHtml(p.nombre)}">🗑</button>
      </li>
    `).join('');

    // Evento eliminar individual
    savedList.querySelectorAll('.saved-item__del').forEach(btn => {
      btn.addEventListener('click', () => {
        eliminarPonenteLocal(btn.dataset.id);
        actualizarListaSaved();
        cargarTodosLosPonentes().then(renderizarPonentes);
      });
    });
  }

  /* ── Limpiar todo el storage ── */
  clearBtn?.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres eliminar todos los ponentes añadidos localmente?')) {
      limpiarStorage();
      actualizarListaSaved();
      cargarTodosLosPonentes().then(renderizarPonentes);
    }
  });
}

/* ═══════════════════════════════════════════════════════
   8. UTILIDADES
═══════════════════════════════════════════════════════ */

/**
 * Escapa caracteres especiales HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/* ═══════════════════════════════════════════════════════
   ARRANQUE
═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  init();
  initNav();
  initReveal();
  initShare();
  initAdmin();
});
