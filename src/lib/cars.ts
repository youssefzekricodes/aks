export type Car = {
  id: string;
  slug: string;
  /** Display name after the brand: model and version, e.g. "Classe C 220d". */
  name: string;
  brand: string;
  /** Model without version, used by the model filter. Older records only have `name`. */
  model?: string | undefined;
  /** Version / trim, e.g. "220d AMG Line". */
  version?: string | undefined;
  country: string;
  year: number;
  price: number;
  /** true when the admin hides the price: the site shows a "Contactez-nous" button instead. */
  price_on_request?: boolean | undefined;
  /** Legacy display string kept in sync with `km_value`; display uses `formatKm(km_value)`. */
  km: string;
  km_value: number;
  fuel: string;
  gearbox: string;
  body: string;
  state: string;
  transmission?: string | undefined;
  doors?: number | null | undefined;
  seats?: number | null | undefined;
  fiscal_power?: number | null | undefined;
  images: string[];
  description: string;
  published: boolean;
  sort_order: number;
  /** ISO timestamp of the last change (admin lists). */
  updated_at?: string | undefined;
};

export const CAR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><rect width="1024" height="768" fill="#e4e4e7"/></svg>',
  );

export function carImage(car: Pick<Car, "images">, index = 0) {
  return car.images[index] ?? CAR_PLACEHOLDER;
}

/** Model used for filtering: the explicit model, or the legacy name. */
export function carModel(car: Pick<Car, "model" | "name">) {
  return car.model?.trim() || car.name;
}

export function carTitle(car: Pick<Car, "brand" | "name">) {
  return `${car.brand} ${car.name}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const numberFormat = new Intl.NumberFormat("fr-FR");
export const formatNumber = (value: number) => numberFormat.format(value);
export const formatKm = (value: number) => `${numberFormat.format(value)} km`;
export const formatPrice = (value: number, currency = "DT") =>
  `${numberFormat.format(value)} ${currency}`;

/* Stored values are kept as they were written; labels are what the site shows. */

export const CAR_BODIES = [
  "Citadine",
  "Compacte",
  "Berline",
  "SUV",
  "Coupé",
  "Monospace",
  "Utilitaire",
  "Pick-up",
  "Cabriolet",
] as const;
export const CAR_STATES = ["Neuf", "Occasion"] as const;
export const CAR_FUELS = [
  "Essence",
  "Diesel",
  "Hybride",
  "Hybride rechargeable",
  "Électrique",
] as const;
export const CAR_GEARBOXES = ["Auto", "Manuelle"] as const;
export const CAR_TRANSMISSIONS = ["Traction", "Propulsion", "Intégrale"] as const;

export const GEARBOX_LABELS: Record<string, string> = { Auto: "Automatique", Manuelle: "Manuelle" };

export const COUNTRY_LABELS: Record<string, string> = {
  Germany: "Allemagne",
  France: "France",
  Italy: "Italie",
  Japan: "Japon",
  China: "Chine",
  Korea: "Corée du Sud",
  USA: "États-Unis",
  UK: "Royaume-Uni",
  Sweden: "Suède",
  Spain: "Espagne",
  Czechia: "Tchéquie",
  Romania: "Roumanie",
  India: "Inde",
  Tunisia: "Tunisie",
};
export const CAR_COUNTRIES = Object.keys(COUNTRY_LABELS);

export const label = (labels: Record<string, string>, value: string) => labels[value] ?? value;
