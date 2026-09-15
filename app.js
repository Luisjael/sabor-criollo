/* ============================================
   Sabor Criollo — app.js v2
   - Precios numéricos formateados (dishes.json)
   - Escala configurable por plato (dish.escala)
   - Overlay de consentimiento antes de abrir la cámara
   - Fix de race condition al cerrar el visor durante la carga
   - Visor único global (sin viewers huérfanos ni fugas de memoria)
   - Deep-link ?plato=<id> para abrir un plato directo en AR (QR)
   - Sanitización básica de datos del menú
   - Service Worker (PWA)
   ============================================ */

const CATEGORY_ORDER = ["Mañana", "Fuertes", "Frituras", "Postre", "Bebidas"];
const MONEDA_DEFAULT = "RD$";
const DEFAULT_SCALE = "0.11 0.11 0.11"; // se sobrescribe por dish.escala si existe

const PLACEHOLDER_SVG = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="42" stroke="#B5502E" stroke-width="2" opacity=".28"/>
  <circle cx="50" cy="50" r="26" fill="#B5502E" opacity=".12"/>
  <path d="M38 30 q2 -8 4 0 M50 27 q2 -9 4 0 M62 30 q2 -8 4 0"
        stroke="#B5502E" stroke-width="2.4" stroke-linecap="round" opacity=".38"/>
