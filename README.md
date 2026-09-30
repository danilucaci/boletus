# Boletus

Guía de campo instalable para el móvil. Incluye un catálogo de 62 especies de Cataluña con clasificación orientativa, notas de identificación, fotos y confusiones relevantes. Funciona sin conexión después de la primera descarga y guarda los hallazgos en el navegador.

## Desplegar en Netlify

1. En Netlify, elige **Add new site → Import an existing project** y conecta este repositorio.
2. Usa la rama `main`. El archivo `netlify.toml` ya configura la publicación desde la raíz; no hay comando de compilación.
3. Abre la URL HTTPS resultante en el móvil con conexión y espera a que la sección **Offline** indique **Guía descargada**. Añade la web a la pantalla de inicio.
4. Prueba el modo avión antes de salir al bosque.

No hacen falta API keys, cuentas ni servicios externos para la guía, las fotos o el cuaderno. Los enlaces a las fuentes externas solo se abren con conexión.

## Datos y fotografías

- `data/species.json`: 62 entradas con nombres, clasificación, hábitat y notas breves. Los campos factuales se contrastaron con [Bolets Atles](https://bolets.app/bolets), la [Generalitat de Catalunya](https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/) y la [ACSA](https://acsa.gencat.cat/ca/detall/article/Bolets).
- `data/photos.json`: autor, licencia y enlace de origen para cada imagen descargada de Wikimedia Commons. Las fotos se sirven desde `assets/species/`, dentro del mismo sitio, para que funcionen offline.
- `scripts/`: scripts usados para preparar el catálogo y las fotos; no son necesarios para ejecutar o desplegar la app.

Las fichas describen **especies**, no certifican la identificación de una seta concreta encontrada en el bosque.

## Datos personales

Las fotos y notas de los hallazgos se guardan en IndexedDB, dentro del navegador del móvil. No se envían a ningún servidor. Se pueden exportar e importar como archivo JSON desde **Hallazgos**. Borrar los datos del sitio también borra el cuaderno local.

## Desarrollo local

Sirve la carpeta con cualquier servidor HTTP estático, por ejemplo `python3 -m http.server 8080`, y abre `http://localhost:8080`. El service worker necesita HTTPS o `localhost`; abrir `index.html` como archivo no permite probar el modo offline.
