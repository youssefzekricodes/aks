import { z } from "zod";
import { CAR_BODIES, carModel, salePrice, slugify, type Car } from "../../lib/cars.ts";
import { BRANDS, brandInfo, brandSearchTerms } from "./brands.ts";

/**
 * One filter model for the home search, /recherche and the brand pages.
 * Values live in the URL (French keys) so results are shareable; anything
 * unknown is dropped instead of silently matching every car.
 */
export const SORTS = ["recent", "prix-asc", "prix-desc", "km-asc", "annee-desc"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 12;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const amount = z.coerce.number().int().min(0).max(1e9);
/** One brand ("kia") or several, comma-separated ("kia,mg"). */
const brands = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*){0,11}$/)
  .max(400)
  .transform((value) => [...new Set(value.split(","))].join(","));

/** Brands chosen in the filters (empty = all). */
export const brandsOf = (filters: Pick<SearchFilters, "marque">) =>
  filters.marque ? filters.marque.split(",") : [];
/** Adds or removes one brand; undefined when none is left. */
export function toggleBrand(filters: Pick<SearchFilters, "marque">, slug: string) {
  const current = brandsOf(filters);
  const next = current.includes(slug) ? current.filter((b) => b !== slug) : [...current, slug];
  return next.length ? next.join(",") : undefined;
}

export const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  marque: brands.optional(),
  modele: slug.optional(),
  carrosserie: slug.optional(),
  etat: slug.optional(),
  energie: slug.optional(),
  boite: slug.optional(),
  transmission: slug.optional(),
  prix_min: amount.optional(),
  prix_max: amount.optional(),
  km_max: amount.optional(),
  annee_min: z.coerce.number().int().min(1900).max(2100).optional(),
  tri: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
});
export type SearchFilters = z.infer<typeof searchSchema>;
export type FilterKey = Exclude<keyof SearchFilters, "tri" | "page">;

/** Pre-redesign links used ?price=&type=&km=&brand= — translate them once. */
function legacy(search: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const value = (key: string) => {
    const v = search[key];
    return typeof v === "string" && v && v !== "all" ? v : undefined;
  };
  const price = value("price");
  if (price) {
    const [min, max] = price.replace("+", "").split("-");
    if (min) out["prix_min"] = min;
    if (max) out["prix_max"] = max;
  }
  const km = value("km");
  if (km) out["km_max"] = km.endsWith("+") ? undefined : km.split("-")[1];
  if (value("type")) out["carrosserie"] = slugify(value("type")!);
  if (value("brand")) out["marque"] = slugify(value("brand")!);
  return out;
}

export function validateSearch(search: Record<string, unknown>): SearchFilters {
  const input: Record<string, unknown> = { ...legacy(search) };
  for (const key of Object.keys(searchSchema.shape)) {
    const v = search[key];
    if (v !== undefined && v !== "") input[key] = v;
  }
  const result: Record<string, unknown> = {};
  // Validate key by key so one bad value does not discard the others.
  for (const [key, schema] of Object.entries(searchSchema.shape)) {
    const parsed = (schema as z.ZodTypeAny).safeParse(input[key]);
    if (parsed.success && parsed.data !== undefined) result[key] = parsed.data;
  }
  // A model only makes sense for one brand.
  if (result["modele"] && (!result["marque"] || String(result["marque"]).includes(",")))
    delete result["modele"];
  return result as SearchFilters;
}

/* Facets: how a filter key reads a car, as a slug. */
const facetValue: Record<
  "marque" | "modele" | "carrosserie" | "etat" | "energie" | "boite" | "transmission",
  (car: Car) => string
> = {
  marque: (car) => brandInfo(car.brand).slug,
  modele: (car) => slugify(carModel(car)),
  carrosserie: (car) => slugify(car.body),
  etat: (car) => slugify(car.state),
  energie: (car) => slugify(car.fuel),
  boite: (car) => slugify(car.gearbox),
  transmission: (car) => slugify(car.transmission ?? ""),
};
export type FacetKey = keyof typeof facetValue;
export const FACET_KEYS = Object.keys(facetValue) as FacetKey[];

