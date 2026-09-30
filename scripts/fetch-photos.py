"""Download attributed Wikimedia Commons thumbnails for the offline guide."""

import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "species"
SPECIES = [item["scientific"] for item in json.loads((ROOT / "data" / "catalog-raw.json").read_text())]
PRIORITY = {"Lactarius deliciosus", "Lactarius sanguifluus", "Lactarius torminosus", "Lactarius chrysorrheus"}
FALLBACK = {"Collybia rivulosa": "Clitocybe rivulosa", "Boletus reticulatus": "Boletus aestivalis", "Lactifluus rugatus": "Lactarius rugatus"}
BLOCK = ("drawing", "illustration", "il·lustració", "painting", "basket", "icon", "diagram", "stamp", "plate", "herbarium", "arion")


def plain(value):
    return re.sub(r"<[^>]+>", "", html.unescape(value or "")).strip()


def get_json(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "BoletusPersonalGuide/0.1 (offline educational guide)"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 5:
                raise
            time.sleep(8 * (attempt + 1))


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    photos_path = ROOT / "data" / "photos.json"
    records = json.loads(photos_path.read_text()) if photos_path.exists() else {}
    for species in SPECIES:
        if len(records.get(species, [])) >= (2 if species in PRIORITY else 1):
            continue
        time.sleep(2)
        term = FALLBACK.get(species, species)
        result = get_json({
            "action": "query", "generator": "search", "gsrsearch": f'filetype:bitmap "{term}"',
            "gsrnamespace": "6", "gsrlimit": "20", "prop": "imageinfo",
            "iiprop": "url|extmetadata|size", "iiurlwidth": "720", "format": "json",
        })
        pages = sorted(result.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 999))
        chosen = records.get(species, [])
        for page in pages:
            info = page.get("imageinfo", [{}])[0]
            meta = info.get("extmetadata", {})
            title = page.get("title", "")
            low = title.lower()
            if term.lower() not in low or any(word in low for word in BLOCK):
                continue
            if not low.endswith((".jpg", ".jpeg", ".png")):
                continue
            if info.get("width", 0) < 600 or info.get("height", 0) < 400:
                continue
            license_name = meta.get("LicenseShortName", {}).get("value", "")
            if not (license_name.startswith("CC BY") or license_name in ("CC0", "Public domain")):
                continue
            url = info.get("thumburl")
            if not url:
                continue
            if any(photo["title"] == title.removeprefix("File:") for photo in chosen):
                continue
            filename = species.lower().replace(" ", "-") + f"-{len(chosen) + 1}.jpg"
            request = urllib.request.Request(url, headers={"User-Agent": "BoletusPersonalGuide/0.1"})
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    content = response.read()
            except Exception as exc:
                print(f"SKIP {title}: {exc}")
                continue
            if len(content) < 10_000:
                continue
            (DEST / filename).write_bytes(content)
            chosen.append({
                "file": f"assets/species/{filename}", "title": title.removeprefix("File:"),
                "author": plain(meta.get("Artist", {}).get("value")) or "Wikimedia Commons",
                "license": plain(license_name), "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""),
                "source": info.get("descriptionurl", ""),
            })
            if len(chosen) == (2 if species in PRIORITY else 1):
                break
        records[species] = chosen
        print(species, len(chosen), *(photo["title"] for photo in chosen), sep=" | ")
        photos_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
