// Writes public/brands/<slug>.svg for every brand marked `logo: "svg"` in
// src/features/catalog/brands.ts, using the CC0 paths from simple-icons.
// Run after adding a brand: node --experimental-strip-types scripts/generate-brand-logos.ts
import { mkdirSync, writeFileSync } from "node:fs";
import * as icons from "simple-icons";

type Icon = { title: string; slug: string; path: string };
const all = Object.values(icons as unknown as Record<string, Icon>).filter((i) => i?.path);
const bySlug = new Map(all.map((icon) => [icon.slug, icon]));

const { BRANDS } = await import("../src/features/catalog/brands.ts");
mkdirSync("public/brands", { recursive: true });
let written = 0;
for (const brand of BRANDS.filter((b: { logo?: string }) => b.logo === "svg")) {
  const icon = bySlug.get(brand.slug.replaceAll("-", ""));
  if (!icon) throw new Error(`No simple-icons logo for ${brand.name}`);
  writeFileSync(
    `public/brands/${brand.slug}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>${icon.title}</title><path d="${icon.path}"/></svg>\n`,
  );
  written++;
}
console.log(`${written} logos written to public/brands`);
