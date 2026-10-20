import { queryOptions } from "@tanstack/react-query";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  formatKm,
  slugify,
  type Car,
} from "@/lib/cars";
import {
  getDashboardStats,
  listFacebookSync,
  listAllCars,
  listLeads,
  type CarInput,
  listSiteContent,
} from "@/lib/data";
import { getProfile, getSession, listAdmins } from "@/features/auth/auth.functions";
import { formatDate, plural as translatedPlural } from "./i18n";

/** Non-component helpers shared by the admin sections. */

export const ADMIN_SECTIONS = [
  "dashboard",
  "cars",
  "showcase",
  "facebook",
  "brands",
  "content",
  "leads",
  "connectors",
  "admins",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export const isAdminSection = (value: unknown): value is AdminSection =>
  typeof value === "string" && (ADMIN_SECTIONS as readonly string[]).includes(value);

export const SECTION_LABELS: Record<AdminSection, string> = {
  dashboard: "Tableau de bord",
  cars: "Véhicules",
  showcase: "Vitrine",
  facebook: "Import Facebook",
  brands: "Marques",
  content: "Contenu du site",
  leads: "Demandes",
  connectors: "Connecteurs",
  admins: "Administrateurs",
};

/** Each section is its own route (code loaded on demand). */
export const SECTION_PATHS = {
  dashboard: "/admin",
  cars: "/admin/vehicules",
  showcase: "/admin/vitrine",
  facebook: "/admin/import-facebook",
  brands: "/admin/marques",
  content: "/admin/contenu",
  leads: "/admin/demandes",
  connectors: "/admin/connecteurs",
  admins: "/admin/administrateurs",
} as const satisfies Record<AdminSection, string>;

/** Section shown at a path, sub-pages included (e.g. /admin/vehicules/marque/kia). */
export function sectionAt(pathname: string): AdminSection {
  const path = pathname.replace(/\/+$/, "") || "/";
  const found = (Object.entries(SECTION_PATHS) as [AdminSection, string][])
    .filter(([, value]) => path === value || (value !== "/admin" && path.startsWith(`${value}/`)))
    .sort(([, a], [, b]) => b.length - a.length)[0];
  return found?.[0] ?? "dashboard";
}

/**
 * The three states of the stock and their colours, the same on the home screen and
 * the dashboard (validated for colour-blind readers; always shown with labels).
 */
export const STOCK_STATUS = [
  { key: "sale", label: "En vente", color: "#7c3aed" },
  { key: "draft", label: "Non publiés", color: "#38bdf8" },
  { key: "sold", label: "Vendus", color: "#f07563" },
] as const;
export type StockStatus = (typeof STOCK_STATUS)[number]["key"];

/** Filters the vehicle list can open with (`/admin/vehicules?filtre=…`). */
export const CAR_FILTERS = ["published", "draft", "sold", "incomplete"] as const;
export type CarFilter = (typeof CAR_FILTERS)[number];

/** Sections only a super administrator can open. */
export const SUPER_ADMIN_SECTIONS: readonly AdminSection[] = ["admins"];

/** The server may send `updated_at`; older payloads do not. */
export type AdminCar = Car & { updated_at?: string | undefined };

export const adminCarsQueryKey = ["admin-cars"] as const;
export const adminCarsQuery = queryOptions({
  queryKey: adminCarsQueryKey,
  queryFn: () => listAllCars() as Promise<AdminCar[]>,
});

/** Facebook post status per vehicle ("Facebook" column of the vehicle list). */
export const facebookSyncQuery = queryOptions({
  queryKey: ["admin-facebook-sync"],
  queryFn: () => listFacebookSync(),
  staleTime: 30_000,
});

export const dashboardStatsQuery = queryOptions({
  queryKey: ["admin-dashboard-stats"],
  queryFn: () => getDashboardStats(),
});

export const leadsQueryOptions = queryOptions({
  queryKey: ["admin-leads"],
  queryFn: () => listLeads(),
});

/* ───────── Accounts & security ───────── */

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type Role = Session["role"];
export type Factor = Session["factors"][number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  super_admin: "Super administrateur",
};

export const FACTOR_LABELS: Record<Factor["type"], string> = {
  email: "E-mail",
  totp: "Application",
  phone: "SMS",
};

/**
 * Super admins confirm each sign-in with a code sent by e-mail. Authenticator app
 * and SMS factors can be offered again by switching this on (SMS needs a provider).
 */
export const APP_FACTORS_ENABLED = false;

export const adminContentQuery = queryOptions({
  queryKey: ["admin-site-content"],
  queryFn: () => listSiteContent(),
});

export const sessionQueryKey = ["admin-session"] as const;
export const sessionQuery = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: () => getSession(),
  // Reused across admin pages; checked again after a minute or when the tab regains focus.
  staleTime: 60_000,
});

/** "Mon profil": name, e-mail and the address waiting for confirmation. */
export const PROFILE_PATH = "/admin/profil";
export const profileQuery = queryOptions({
  queryKey: ["admin-profile"],
  queryFn: () => getProfile(),
});

/** Name shown for an admin: their display name, or else their e-mail. */
export const displayName = (admin: { name?: string | null; email: string }) =>
  admin.name?.trim() || admin.email;

export const adminsQuery = queryOptions({
  queryKey: ["admin-accounts"],
  queryFn: () => listAdmins(),
  // Configuration errors (Edge Function not deployed) will not fix themselves.
  retry: false,
});

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

const PASSWORD_SETS = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!#$%&*+-=?@_~",
];

/** Uniform random index below `max` (rejection sampling, no modulo bias). */
function randomIndex(max: number) {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value < limit) return value % max;
  }
}

