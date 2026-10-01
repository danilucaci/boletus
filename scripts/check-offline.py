"""Comprova que el catàleg i totes les fotos necessàries viatgen amb el web."""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
species = json.loads((root / 'data/species.json').read_text())
photos = json.loads((root / 'data/photos.json').read_text())
assert len(species) == 62
assert len({item['id'] for item in species}) == len(species)
assert all(len(item['marks']) == 3 and item['scientific'] in photos for item in species)

images = [image for gallery in photos.values() for image in gallery]
assert len({image['file'] for image in images}) == len(images)
for image in images:
    path = root / image['file']
    assert path.is_file() and path.read_bytes().startswith(b'\xff\xd8'), path
    assert image['source'] and image['author'] and image['license'], path

for file in ('index.html', 'app.js', 'styles.css', 'sw.js', 'package.json',
             'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png',
             'assets/icon-512.png'):
    assert (root / file).is_file(), file

print(f'{len(species)} fitxes i {len(images)} fotos locals verificades')
