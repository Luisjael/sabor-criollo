# Sabor Criollo — Menú digital con AR

Sitio estático + PWA. `index.html` lee `dishes.json` y dibuja una tarjeta por
plato, agrupadas por categoría. Cada plato con `modelo` no nulo muestra el
botón "Ver en mi mesa (AR)", que carga el `.glb` en `<model-viewer>`.

## Novedades v2

- **PWA**: instalable, con service worker (`sw.js`) y caché offline de fotos
  y modelos. En el celular se abre pantalla completa como app.
- **Overlay de consentimiento** antes de activar la cámara (se pide una vez
  por sesión).
- **Precios numéricos**: `precio` es un número y `moneda` está separada
  (`"precio": 380, "moneda": "RD$"`). Esto habilita ordenar/filtrar por
  precio y cambiar de moneda sin tocar el código.
- **Escala configurable por plato**: campo opcional `"escala"` en
  `dishes.json` (p. ej. `"0.15 0.15 0.15"`). Lo ideal es normalizar cada
  `.glb` con `gltf-transform resize` y dejar la escala por defecto.
- **Deep-link por QR**: `index.html?plato=mangu` abre ese plato directo en
  AR. Genera un QR por plato para el menú físico.
- **CDN con fallback**: `model-viewer` carga desde unpkg y, si falla, desde
  jsDelivr; si ambos fallan, los botones AR se deshabilitan con aviso.
- **Fix de concurrencia**: al cerrar el visor mientras el modelo carga, ya
  no se activa la cámara de un viewer huérfano.
- **Sanitización básica** de `dishes.json`: un dato roto ya no tumba la
  página completa.

## Agregar una foto o modelo 3D a un plato

Edita `dishes.json`, busca el plato por su `id`, y llena:

```json
"foto": "photos/nombre-del-archivo.jpg",
"modelo": "models/nombre-del-archivo.glb"
```

Coloca el archivo real en la carpeta `photos/` o `models/` con ese mismo
nombre. Campos opcionales: `"escala": "0.15 0.15 0.15"`.

## Optimizar un modelo 3D antes de subirlo (IMPORTANTE)

Los `.glb` sin optimizar pesan decenas de MB y hacen que el menú cargue
lentísimo en el celular. Antes de poner un modelo en `models/`, comprímelo:

```bash
npx @gltf-transform/cli optimize entrada.glb models/nombre.glb \
  --texture-compress webp --texture-size 1024 --compress draco
```

Esto reduce el peso ~95% (p. ej. 45 MB → 1.7 MB) sin pérdida visual notable.
`<model-viewer>` ya soporta texturas WebP y geometría Draco.

Para normalizar el tamaño (recomendado: que todos los platos queden a la
misma escala real dentro del archivo):

```bash
npx @gltf-transform/cli resize entrada.glb salida.glb --width 0.3
```

## Probar en local

El menú necesita servirse por HTTP (no funciona con doble clic en
`index.html` por la restricción de `fetch` a archivos locales):

```bash
npx serve .
# o
python3 -m http.server 8000
```

El service worker solo se registra en `https://` o `localhost`.

## Estructura

```
index.html          página principal (loader de model-viewer con fallback)
style.css           estilos
app.js              lógica: menú, visor AR único, consentimiento, deep-link, SW
dishes.json         datos del menú
sw.js               service worker (offline)
manifest.webmanifest  manifiesto PWA
icons/              iconos de la app (192, 512, maskable)
photos/             fotos reales de los platos
models/             modelos .glb
```
