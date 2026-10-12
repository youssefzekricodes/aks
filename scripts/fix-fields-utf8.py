import json
import subprocess

PATH = "src/features/content/fields.json"

# Read the pristine original as raw BYTES ( tránh Windows cp1252 mangling),
# then decode explicitly as UTF-8.
result = subprocess.run(
    ["git", "show", "HEAD:" + PATH.replace("\\", "/")],
    capture_output=True,
)
if result.returncode != 0:
    raise SystemExit("git show failed: " + result.stderr.decode("utf-8", "replace"))
original_data = json.loads(result.stdout.decode("utf-8"))

new_items = [
    {"icon": "Banknote", "title": "Achat", "text": "Vous cherchez un véhicule dans notre showroom ? Notre équipe vous accompagne lors de l'achat neuf ou d'occasion."},
    {"icon": "Repeat", "title": "Vendre", "text": "Vous voulez vendre votre voiture ? Recevez une estimation claire et rapide de votre véhicule par notre équipe."},
    {"icon": "Wrench", "title": "Echange", "text": "Vous souhaitez échanger votre véhicule ? Contactez notre équipe pour organiser un essai ou valider les modalités."},
    {"icon": "Ship", "title": "Importation", "text": "Recherche et importation du modèle exact que vous voulez, options comprises."},
    {"icon": "ShieldCheck", "title": "Garantie", "text": "Jusqu'à 24 mois de garantie mécanique écrite sur les véhicules éligibles."},
]

fixed = 0
for item in original_data:
    if item.get("key") == "services.items":
        item["value"] = json.dumps(new_items, ensure_ascii=False)
        fixed += 1
assert fixed == 1, "services.items entry not found"

with open(PATH, "w", encoding="utf-8", newline="\n") as f:
    json.dump(original_data, f, ensure_ascii=False, indent=2)
    f.write("\n")

# -------
# Verify
# -------
with open(PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# 1. services.items is a proper one-level-escaped JSON array
row = next(i for i in data if i.get("key") == "services.items")
parsed = json.loads(row["value"])
assert isinstance(parsed, list) and len(parsed) == 5
assert [r["title"] for r in parsed] == ["Achat", "Vendre", "Echange", "Importation", "Garantie"]

# 2. every collection field parses as a list
for item in data:
    if item.get("type") == "collection":
        assert isinstance(json.loads(item["value"]), list), item["key"]

# 3. no mojibake: accented characters must be intact
sample = next(i for i in data if i.get("key") == "seo.home_title")["value"]
assert "Showroom automobile premium à Sfax" in sample, sample
nav = next(i for i in data if i.get("key") == "navbar.items")["value"]
assert "À propos" in nav, nav

print("OK: fields.json restored from git + services.items updated")