/** Random password with at least one upper case letter, lower case letter, digit and symbol. */
export function generatePassword(length = 16) {
  const all = PASSWORD_SETS.join("");
  const chars = PASSWORD_SETS.map((set) => set.charAt(randomIndex(set.length)));
  while (chars.length < length) chars.push(all.charAt(randomIndex(all.length)));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j] ?? "", chars[i] ?? ""];
  }
  return chars.join("");
}

/** 0: too short, 1: weak, 2: fair, 3: strong. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < PASSWORD_MIN) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((re) => re.test(password)).length;
  if (password.length >= 16 && classes >= 3) return 3;
  if (classes >= 3 || password.length >= 16) return 2;
  return 1;
}

export type PasswordDraft = { password: string; confirm: string };
export const emptyPasswordDraft: PasswordDraft = { password: "", confirm: "" };

/** Null when the pair can be sent, otherwise the message to show. */
export function passwordProblem({ password, confirm }: PasswordDraft) {
  if (password.length < PASSWORD_MIN) return `${PASSWORD_MIN} caractères minimum.`;
  if (password.length > PASSWORD_MAX) return `${PASSWORD_MAX} caractères maximum.`;
  if (password !== confirm) return "Les deux mots de passe ne correspondent pas.";
  return null;
}

/** E.164: "+" then 8 to 15 digits, no leading zero. Spaces are ignored. */
export const toE164 = (phone: string) => phone.replace(/[\s.()-]/g, "");
export const isE164 = (phone: string) => /^\+[1-9]\d{7,14}$/.test(toE164(phone));

export type Option = { id: string; label: string };

export const toOptions = (values: readonly string[], labels: Record<string, string> = {}) =>
  values.map((value) => ({ id: value, label: labels[value] ?? value }));

/** Case- and accent-insensitive text for searching. */
export const normalize = (value: string) =>
  value.toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "");

export const errorMessage = (error: unknown, fallback = "Une erreur est survenue.") =>
  error instanceof Error && error.message ? error.message : fallback;

/** Dates in the admin's language (same `.format()` as Intl). */
export const dateTimeFormat = {
  format: (date: Date) => formatDate(date, { dateStyle: "medium", timeStyle: "short" }),
};
export const dateFormat = { format: (date: Date) => formatDate(date, { dateStyle: "medium" }) };

/** "3 véhicules", in the admin's language (see i18n). */
export const plural = translatedPlural;

export const MAX_PHOTOS = 40;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const LOGO_TYPES = ["image/png", "image/webp"];

export const emptyCar: CarInput = {
  slug: "",
  name: "",
  brand: "",
  model: "",
  version: "",
  country: "Germany",
  year: new Date().getFullYear(),
  price: 0,
  price_on_request: false,
  km: formatKm(0),
  km_value: 0,
  fuel: "Essence",
  gearbox: "Auto",
  body: "Berline",
  state: "Occasion",
  transmission: "",
  doors: null,
  seats: null,
  fiscal_power: null,
  images: [],
  description: "",
  published: false,
  sold: false,
  discount_price: null,
  social_caption: "",
  social_targets: [],
};

/** Form state for a car; legacy records without `model` get it from `name`. */
export function toDraft(car: CarInput): CarInput {
  const { updated_at: _ignored, ...rest } = car as AdminCar;
  return { ...rest, model: car.model?.trim() ? car.model : car.name, version: car.version ?? "" };
}

/** Value sent to the server: `name` stays filled for older consumers. */
export function toPayload(car: CarInput): CarInput {
  const name = [car.model?.trim(), car.version?.trim()].filter(Boolean).join(" ").trim();
  return { ...car, name: name || car.name, slug: slugify(car.slug) };
}

export const autoSlug = (car: Pick<CarInput, "brand" | "model" | "version">) =>
  slugify(`${car.brand} ${car.model ?? ""} ${car.version ?? ""}`);

/** Photos prepared and sent at the same time. */
export const UPLOAD_CONCURRENCY = 3;

const isOneOf = (values: readonly string[], value: string | undefined) =>
  Boolean(value && values.includes(value));

/**
 * Details a vehicle still lacks (labels as in the form). Imported vehicles store
 * "À préciser" or the year 1900 where the source didn't say, which counts as missing.
 */
export function missingFields(car: CarInput): string[] {
  const missing: [boolean, string][] = [
    [car.images.length === 0, "Photos"],
    [!car.model?.trim() || car.name === "Modèle à préciser", "Modèle"],
    [car.year <= 1900, "Année"],
    [!car.price_on_request && car.price <= 0, "Prix"],
    [car.state === "Occasion" && car.km_value <= 0, "Kilométrage"],
    [!isOneOf(CAR_FUELS, car.fuel), "Carburant"],
    [!isOneOf(CAR_GEARBOXES, car.gearbox), "Boîte de vitesses"],
    [!isOneOf(CAR_BODIES, car.body), "Carrosserie"],
    [!isOneOf(CAR_COUNTRIES, car.country), "Origine"],
    [car.fiscal_power == null, "Puissance fiscale"],
    [!car.description.trim(), "Description"],
  ];
  return missing.filter(([isMissing]) => isMissing).map(([, label]) => label);
}

/**
 * Fields to fill: the missing ones, plus the price whenever none is set — even
 * when it is hidden ("Contactez-nous"), as for the cars imported from Facebook.
 */
export function fieldsToFill(car: CarInput) {
  const missing = missingFields(car);
  return car.price <= 0 && !missing.includes("Prix") ? [...missing, "Prix"] : missing;
}