function matches(car: Car, f: SearchFilters, ignore?: FilterKey) {
  for (const key of FACET_KEYS) {
    if (key === ignore) continue;
    const wanted = f[key];
    if (!wanted) continue;
    if (
      key === "marque"
        ? !wanted.split(",").includes(facetValue.marque(car))
        : facetValue[key](car) !== wanted
    )
      return false;
  }
  const hasPriceBound = f.prix_min !== undefined || f.prix_max !== undefined;
  // Cars with a hidden price have no known price: they never match a price bound.
  if (ignore !== "prix_min" && hasPriceBound && car.price_on_request) return false;
  if (ignore !== "prix_min" && f.prix_min !== undefined && salePrice(car) < f.prix_min)
    return false;
  if (ignore !== "prix_min" && f.prix_max !== undefined && salePrice(car) > f.prix_max)
    return false;
  if (ignore !== "km_max" && f.km_max !== undefined && car.km_value > f.km_max) return false;
  if (ignore !== "annee_min" && f.annee_min !== undefined && car.year < f.annee_min) return false;
  if (ignore !== "q" && f.q) {
    const haystack = carSearchText(car);
    if (
      !slugify(f.q)
        .split("-")
        .every((word) => haystack.includes(word))
    )
      return false;
  }
  return true;
}

export function filterCars(cars: Car[], filters: SearchFilters) {
  return cars.filter((car) => matches(car, filters));
}

export function sortCars(cars: Car[], sort: Sort = "recent") {
  const priced = (car: Car) => (car.price_on_request ? Number.POSITIVE_INFINITY : salePrice(car));
  const sorted = [...cars];
  switch (sort) {
    case "prix-asc":
      return sorted.sort((a, b) => priced(a) - priced(b));
    case "prix-desc":
      // Unpriced cars still go last.
      return sorted.sort(
        (a, b) =>
          Number(Boolean(a.price_on_request)) - Number(Boolean(b.price_on_request)) ||
          salePrice(b) - salePrice(a),
      );
    case "km-asc":
      return sorted.sort((a, b) => a.km_value - b.km_value);
    case "annee-desc":
      return sorted.sort((a, b) => b.year - a.year);
    default:
      return sorted.sort((a, b) => a.sort_order - b.sort_order);
  }
}

export type FacetOption = { value: string; label: string; count: number };

/**
 * Options of one facet with the number of cars each would return given the
 * other active filters. Selected values are kept even at zero.
 */
export function facetOptions(cars: Car[], filters: SearchFilters, key: FacetKey): FacetOption[] {
  const counts = new Map<string, FacetOption>();
  for (const car of cars) {
    if (key === "modele" && filters.marque && !brandsOf(filters).includes(facetValue.marque(car)))
      continue;
    const value = facetValue[key](car);
    if (!value) continue;
    const option = counts.get(value) ?? { value, label: facetLabel(car, key), count: 0 };
    if (matches(car, filters, key)) option.count++;
    counts.set(value, option);
  }
  return [...counts.values()]
    .filter(
      (o) =>
        o.count > 0 ||
        (key === "marque" ? brandsOf(filters).includes(o.value) : filters[key] === o.value),
    )
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

/**
 * Every known body type in catalogue order, with counts (zero included), so
 * visitors see the full range; stored types outside the list are appended.
 */
export function bodyOptions(cars: Car[], filters: SearchFilters): FacetOption[] {
  const inStock = facetOptions(cars, filters, "carrosserie");
  const known = CAR_BODIES.map((body) => {
    const value = slugify(body);
    return inStock.find((o) => o.value === value) ?? { value, label: body, count: 0 };
  });
  // Other stored values (e.g. "À préciser" on imported cars not filled in yet) aren't shown.
  return known;
}

/**
 * Every known brand (logo list) with counts, zero included, plus any stored
 * brand outside the list. Sorted by availability: most cars first, then
 * alphabetical (brands without stock last).
 */
export function brandOptions(cars: Car[], filters: SearchFilters): FacetOption[] {
  const inStock = facetOptions(cars, filters, "marque");
  return [
    ...BRANDS.map(
      (b) => inStock.find((o) => o.value === b.slug) ?? { value: b.slug, label: b.name, count: 0 },
    ),
    ...inStock.filter((o) => !BRANDS.some((b) => b.slug === o.value)),
  ].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

/** Admin display settings for one brand (see brand_settings). */
export type BrandDisplay = { slug: string; hidden: boolean; favoriteRank: number | null };

/**
 * Brand lists on the site: hidden brands are dropped (unless `keepStocked` and they
 * have cars, so the filters still reach them) and favourites come first, by rank;
 * the rest keep their order (availability).
 */
export function arrangeBrands(
  options: FacetOption[],
  settings: BrandDisplay[],
  { keepStocked = false } = {},
): FacetOption[] {
  const bySlug = new Map(settings.map((s) => [s.slug, s]));
  const rank = (o: FacetOption) => bySlug.get(o.value)?.favoriteRank ?? Infinity;
  return options
    .filter((o) => !bySlug.get(o.value)?.hidden || (keepStocked && o.count > 0))
    .map((o, index) => ({ o, index }))
    .sort((a, b) => {
      const [ra, rb] = [rank(a.o), rank(b.o)];
      return ra === rb ? a.index - b.index : ra - rb;
    })
    .map(({ o }) => o);
}

/** Favourites first, then filled up to `size` with the best-stocked brands. */
export function carouselBrands(arranged: FacetOption[], settings: BrandDisplay[], size = 10) {
  const favorites = new Set(settings.filter((s) => s.favoriteRank !== null).map((s) => s.slug));
  const count = arranged.filter((o) => favorites.has(o.value)).length;
  return arranged.slice(0, Math.max(size, count));
}

function facetLabel(car: Car, key: FacetKey) {
  switch (key) {
    case "marque":
      return brandInfo(car.brand).name;
    case "modele":
      return carModel(car);
    case "carrosserie":
      return car.body;
    case "etat":
      return car.state;
    case "energie":
      return car.fuel;
    case "boite":
      return car.gearbox === "Auto" ? "Automatique" : car.gearbox;
    case "transmission":
      return car.transmission ?? "";
  }
}

export function activeFilterCount(filters: SearchFilters) {
  return (Object.keys(filters) as (keyof SearchFilters)[]).filter(
    (key) => key !== "tri" && key !== "page" && filters[key] !== undefined,
  ).length;
}

export function paginate<T>(items: T[], page = 1) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    pages,
  };
}

