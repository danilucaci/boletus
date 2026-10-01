# Boletus

Guia de camp instal·lable al mòbil. Inclou un catàleg de 62 espècies de Catalunya amb classificació orientativa, notes d'identificació, 248 fotos, exemples de trets i possibles confusions. Funciona sense connexió després de la primera descàrrega i desa les troballes al navegador.

## Publicació a Netlify

1. A Netlify, tria **Add new project → Import an existing project** i connecta aquest repositori.
2. Selecciona la branca `main`. El fitxer `netlify.toml` ja configura la publicació des de l'arrel; no cal cap ordre de compilació.
3. Obre l'adreça HTTPS al mòbil amb connexió i espera que la portada indiqui **Guia descarregada**. Aquesta descàrrega inclou l'HTML, el JavaScript, els estils, les dades, les icones i totes les fotos. Afegeix el web a la pantalla d'inici.
4. Prova el mode avió abans de sortir al bosc.

No calen claus d'API, comptes ni serveis externs per a la guia, les fotos o el quadern. Els enllaços a fonts externes només funcionen amb connexió.

## Dades i fotografies

- `data/species.json`: 62 entrades amb noms, classificació, hàbitat i trets visibles i notes de camp. Les dades s'han contrastat amb [Bolets Atles](https://bolets.app/bolets), la [Generalitat de Catalunya](https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/) i l'[ACSA](https://acsa.gencat.cat/ca/detall/article/Bolets).
- `data/photos.json`: autor, llicència i enllaç d'origen de cada imatge descarregada de Wikimedia Commons. Les fotos es distribueixen des de `assets/species/`, dins del mateix web, perquè funcionin sense connexió.
- `scripts/`: eines utilitzades per preparar el catàleg i les fotos; no calen per executar o publicar l'aplicació.

Les fitxes descriuen **espècies**; no certifiquen la identificació d'un bolet concret trobat al bosc.

## Dades personals

Les fotos i notes de les troballes es desen a IndexedDB, dins del navegador del mòbil. No s'envien a cap servidor. Es poden exportar i importar com a fitxer JSON des de **Troballes**. Si esborres les dades del lloc, també s'esborra el quadern local.

## Desenvolupament local

Serveix la carpeta amb qualsevol servidor HTTP estàtic, per exemple `python3 -m http.server 8080`, i obre `http://localhost:8080`. El *service worker* necessita HTTPS o `localhost`; si obres `index.html` com a fitxer, no podràs provar el mode sense connexió.
