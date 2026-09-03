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

## Estructura

```
index.html    página principal
style.css     estilos
app.js        lógica: lee dishes.json, dibuja tarjetas, activa AR
dishes.json   datos del menú
photos/       fotos reales de los platos
models/       modelos .glb
```
