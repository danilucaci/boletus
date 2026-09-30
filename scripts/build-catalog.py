"""Build the compact, offline catalog from factual listing fields and original notes."""

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = json.loads((ROOT / "data" / "catalog-raw.json").read_text())

# Short field notes written for this guide. They are prompts for comparison, not specimen IDs.
NOTES = {
"Macrolepiota procera": "Sombrero grande con escamas pardas, pie esbelto con dibujo y anillo que puede moverse.",
"Omphalotus olearius": "Naranja intenso; suele brotar en grupos unidos sobre madera o raíces. Puede parecerse al rossinyol.",
"Gyromitra esculenta": "Sombrero irregular con pliegues que recuerdan a un cerebro. Tóxica incluso si se cocina.",
"Coprinus comatus": "Joven es blanco y alargado, con escamas; las láminas ennegrecen al madurar.",
"Chroogomphus rutilus": "Sombrero cobrizo y láminas gruesas que bajan por el pie. Frecuente bajo pinos.",
"Craterellus lutescens": "Pequeño embudo de tonos pardos, con pie amarillo vivo y pliegues poco marcados.",
"Marasmius oreades": "Seta pequeña de prado, de pie flexible y láminas separadas; puede aparecer en corros.",
"Agaricus campestris": "En prados; las láminas pasan de rosadas a marrón oscuro. Comprueba siempre la base completa.",
"Collybia rivulosa": "Seta pálida y pequeña de prados, con láminas decurrentes; contiene muscarina.",
"Hygrophorus russula": "Robusta, con tonos blancos y rosados vinosos; asociada a bosques de encinas y robles.",
"Entoloma sinuatum": "Sombrero grande y pálido; las láminas adquieren tono rosado con la madurez.",
"Boletus edulis": "Tiene poros, no láminas; pie robusto con retículo claro y carne que no azulea al corte.",
"Boletus reticulatus": "Boleto de sombrero seco y pie reticulado, frecuente en bosques de frondosas.",
"Boletus aereus": "Boleto de sombrero muy oscuro, con poros claros de joven; aparece en bosques cálidos.",
"Boletus pinophilus": "Boleto de sombrero pardo rojizo y pie grueso, relacionado con pinares de montaña.",
"Leccinellum lepidum": "Boleto mediterráneo de poros amarillos y pequeñas escamas en el pie.",
"Amanita verna": "Amanita enteramente blanca con láminas blancas, anillo y volva en la base.",
"Cortinarius orellanus": "Seta pardo anaranjada con cortina en ejemplares jóvenes; puede dañar gravemente los riñones.",
"Cortinarius rubellus": "Cortinario rojizo de coníferas; la intoxicación renal puede aparecer días después.",
"Craterellus tubaeformis": "Embudo pardo, pliegues grisáceos que bajan por el pie y pie amarillento, a menudo hueco.",
"Hygrophoropsis aurantiaca": "Naranja, con láminas finas y bifurcadas; se confunde con el rossinyol.",
"Amanita phalloides": "Sombrero de color variable, láminas blancas, anillo y volva en forma de saco.",
"Amanita virosa": "Amanita blanca de bosques frescos, con láminas blancas y volva basal.",
"Tricholoma terreum": "Seta gris y frágil de pinar; hay tricólomas grises tóxicos parecidos.",
"Tricholoma portentosum": "Sombrero gris fibriloso y posibles tonos amarillos en pie y láminas.",
"Tricholoma pardinum": "Tricóloma gris de escamas oscuras, robusto; se puede confundir con fredolics.",
"Galerina marginata": "Pequeña y parda, sobre madera muerta; puede contener amatoxinas mortales.",
"Pleurotus ostreatus": "Crece en madera en forma de repisa; láminas blancas que descienden hacia un pie lateral.",
"Pleurotus eryngii": "Seta carnosa de zonas herbosas, asociada a raíces de cardos y otras umbelíferas.",
"Inosperma erubescens": "Seta pálida que se enrojece al manipularse; contiene muscarina.",
"Hygrophorus latitabundus": "Grande y muy viscoso en tiempo húmedo, con sombrero gris pardo y láminas claras.",
"Hygrophorus eburneus": "Higróforo blanco o marfil, muy viscoso con humedad, frecuente junto a hayas.",
"Hydnum repandum": "Bajo el sombrero tiene pequeñas púas, no láminas ni poros.",
"Lactifluus rugatus": "Sombrero rojizo y arrugado, ligado a encinas y alcornoques; observa el látex.",
"Russula cyanoxantha": "Sombrero de color variable y láminas blancas flexibles; cuidado con amanitas verdosas.",
"Russula virescens": "Sombrero verde que se agrieta como un mosaico; la base del pie debe examinarse entera.",
"Hygrophorus marzuolus": "Seta robusta de final de invierno, a menudo medio enterrada bajo la hojarasca.",
"Rubroboletus satanas": "Boleto grande con poros rojos y pie amarillo rojizo; la carne suele azulear.",
"Tylopilus felleus": "Boleto parecido al cep; los poros se vuelven rosados y el retículo del pie es oscuro.",
"Calocybe gambosa": "Seta carnosa y clara de primavera, de olor característico a harina fresca.",
"Suillus luteus": "Boleto de pinar con sombrero viscoso, poros amarillos y anillo en el pie.",
"Suillus granulatus": "Boleto de pinar con poros amarillos y pie granulado, sin anillo.",
"Morchella esculenta": "Sombrero alveolado y cuerpo hueco al corte; debe cocinarse bien.",
"Amanita caesarea": "Sombrero anaranjado, láminas y pie amarillos, con volva blanca en la base.",
"Lepiota brunneoincarnata": "Lepiota pequeña con escamas pardo rojizas; puede contener amatoxinas mortales.",
"Paxillus involutus": "Sombrero pardo con borde enrollado de joven y láminas decurrentes.",
"Calvatia gigantea": "Bola blanca grande de prados; el interior cambia de blanco a amarillento al madurar.",
"Lycoperdon utriforme": "Pedos de lobo grandes de prado, con superficie dividida en placas.",
"Lycoperdon perlatum": "Pequeño y en forma de pera, con verrugas o espinas que se desprenden.",
"Ramaria formosa": "Seta ramificada como un coral, de ramas rosadas y puntas amarillas de joven.",
"Ramaria aurea": "Coral amarillo dorado; la separación de otras ramarias puede requerir microscopía.",
"Lepista nuda": "Tonos violetas en sombrero, láminas y pie; aparece entre hojarasca.",
"Lactarius deliciosus": "Pinetell: látex naranja al corte y manchas verdes con la edad; crece asociado a pinos.",
"Lactarius chrysorrheus": "Lactario de tonos salmón cuyo látex blanco pasa a amarillo azufre.",
"Amanita pantherina": "Sombrero pardo con restos blancos, anillo y base bulbosa.",
"Cyclocybe cylindracea": "Forma grupos densos sobre madera de álamos y otros árboles de ribera.",
"Amanita muscaria": "Sombrero rojo con restos blancos; el color puede variar con la lluvia.",
"Cantharellus cibarius": "Rossinyol amarillo con pliegues bajo el sombrero, no láminas finas verdaderas.",
"Lactarius sanguifluus": "Rovelló: látex rojo vinoso al corte, pie con pequeños hoyuelos y asociación con pinos.",
"Lactarius torminosus": "Lactario rosado con borde lanoso y látex blanco, asociado a abedules.",
"Tuber melanosporum": "Trufa subterránea oscura; interior marmoleado con vetas claras y aroma intenso.",
"Craterellus cornucopioides": "Embudo delgado casi negro, sin láminas, difícil de distinguir entre la hojarasca.",
}