</svg>`;

// Estado del visor: solo puede haber uno abierto a la vez.
const cardRefs = new Map(); // dish.id -> { card, button, media, dish }
let activeViewer = null;
let activeButton = null;
let activeMedia = null;
let activeDish = null;

/* ---------- Utilidades ---------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(dish) {
  // Nuevo formato: precio numérico + moneda. Compatible con el formato viejo
  // ("RD$380" como string) por si queda algún dato sin migrar.
  if (typeof dish.precio === "number" && Number.isFinite(dish.precio)) {
    return `${dish.moneda || MONEDA_DEFAULT}${dish.precio}`;
  }
  return String(dish.precio ?? "");
}

function sanitizeDish(raw, index) {
  // Sanitización básica: garantiza tipos y valores por defecto para que un
  // dato roto en dishes.json no rompa toda la página.
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    id: String(d.id || `plato-${index}`),
    categoria: String(d.categoria || "Otros"),
    nombre: String(d.nombre || "Plato sin nombre"),
    descripcion: String(d.descripcion || ""),
    precio: typeof d.precio === "number" ? d.precio : String(d.precio ?? ""),
    moneda: d.moneda ? String(d.moneda) : MONEDA_DEFAULT,
    foto: d.foto ? String(d.foto) : null,
    modelo: d.modelo ? String(d.modelo) : null,
    escala: d.escala ? String(d.escala) : null, // p.ej. "0.15 0.15 0.15"
  };
}

function slug(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/* ---------- Carga y renderizado del menú ---------- */

async function loadMenu() {
  const main = document.getElementById("menu");
  try {
    const res = await fetch("dishes.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error("dishes.json no es un arreglo");
    const dishes = raw.map(sanitizeDish);
    const byCategory = groupByCategory(dishes);
    renderNav(byCategory);
    renderMenu(byCategory);
    handleDeepLink();
  } catch (err) {
    console.error("No se pudo cargar el menú:", err);
    main.innerHTML =
      '<p class="load-error">No pudimos cargar el menú en este momento. ' +
      "Revisa tu conexión e intenta de nuevo.</p>";
  }
}

function groupByCategory(dishes) {
  const map = new Map();
  for (const dish of dishes) {
    if (!map.has(dish.categoria)) map.set(dish.categoria, []);
    map.get(dish.categoria).push(dish);
  }
  const orderedKeys = [
    ...CATEGORY_ORDER.filter((c) => map.has(c)),
    ...[...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  const ordered = new Map();
  orderedKeys.forEach((k) => ordered.set(k, map.get(k)));
  return ordered;
}

function renderNav(byCategory) {
  const nav = document.getElementById("categoryNav");
  nav.innerHTML = "";
  [...byCategory.keys()].forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.dataset.target = slug(cat);
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", () => {
      document.getElementById(slug(cat)).scrollIntoView({ behavior: "smooth" });
      nav.querySelectorAll("button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    });
    nav.appendChild(btn);
  });
}

function renderMenu(byCategory) {
  const main = document.getElementById("menu");
  main.innerHTML = "";
  for (const [cat, dishes] of byCategory) {
    const section = document.createElement("section");
    section.className = "category-section";
    section.id = slug(cat);

    const heading = document.createElement("h2");
    heading.className = "category-heading";
    heading.textContent = cat;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "dish-grid";
    dishes.forEach((dish) => grid.appendChild(renderCard(dish)));
    section.appendChild(grid);

    main.appendChild(section);
  }
}

function addModelBadge(media) {
  const badge = document.createElement("span");
  badge.className = "model-badge";
  badge.textContent = "3D";
  media.appendChild(badge);
}

function renderCard(dish) {
  const card = document.createElement("article");
  card.className = "dish-card";
  card.dataset.dishId = dish.id;

  const media = document.createElement("div");
  media.className = "dish-media";

  renderPhotoOrPlaceholder(media, dish, { showPill: true });
  if (dish.modelo) addModelBadge(media);

  const body = document.createElement("div");
  body.className = "dish-body";

  const nameRow = document.createElement("div");
  nameRow.className = "dish-name-row";
  const name = document.createElement("h3");
  name.className = "dish-name";
  name.textContent = dish.nombre;
  const price = document.createElement("span");
  price.className = "dish-price";
  price.textContent = formatPrice(dish);
  nameRow.append(name, price);

  const desc = document.createElement("p");
  desc.className = "dish-desc";
  desc.textContent = dish.descripcion;

  const action = document.createElement("button");
  action.className = "dish-action";

  if (dish.modelo) {
    action.textContent = "Ver en mi mesa (AR)";
    action.setAttribute("aria-label", `Ver ${dish.nombre} en realidad aumentada`);
    action.addEventListener("click", () => toggleAR(action, media, dish));
  } else {
    action.textContent = "Modelo 3D en camino";
    action.disabled = true;
  }

  body.append(nameRow, desc, action);
  card.append(media, body);

  cardRefs.set(dish.id, { card, button: action, media, dish });
  return card;
}

function renderPhotoOrPlaceholder(media, dish, { showPill = false } = {}) {
  media.innerHTML = "";
  if (dish.foto) {
    const img = document.createElement("img");
    img.src = dish.foto;
    img.alt = dish.nombre;
    img.loading = "lazy";
    media.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "dish-placeholder";
    ph.innerHTML = PLACEHOLDER_SVG; // constante interna segura (sin datos del usuario)
    media.appendChild(ph);
    if (showPill) {
      const pill = document.createElement("span");
      pill.className = "foto-pill";
      pill.textContent = "FOTO PRÓXIMAMENTE";
      media.appendChild(pill);
    }
  }
}

/* ---------- Visor AR (instancia única) ---------- */

function toggleAR(button, media, dish) {
  const wasActive = activeButton === button;
  closeViewer(); // cierra cualquier visor abierto (también el de otra tarjeta)
  if (wasActive) return; // era un simple toggle de cierre
  showARConsent(dish, () => openViewer(button, media, dish));
}

function openViewer(button, media, dish) {
  activeButton = button;
  activeMedia = media;
  activeDish = dish;
  button.classList.add("is-viewing");
  button.textContent = "Volver a la foto";
  renderModel(media, dish);
}

function closeViewer() {
  if (activeViewer) {
    activeViewer._cancelled = true; // evita activateAR() en viewer huérfano
    activeViewer.remove();
    activeViewer = null;
  }
  if (activeButton) {
    activeButton.classList.remove("is-viewing");
    activeButton.textContent = "Ver en mi mesa (AR)";
    activeButton = null;
  }
  if (activeMedia && activeDish) {
    renderPhotoOrPlaceholder(activeMedia, activeDish, { showPill: true });
    if (activeDish.modelo) addModelBadge(activeMedia);
    activeMedia = null;
    activeDish = null;
  }
}

function renderModel(media, dish) {
  media.innerHTML = "";

  if (!customElements.get("model-viewer")) {
    renderPhotoOrPlaceholder(media, dish, { showPill: true });
    const msg = document.createElement("span");
    msg.className = "foto-pill";
    msg.textContent = "Visor 3D no disponible (sin conexión)";
    media.appendChild(msg);
    return;
  }

  const mv = document.createElement("model-viewer");
  mv.setAttribute("src", dish.modelo);
  mv.setAttribute("alt", `Modelo 3D de ${dish.nombre}`);
  if (dish.foto) mv.setAttribute("poster", dish.foto);
  mv.setAttribute("camera-controls", "");
  mv.setAttribute("auto-rotate", "");
  mv.setAttribute("touch-action", "pan-y");
  mv.setAttribute("reveal", "interaction"); // renderiza al interactuar; ahorra GPU/batería
  mv.setAttribute("ar", "");
  mv.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  mv.setAttribute("ar-placement", "floor");
  mv.setAttribute("ar-scale", "auto");
  // Escala configurable por plato en dishes.json ("escala": "0.15 0.15 0.15").
  // Idealmente normaliza cada .glb con `gltf-transform resize` y deja esto en 1.
  mv.setAttribute("scale", dish.escala || DEFAULT_SCALE);
  // Iluminación realista: entorno neutro integrado + tone mapping + sombra suave.
  mv.setAttribute("environment-image", "neutral");
  mv.setAttribute("tone-mapping", "aces");
  mv.setAttribute("exposure", "1.1");
  mv.setAttribute("shadow-intensity", "1");
  mv.setAttribute("shadow-softness", "0.8");

  // Botón propio de AR de model-viewer (solo se muestra en dispositivos con AR).
  const arButton = document.createElement("button");
  arButton.className = "ar-button";
  arButton.setAttribute("slot", "ar-button");
  arButton.textContent = "Ver en mi mesa (AR)";
  mv.appendChild(arButton);

  // Al cargar: en un celular con AR, va directo a tu mesa. En computadora,
  // muestra el 3D girable con un aviso para abrirlo en el teléfono.
  mv.addEventListener("load", () => {
    if (mv._cancelled || !mv.isConnected) return; // fix: viewer cerrado mientras cargaba
    if (mv.canActivateAR) {
      mv.activateAR();
    } else {
      const hint = document.createElement("span");
      hint.className = "foto-pill ar-hint";
      hint.textContent = "📱 Ábrelo en tu celular para verlo en tu mesa";
      media.appendChild(hint);
    }
  });

  // Mensaje si el modelo no carga.
  mv.addEventListener("error", () => {
    if (mv._cancelled || !mv.isConnected) return;
    renderPhotoOrPlaceholder(media, dish);
    const msg = document.createElement("span");
    msg.className = "foto-pill";
    msg.textContent = "No se pudo cargar el 3D";
    media.appendChild(msg);
  });

  activeViewer = mv;
  media.appendChild(mv);
}

/* ---------- Overlay de consentimiento antes de la cámara ---------- */

function showARConsent(dish, onAccept) {
  // Se pide una vez por sesión; después va directo.
  try {
    if (sessionStorage.getItem("ar-consent") === "1") {
      onAccept();
      return;
    }
  } catch (_) { /* sessionStorage puede estar bloqueado; se pide siempre */ }

  const overlay = document.createElement("div");
  overlay.className = "ar-consent-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Ver ${dish.nombre} en realidad aumentada`);

  const imgHtml = dish.foto
    ? `<img src="${escapeHtml(dish.foto)}" alt="" width="88" height="88">`
    : "";

  overlay.innerHTML = `
    <div class="ar-consent-card">
      ${imgHtml}
      <h3>Ver “${escapeHtml(dish.nombre)}” en tu mesa</h3>
      <p>Vamos a usar la cámara de tu dispositivo para mostrarte el plato
         en 3D, en tamaño real. Nada se graba ni se guarda.</p>
      <div class="ar-consent-actions">
        <button type="button" class="btn-secondary" data-action="cancel">Cancelar</button>
        <button type="button" class="btn-primary" data-action="accept">Continuar</button>
      </div>
    </div>`;

  function dismiss() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") dismiss();
  }
  document.addEventListener("keydown", onKey);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) { dismiss(); return; } // tocar el fondo cancela
    const action = e.target.dataset && e.target.dataset.action;
    if (action === "cancel") {
      dismiss();
    } else if (action === "accept") {
      try { sessionStorage.setItem("ar-consent", "1"); } catch (_) {}
      dismiss();
      onAccept();
    }
  });

  document.body.appendChild(overlay);
}

/* ---------- Deep-link: ?plato=<id> (para QR en el menú físico) ---------- */

function handleDeepLink() {
  let id = null;
  try {
    id = new URLSearchParams(location.search).get("plato");
  } catch (_) { return; }
  if (!id) return;
  const ref = cardRefs.get(id);
  if (!ref || !ref.dish.modelo) return;
  requestAnimationFrame(() => {
    ref.card.scrollIntoView({ behavior: "smooth", block: "center" });
    toggleAR(ref.button, ref.media, ref.dish);
  });
}

/* ---------- Service Worker (PWA / offline) ---------- */

function registerServiceWorker() {
  const okProtocol = location.protocol === "https:" || location.hostname === "localhost";
  if (!("serviceWorker" in navigator) || !okProtocol) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("SW no registrado:", err);
    });
  });
}

/* ---------- Visor 3D no disponible (ambos CDNs fallaron) ---------- */

document.addEventListener("modelviewer-failed", () => {
  document.querySelectorAll(".dish-action:not([disabled])").forEach((btn) => {
    btn.disabled = true;
    btn.textContent = "Visor 3D no disponible";
  });
});

registerServiceWorker();
loadMenu();