/**
 * Cars to suggest next to `car`: same model or brand, same body type, close
 * price and year, same fuel score higher; the rest of the stock fills in so the
 * section is never empty. Sold cars are not in `cars` (listings exclude them).
 */
export function relatedCars(car: Car, cars: Car[], size = 3): Car[] {
  const brand = brandInfo(car.brand).slug;
  const model = slugify(carModel(car));
  const price = car.price_on_request ? null : salePrice(car);
  const score = (other: Car) => {
    let points = 0;
    if (brandInfo(other.brand).slug === brand) {
      points += 3;
      if (slugify(carModel(other)) === model) points += 3;
    }
    if (other.body === car.body) points += 3;
    if (price !== null && !other.price_on_request) {
      const ratio = Math.abs(salePrice(other) - price) / Math.max(price, 1);
      if (ratio <= 0.15) points += 3;
      else if (ratio <= 0.3) points += 1;
    }
    if (Math.abs(other.year - car.year) <= 2) points += 1;
    if (other.fuel === car.fuel) points += 1;
    return points;
  };
  return cars
    .filter((other) => other.id !== car.id)
    .map((other) => ({ other, points: score(other) }))
    .sort((a, b) => b.points - a.points || a.other.sort_order - b.other.sort_order)
    .slice(0, size)
    .map(({ other }) => other);
}

/** Everything a car can be found by (brand and its other spellings, model, specs…). */
export function carSearchText(car: Car) {
  return slugify(
    [
      brandSearchTerms(brandInfo(car.brand).slug),
      car.brand,
      car.model ?? "",
      car.version ?? "",
      car.name,
      car.body,
      car.fuel,
      car.gearbox === "Auto" ? "automatique auto" : car.gearbox,
      car.state,
      car.year,
    ].join(" "),
  );
}

const words = (query: string) => slugify(query).split("-").filter(Boolean);

/**
 * Instant search of the header: the best matching published cars and brands.
 * Every word must match (prefix of a brand name, anywhere for cars).
 */
export function quickSearch(
  cars: Car[],
  query: string,
  { cars: carLimit = 6, brands: brandLimit = 6 } = {},
) {
  const terms = words(query);
  if (!terms.length) return { cars: [] as Car[], brands: [] as FacetOption[] };
  const stock = facetOptions(cars, {}, "marque");
  const count = (slug: string) => stock.find((o) => o.value === slug)?.count ?? 0;

  const brands = BRANDS.filter((brand) => {
    const text = brandSearchTerms(brand.slug).split("-");
    return terms.every((term) => text.some((word) => word.startsWith(term)));
  })
    .map((brand) => ({ value: brand.slug, label: brand.name, count: count(brand.slug) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, brandLimit);

  const matched = cars
    .map((car) => ({ car, text: carSearchText(car) }))
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    // Cars whose brand or model starts with the first word come first.
    .map(({ car, text }) => ({
      car,
      score: text.startsWith(terms[0]!) || slugify(carModel(car)).startsWith(terms[0]!) ? 0 : 1,
    }))
    .sort((a, b) => a.score - b.score || a.car.sort_order - b.car.sort_order)
    .slice(0, carLimit)
    .map(({ car }) => car);

  return { cars: matched, brands };
}
