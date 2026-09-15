const ORDEN_CATEGORIAS = ["Mañana", "Fuertes", "Frituras", "Postre"];

const COLORES_CATEGORIA = {
  "Mañana": "#d9a02c",
  "Fuertes": "#b23a24",
  "Frituras": "#c98a2c",
  "Postre": "#6e8b3d"
};

function svgPlato(color) {
  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="2" opacity="0.35"/>
    <circle cx="60" cy="60" r="38" fill="${color}" opacity="0.18"/>
    <circle cx="60" cy="60" r="22" fill="${color}" opacity="0.55"/>
    <path d="M40 30 Q42 20 46 28" stroke="${color}" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M52 26 Q54 14 58 24" stroke="${color}" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M64 28 Q66 18 70 27" stroke="${color}" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
  </svg>`;
}

function crearTarjeta(plato) {
  const color = COLORES_CATEGORIA[plato.categoria] || "#d9a02c";
  const card = document.createElement("article");
  card.className = "card";

  const visual = document.createElement("div");
  visual.className = "card-visual";

  if (plato.foto) {
    visual.innerHTML = `<img src="${plato.foto}" alt="${plato.nombre}" />`;
  } else {
    visual.innerHTML = `
      <div class="placeholder-plato">${svgPlato(color)}</div>
      <span class="badge-proximamente">Foto próximamente</span>`;
  }

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <div class="card-top-row">
      <span class="card-nombre">${plato.nombre}</span>
      <span class="card-precio">${plato.precio}</span>
    </div>
    <p class="card-desc">${plato.descripcion}</p>
    <div class="card-actions">
      <button class="btn-ar" ${plato.modelo ? "" : "disabled"}>
        ${plato.modelo ? "Ver en mi mesa (AR)" : "Modelo 3D en camino"}
      </button>
    </div>
  `;

  const boton = body.querySelector(".btn-ar");
  if (plato.modelo) {
    let enAR = false;
    boton.addEventListener("click", () => {
      enAR = !enAR;
      if (enAR) {
        visual.innerHTML = `
          <model-viewer
            src="${plato.modelo}"
            ar
            ar-modes="scene-viewer quick-look webxr"
            ar-scale="auto"
            ar-placement="floor"
            scale="0.11 0.11 0.11"
            camera-controls
            auto-rotate
            style="background:#ead9bc;">
          </model-viewer>`;
        boton.textContent = "Volver a la foto";
      } else {
        visual.innerHTML = plato.foto
          ? `<img src="${plato.foto}" alt="${plato.nombre}" />`
          : `<div class="placeholder-plato">${svgPlato(color)}</div><span class="badge-proximamente">Foto próximamente</span>`;
        boton.textContent = "Ver en mi mesa (AR)";
      }
    });
  }

  card.appendChild(visual);
  card.appendChild(body);
  return card;
}

async function iniciar() {
  const res = await fetch("dishes.json");
  const platos = await res.json();

  const categoriasPresentes = ORDEN_CATEGORIAS.filter(c =>
    platos.some(p => p.categoria === c)
  );

  const nav = document.getElementById("categorias");
  const contenedor = document.getElementById("contenedor-menu");

  function pintarSeccion(categoriaActiva) {
    contenedor.innerHTML = "";
    const lista = categoriaActiva === "Todos"
      ? categoriasPresentes
      : [categoriaActiva];

    lista.forEach(cat => {
      const titulo = document.createElement("h2");
      titulo.className = "categoria-titulo";
      titulo.textContent = cat;
      contenedor.appendChild(titulo);

      const grid = document.createElement("div");
      grid.className = "grid";
      platos.filter(p => p.categoria === cat).forEach(p => {
        grid.appendChild(crearTarjeta(p));
      });
      contenedor.appendChild(grid);
    });
  }

  const tabs = ["Todos", ...categoriasPresentes];
  tabs.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "cat-btn" + (i === 0 ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      nav.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      pintarSeccion(cat);
    });
    nav.appendChild(btn);
  });

  pintarSeccion("Todos");
}

iniciar();
