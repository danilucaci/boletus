"""Extract factual catalog fields from the public Bolets Atles listing."""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = Path('/tmp/bolets-catalog.html').read_text()


def clean(value):
    value = re.sub(r'<[^>]*>', ' ', value or '')
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()


def field(card, pattern):
    found = re.search(pattern, card, re.S)
    return clean(found.group(1)) if found else ''


records = []
table = {}
for row in re.findall(r'<tr data-group="[^"]+".*?</tr>', source, re.S):
    scientific = field(row, r'<small>(.*?)</small>')
    columns = re.findall(r'<td(?: [^>]*)?>(.*?)</td>', row, re.S)
    if scientific and len(columns) >= 4:
        table[scientific] = {"spanishName": clean(columns[0]), "season": clean(columns[2])}
for card in re.findall(r'<a class="species-card".*?</a>', source, re.S):
    url = field(card, r'href="(/bolets/[^"]+)"')
    name = field(card, r'<h3>(.*?)</h3>')
    scientific = field(card, r'<em>(.*?)</em>')
    category = field(card, r'<span class="culinary-rating-label">(.*?)</span>')
    if not category:
        category = field(card, r'<span class="pill [^"]*">(.*?)</span>')
    facts = re.search(r'<dl class="species-card-facts">(.*?)</dl>', card, re.S)
    facts_text = clean(facts.group(1)) if facts else ''
    records.append({"name": name, "scientific": scientific, "category": category,
                    "facts": facts_text, "source": "https://bolets.app" + url,
                    **table.get(scientific, {})})

(ROOT / 'data').mkdir(exist_ok=True)
(ROOT / 'data' / 'catalog-raw.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(len(records))
for record in records:
    print(record['name'], '|', record['scientific'], '|', record['category'], '|', record['facts'])
