import json

PATH = "src/features/content/fields.json"

with open(PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

changed = 0
for item in data:
    if item.get("key") == "hero.text_28":
        # The 4th hero dropdown filters by car brand (car.brand in Hero.tsx /
        # recherche.tsx), so its label must be "Marque", not "Pays fabricant".
        item["value"] = "Marque"
        item["label"] = "Libellé — Marque"
        changed += 1

assert changed == 1, "hero.text_28 entry not found"

with open(PATH, "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

# Verify
with open(PATH, "r", encoding="utf-8") as f:
    data = json.load(f)
row = next(i for i in data if i.get("key") == "hero.text_28")
assert row["value"] == "Marque", row
assert "premium à Sfax" in next(i["value"] for i in data if i["key"] == "seo.home_title")
print("OK: hero.text_28 =", row["value"], "| label:", row["label"])
