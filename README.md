# Sabor Criollo — Menú digital con AR

Sitio estático. `index.html` lee `dishes.json` y dibuja una tarjeta por plato,
agrupadas por categoría. Cada plato con `modelo` no nulo muestra el botón
"Ver en mi mesa (AR)", que carga el `.glb` en `<model-viewer>`.

## Agregar una foto o modelo 3D a un plato

Edita `dishes.json`, busca el plato por su `id`, y llena:

```json
"foto": "photos/nombre-del-archivo.jpg",
"modelo": "models/nombre-del-archivo.glb"
```

Coloca el archivo real en la carpeta `photos/` o `models/` con ese mismo nombre.

## Optimizar un modelo 3D antes de subirlo (IMPORTANTE)

Los `.glb` sin optimizar pesan decenas de MB y hacen que el menú cargue
lentísimo en el celular. Antes de poner un modelo en `models/`, comprímelo:

```bash
npx @gltf-transform/cli optimize entrada.glb models/nombre.glb \
  --texture-compress webp --texture-size 1024 --compress draco
```

Esto reduce el peso ~95% (p. ej. 45 MB → 1.7 MB) sin pérdida visual notable.
`<model-viewer>` ya soporta texturas WebP y geometría Draco.

## Estructura

```
index.html    página principal
style.css     estilos
app.js        lógica: lee dishes.json, dibuja tarjetas, activa AR
dishes.json   datos del menú
photos/       fotos reales de los platos
models/       modelos .glb
```
