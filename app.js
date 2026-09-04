const CATEGORY_ORDER = ["Mañana", "Fuertes", "Frituras", "Postre", "Bebidas"];

const PLACEHOLDER_SVG = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="42" stroke="#C15B36" stroke-width="2" opacity=".3"/>
  <circle cx="50" cy="50" r="26" fill="#C15B36" opacity=".18"/>
  <path d="M38 30 q2 -8 4 0 M50 27 q2 -9 4 0 M62 30 q2 -8 4 0"
        stroke="#C15B36" stroke-width="2.4" stroke-linecap="round" opacity=".4"/>
</svg>`;

async function loadMenu() {
  const res = await fetch("dishes.json");
  const dishes = await res.json();
  const byCategory = groupByCategory(dishes);
  renderNav(byCategory);
  renderMenu(byCategory);
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
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", () => {
      document.getElementById(slug(cat)).scrollIntoView({ behavior: "smooth" });
      nav.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
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

function renderCard(dish) {
  const card = document.createElement("article");
  card.className = "dish-card";

  const media = document.createElement("div");
  media.className = "dish-media";

  if (dish.foto) {
    const img = document.createElement("img");
    img.src = dish.foto;
    img.alt = dish.nombre;
    media.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "dish-placeholder";
    ph.innerHTML = PLACEHOLDER_SVG;
    media.appendChild(ph);
    const pill = document.createElement("span");
    pill.className = "foto-pill";
    pill.textContent = "FOTO PRÓXIMAMENTE";
    media.appendChild(pill);
  }

  const body = document.createElement("div");
  body.className = "dish-body";

  const nameRow = document.createElement("div");
  nameRow.className = "dish-name-row";
  const name = document.createElement("h3");
  name.className = "dish-name";
  name.textContent = dish.nombre;
  const price = document.createElement("span");
  price.className = "dish-price";
  price.textContent = dish.precio;
  nameRow.append(name, price);

  const desc = document.createElement("p");
  desc.className = "dish-desc";
  desc.textContent = dish.descripcion;

  const action = document.createElement("button");
  action.className = "dish-action";

  if (dish.modelo) {
    action.textContent = "Ver en mi mesa (AR)";
    action.addEventListener("click", () => toggleAR(action, media, dish));
  } else {
    action.textContent = "Modelo 3D en camino";
    action.disabled = true;
  }

  body.append(nameRow, desc, action);
  card.append(media, body);
  return card;
}

function toggleAR(button, media, dish) {
  const viewing = button.classList.contains("is-viewing");
  if (viewing) {
    button.classList.remove("is-viewing");
    button.textContent = "Ver en mi mesa (AR)";
    renderPhotoOrPlaceholder(media, dish);
  } else {
    button.classList.add("is-viewing");
    button.textContent = "Volver a la foto";
    renderModel(media, dish);
  }
}

function renderPhotoOrPlaceholder(media, dish) {
  media.innerHTML = "";
  if (dish.foto) {
    const img = document.createElement("img");
    img.src = dish.foto;
    img.alt = dish.nombre;
    media.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "dish-placeholder";
    ph.innerHTML = PLACEHOLDER_SVG;
    media.appendChild(ph);
  }
}

function renderModel(media, dish) {
  media.innerHTML = "";
  const mv = document.createElement("model-viewer");
  mv.setAttribute("src", dish.modelo);
  mv.setAttribute("alt", dish.nombre);
  mv.setAttribute("camera-controls", "");
  mv.setAttribute("auto-rotate", "");
  mv.setAttribute("ar", "");
  mv.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  mv.setAttribute("ar-placement", "floor");
  mv.setAttribute("ar-scale", "auto");
  mv.setAttribute("scale", "0.11 0.11 0.11");
  mv.setAttribute("exposure", "1.5");
  mv.setAttribute("shadow-intensity", "1");
  mv.addEventListener("load", () => {
    mv.activateAR();
  });
  media.appendChild(mv);
}

function slug(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

loadMenu();
