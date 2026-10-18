import { slugify } from "../../lib/cars.ts";

/**
 * Known manufacturers and where their logo comes from:
 * - "image": full-colour logo in public/brands/<slug>.webp (taken from the
 *   automobile.tn brand list, shown in its original colours);
 * - "svg": monochrome public/brands/<slug>.svg generated from simple-icons
 *   (scripts/generate-brand-logos.ts) for brands that list does not cover;
 * - none: an uploaded logo (admin → Marques) or a typeset wordmark.
 */
export type BrandInfo = {
  name: string;
  slug: string;
  country: string;
  logo?: "image" | "svg" | undefined;
};

const brand = (name: string, country: string, logo?: "image" | "svg"): BrandInfo => ({
  name,
  slug: slugify(name),
  country,
  logo,
});

export const BRANDS: BrandInfo[] = [
  brand("Alfa Romeo", "Italy", "image"),
  brand("Audi", "Germany", "image"),
  brand("Avantier", "China", "image"),
  brand("BAIC", "China", "image"),
  brand("Bako", "China", "image"),
  brand("BMW", "Germany", "image"),
  brand("BYD", "China", "image"),
  brand("Cenntro", "China", "image"),
  brand("Changan", "China", "image"),
  brand("Chery", "China", "image"),
  brand("Chevrolet", "USA", "image"),
  brand("Citroën", "France", "image"),
  brand("Cupra", "Spain", "image"),
  brand("Dacia", "Romania", "image"),
  brand("Deepal", "China", "image"),
  brand("DFSK", "China", "image"),
  brand("Dongfeng", "China", "image"),
  brand("DS Automobiles", "France", "svg"),
  brand("FAW", "China", "image"),
  brand("Fiat", "Italy", "image"),
  brand("Foday", "China", "image"),
  brand("Ford", "USA", "image"),
  brand("Foton", "China", "image"),
  brand("GAC", "China", "image"),
  brand("Geely", "China", "image"),
  brand("GWM", "China", "image"),
  brand("Honda", "Japan", "image"),
  brand("Hyundai", "Korea", "image"),
  brand("IM Motors", "China", "image"),
  brand("Isuzu", "Japan"),
  brand("JAC", "China", "image"),
  brand("Jaguar", "UK", "image"),
  brand("Jeep", "USA", "image"),
  brand("Jetour", "China", "image"),
  brand("JMC", "China", "image"),
  brand("JMEV", "China", "image"),
  brand("KGM", "Korea", "image"),
  brand("Kia", "Korea", "image"),
  brand("Land Rover", "UK", "image"),
  brand("Lexus", "Japan"),
  brand("Lynk & Co", "China", "image"),
  brand("M-Hero", "China", "image"),
  brand("Mahindra", "India", "image"),
  brand("Maserati", "Italy", "svg"),
  brand("Mazda", "Japan", "svg"),
  brand("Mercedes-Benz", "Germany", "image"),
  brand("MG", "China", "image"),
  brand("Mini", "UK", "image"),
  brand("Mitsubishi", "Japan", "image"),
  brand("Nissan", "Japan", "image"),
  brand("Omoda & Jaecoo", "China", "image"),
  brand("Opel", "Germany", "image"),
  brand("Peugeot", "France", "image"),
  brand("Porsche", "Germany", "image"),
  brand("Renault", "France", "image"),
  brand("Seat", "Spain", "image"),
  brand("Škoda", "Czechia", "image"),
  brand("Subaru", "Japan", "svg"),
  brand("Suzuki", "Japan", "image"),
  brand("Tata", "India", "image"),
  brand("Tesla", "USA", "svg"),
  brand("Toyota", "Japan", "image"),
  brand("Volkswagen", "Germany", "image"),
  brand("Volvo", "Sweden", "image"),
  brand("Voyah", "China", "image"),
  brand("Wallyscar", "Tunisia", "image"),
  brand("Xpeng", "China", "image"),
];

/** Other spellings found in stored data. */
const ALIASES: Record<string, string> = {
  ssangyong: "kgm",
  omoda: "omoda-jaecoo",
  jaecoo: "omoda-jaecoo",
  "great-wall": "gwm",
  mercedes: "mercedes-benz",
  vw: "volkswagen",
  ds: "ds-automobiles",
};

const BY_SLUG = new Map(BRANDS.map((b) => [b.slug, b]));

/** Registry entry for a stored brand name; unknown brands get a derived entry. */
export function brandInfo(name: string): BrandInfo {
  const slug = slugify(name);
  return BY_SLUG.get(ALIASES[slug] ?? slug) ?? { name, slug, country: "" };
}

export function brandBySlug(slug: string): BrandInfo | undefined {
  return BY_SLUG.get(ALIASES[slug] ?? slug);
}

export function brandLogoPath(info: BrandInfo) {
  return info.logo === "image"
    ? `/brands/${info.slug}.webp`
    : info.logo === "svg"
      ? `/brands/${info.slug}.svg`
      : null;
}
