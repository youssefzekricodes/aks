# Writes src/features/catalog/brand-logo-ratios.json: width/height of every bundled
# brand logo, used to give logos the same visual area (see BrandLogo).
# Run after adding or replacing a logo in public/brands:
#   python3 -m pip install pillow && python3 scripts/brand-logo-ratios.py
import json, os, re
from PIL import Image

ratios = {}
for f in sorted(os.listdir("public/brands")):
    slug, ext = os.path.splitext(f)
    path = os.path.join("public/brands", f)
    if ext == ".webp":
        w, h = Image.open(path).size
    elif ext == ".svg":
        box = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', open(path).read())
        w, h = (float(box.group(1)), float(box.group(2))) if box else (1, 1)
    else:
        continue
    ratios[slug] = round(w / h, 3)
with open("src/features/catalog/brand-logo-ratios.json", "w") as out:
    json.dump(ratios, out, indent=2)
    out.write("\n")
print(len(ratios), "ratios written")