LOOKALIKES = {
    "Lactarius deliciosus": ["Lactarius sanguifluus", "Lactarius torminosus", "Lactarius chrysorrheus"],
    "Lactarius sanguifluus": ["Lactarius deliciosus", "Lactarius torminosus", "Lactarius chrysorrheus"],
    "Cantharellus cibarius": ["Hygrophoropsis aurantiaca", "Omphalotus olearius"],
    "Boletus edulis": ["Tylopilus felleus", "Rubroboletus satanas"],
    "Tricholoma terreum": ["Tricholoma pardinum"],
    "Amanita caesarea": ["Amanita muscaria", "Amanita phalloides"],
    "Russula virescens": ["Amanita phalloides"],
    "Hygrophorus russula": ["Entoloma sinuatum"],
}


def slug(value):
    value = unicodedata.normalize("NFKD", value)
    return re.sub(r"[^a-z0-9]+", "-", value.encode("ascii", "ignore").decode().lower()).strip("-")


out = []
for item in RAW:
    scientific = item["scientific"]
    facts = item["facts"]
    habitat = re.search(r"Hàbitat (.*?)(?: Altitud| Temporada|$)", facts)
    altitude = re.search(r"Altitud (.*)$", facts)
    season = re.search(r"Temporada (.*)$", facts)
    category = item["category"]
    status = "toxic" if "tòxic" in category.lower() else "avoid" if category.lower() in ("no comestible", "no recomanat") else "edible"
    out.append({
        "id": slug(scientific), "name": item["name"], "spanishName": item.get("spanishName", ""), "scientific": scientific,
        "category": category, "status": status,
        "habitat": habitat.group(1) if habitat else "", "altitude": altitude.group(1) if altitude else "",
        "season": season.group(1) if season else item.get("season", ""), "note": NOTES[scientific],
        "lookalikes": [slug(name) for name in LOOKALIKES.get(scientific, [])],
        "source": item["source"],
    })

assert len(out) == 62
(ROOT / "data" / "species.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print("Wrote", len(out), "species")
