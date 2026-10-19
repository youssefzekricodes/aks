import { CAR_BODIES, CAR_FUELS, CAR_GEARBOXES, CAR_STATES, slugify } from "../../lib/cars.ts";
import type { SearchFilters } from "../catalog/search.ts";

/**
 * Search landing pages: a /recherche link with exactly one filter (body type, fuel,
 * gearbox, condition or budget) is a page of its own for Google, with its own
 * title, heading and text ("SUV d'occasion à Sfax"). Any other combination
 * stays out of the index (canonical /recherche).
 */
export type Landing = {
  filters: SearchFilters;
  path: string;
  h1: string;
  title: string;
  description: (count: number) => string;
  intro: string;
};

const SITE = "Auto Kontor Sfax (AKS)";
const SHOWROOM = "Route Sidi Mansour, km 5 à Sfax";

const BODY_PLURALS: Record<string, string> = {
  Citadine: "Citadines",
  Compacte: "Compactes",
  Berline: "Berlines",
  SUV: "SUV",
  Coupé: "Coupés",
  Monospace: "Monospaces",
  Utilitaire: "Utilitaires",
  "Pick-up": "Pick-up",
  Cabriolet: "Cabriolets",
};
const FUEL_NAMES: Record<string, string> = {
  Essence: "Voitures essence",
  Diesel: "Voitures diesel",
  Hybride: "Voitures hybrides",
  "Hybride rechargeable": "Voitures hybrides rechargeables",
  Électrique: "Voitures électriques",
};
const GEARBOX_NAMES: Record<string, string> = {
  Auto: "Voitures automatiques",
  Manuelle: "Voitures à boîte manuelle",
};
/** Budgets offered on the home page (prix_max). */
export const LANDING_BUDGETS = [40_000, 80_000, 120_000, 250_000];

const amount = (value: number) => value.toLocaleString("fr-FR").replace(/\s/g, " ");

function build(filters: SearchFilters, h1: string, intro: string): Landing {
  const search = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  return {
    filters,
    path: `/recherche?${search.toString()}`,
    h1,
    title: `${h1} — ${SITE}`,
    description: (count) =>
      `${h1} : ${count > 0 ? `${count} véhicule${count > 1 ? "s" : ""} contrôlé${count > 1 ? "s" : ""}, ` : ""}prix, photos et kilométrage. Reprise, financement et garantie chez ${SITE}, ${SHOWROOM}.`,
    intro,
  };
}

/** Every landing page (for the sitemap and the "recherches populaires" links). */
export function allLandings(): Landing[] {
  return [
    build(
      { etat: "occasion" },
      "Voitures d’occasion à Sfax",
      `Toutes nos voitures d’occasion à Sfax, sélectionnées et contrôlées avant la vente : historique vérifié, essai sur rendez-vous, reprise de votre véhicule et financement sur place chez ${SITE}.`,
    ),
    build(
      { etat: "neuf" },
      "Voitures neuves à Sfax",
      `Véhicules neufs disponibles au showroom ${SITE} ou importés sur commande, avec les options de votre choix.`,
    ),
    ...CAR_BODIES.map((body) =>
      build(
        { carrosserie: slugify(body) },
        `${BODY_PLURALS[body] ?? body} d’occasion à Sfax`,
        `Notre sélection de ${(BODY_PLURALS[body] ?? body).toLowerCase()} d’occasion et neufs à Sfax : prix, kilométrage et photos de chaque véhicule. Vous ne trouvez pas le modèle recherché ? ${SITE} le trouve ou l’importe pour vous.`,
      ),
    ),
    ...CAR_FUELS.map((fuel) =>
      build(
        { energie: slugify(fuel) },
        `${FUEL_NAMES[fuel] ?? fuel} d’occasion à Sfax`,
        `${FUEL_NAMES[fuel] ?? fuel} d’occasion et neuves disponibles à Sfax chez ${SITE}. Chaque véhicule est inspecté avant la vente ; essai, reprise et financement possibles.`,
      ),
    ),
    ...CAR_GEARBOXES.map((gearbox) =>
      build(
        { boite: slugify(gearbox) },
        `${GEARBOX_NAMES[gearbox] ?? gearbox} d’occasion à Sfax`,
        `${GEARBOX_NAMES[gearbox] ?? gearbox} d’occasion à Sfax : découvrez le stock ${SITE}, avec prix et photos, et réservez votre essai au showroom.`,
      ),
    ),
    ...LANDING_BUDGETS.map((max) =>
      build(
        { prix_max: max },
        `Voitures à moins de ${amount(max)} DT à Sfax`,
        `Voitures d’occasion à moins de ${amount(max)} DT à Sfax, contrôlées et garanties. Financement possible : parlez-en à l’équipe ${SITE}.`,
      ),
    ),
  ];
}

const LANDING_KEYS = ["etat", "carrosserie", "energie", "boite", "prix_max"] as const;

/** The landing page for these filters, or null (several filters, sorting, pages…). */
export function landingFor(filters: SearchFilters): Landing | null {
  const keys = Object.keys(filters).filter(
    (key) => filters[key as keyof SearchFilters] !== undefined,
  );
  if (keys.length !== 1 || !LANDING_KEYS.includes(keys[0] as (typeof LANDING_KEYS)[number]))
    return null;
  const key = keys[0] as keyof SearchFilters;
  return (
    allLandings().find((landing) => String(landing.filters[key] ?? "") === String(filters[key])) ??
    null
  );
}

/** Brands searched in Tunisia: their pages stay indexed even without stock. */
export const POPULAR_BRANDS = [
  "volkswagen",
  "peugeot",
  "renault",
  "citroen",
  "kia",
  "hyundai",
  "toyota",
  "mercedes-benz",
  "bmw",
  "audi",
  "seat",
  "skoda",
  "fiat",
  "suzuki",
  "dacia",
  "nissan",
  "ford",
  "opel",
  "chery",
  "mg",
  "gwm",
  "geely",
  "mahindra",
  "isuzu",
  "mitsubishi",
  "land-rover",
  "porsche",
  "jeep",
  "cupra",
  "byd",
];

/** Brand page wording (title, heading, text), with or without vehicles in stock. */
export function brandLanding(name: string, count: number) {
  const h1 = `${name} d’occasion à Sfax`;
  return {
    h1,
    title: `${name} occasion Sfax${count ? ` — ${count} véhicule${count > 1 ? "s" : ""}` : ""} | ${SITE}`,
    description: count
      ? `${count} ${name} d’occasion et neuve${count > 1 ? "s" : ""} à Sfax chez ${SITE} : prix, kilométrage, photos. Essai, reprise et financement au showroom.`
      : `Vous cherchez une ${name} d’occasion à Sfax ? ${SITE} trouve ou importe la ${name} de votre choix : recherche personnalisée, reprise et financement.`,
    intro: count
      ? `Nos ${name} d’occasion et neuves à Sfax, contrôlées avant la vente. Essai sur rendez-vous, reprise de votre véhicule et financement chez ${SITE}, ${SHOWROOM}.`
      : `Aucune ${name} n’est en stock pour le moment, mais ${SITE} peut trouver ou importer le modèle ${name} que vous cherchez, avec les options de votre choix. Décrivez-nous votre projet : nous vous répondons rapidement.`,
  };
}
