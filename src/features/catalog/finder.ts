import { CAR_BODIES, CAR_FUELS, salePrice, type Car } from "../../lib/cars.ts";
import { brandsOf, facetOptions, filterCars, type SearchFilters } from "./search.ts";

/*
 * "Trouver ma voiture": a few questions a buyer has in mind, each answered with
 * the cars of the stock (counts on every choice, never a dead end). A question is
 * only asked when it helps with the cars left: no budget question while most of
 * them show no price, no gearbox question when they all have the same one, etc.
 * The answers become ordinary search filters (/recherche).
 */

export type FinderStepId = "carrosserie" | "budget" | "boite" | "energie" | "marque" | "annee";

export type FinderAnswers = {
  carrosserie?: string;
  /** Budget band id (see BUDGETS). */
  budget?: string;
  boite?: string;
  energie?: string;
  marque?: string[];
  /** Year band id (see YEARS). */
  annee?: string;
};

export type FinderOption = {
  value: string;
  label: string;
  /** One line under the label ("Idéale en ville"). */
  hint?: string;
  count: number;
};

export type FinderStep = {
  id: FinderStepId;
  question: string;
  help: string;
  multiple: boolean;
  options: FinderOption[];
};

export const BUDGETS = [
  { value: "40", label: "Moins de 40 000 DT", max: 40_000 },
  { value: "70", label: "Jusqu’à 70 000 DT", max: 70_000 },
  { value: "100", label: "Jusqu’à 100 000 DT", max: 100_000 },
  { value: "150", label: "Jusqu’à 150 000 DT", max: 150_000 },
  { value: "plus", label: "Plus de 150 000 DT", min: 150_000 },
] as const;

export const YEARS = [
  { value: "2022", label: "Très récente", hint: "2022 et plus", min: 2022 },
  { value: "2018", label: "Récente", hint: "2018 et plus", min: 2018 },
  { value: "2014", label: "Bon rapport qualité-prix", hint: "2014 et plus", min: 2014 },
] as const;

/** What each body type is good for, in a buyer's words. */
export const BODY_HINTS: Record<string, string> = {
  Citadine: "Petite et facile à garer en ville",
  Compacte: "Polyvalente pour tous les jours",
  Berline: "Confort et grand coffre pour la route",
  SUV: "Position haute, idéale en famille",
  Coupé: "Sportive et élégante",
  Monospace: "Beaucoup de place, jusqu’à 7 personnes",
  Utilitaire: "Pour transporter et travailler",
  "Pick-up": "Robuste, pour le travail et les charges",
  Cabriolet: "Pour le plaisir de rouler",
};

const FUEL_HINTS: Record<string, string> = {
  Essence: "Le plus courant, souple en ville",
  Diesel: "Économique sur les longs trajets",
  Hybride: "Consomme moins en ville",
  "Hybride rechargeable": "Roule en électrique sur les petits trajets",
  Électrique: "Zéro carburant, se recharge",
};

const ORDER: FinderStepId[] = ["carrosserie", "budget", "boite", "energie", "marque", "annee"];

/** Answers → search filters (/recherche). */
export function answersToFilters(answers: FinderAnswers): SearchFilters {
  const filters: SearchFilters = {};
  if (answers.carrosserie) filters.carrosserie = answers.carrosserie;
  if (answers.boite) filters.boite = answers.boite;
  if (answers.energie) filters.energie = answers.energie;
  if (answers.marque?.length) filters.marque = answers.marque.join(",");
  const budget = BUDGETS.find((b) => b.value === answers.budget);
  if (budget && "max" in budget) filters.prix_max = budget.max;
  if (budget && "min" in budget) filters.prix_min = budget.min;
  const year = YEARS.find((y) => y.value === answers.annee);
  if (year) filters.annee_min = year.min;
  return filters;
}

/** Cars matching the answers, leaving one question out (to count its options). */
function matching(cars: Car[], answers: FinderAnswers, without?: FinderStepId) {
  const rest = { ...answers };
  if (without) delete rest[without];
  return filterCars(cars, answersToFilters(rest));
}

/** Share of cars with a price shown: below this, a budget question would hide most cars. */
const MIN_PRICED_SHARE = 0.5;

function buildStep(cars: Car[], answers: FinderAnswers, id: FinderStepId): FinderStep | null {
  const pool = matching(cars, answers, id);
  if (pool.length < 2) return null;
  const filters = answersToFilters({ ...answers, [id]: undefined });
  const useful = (options: FinderOption[]) =>
    options.filter((o) => o.count > 0).length >= 1 &&
    options.some((o) => o.count > 0 && o.count < pool.length)
      ? options
      : null;

  switch (id) {
    case "carrosserie": {
      const options = facetOptions(cars, filters, "carrosserie")
        .filter((o) => (CAR_BODIES as readonly string[]).includes(o.label) && o.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((o) => ({ ...o, hint: BODY_HINTS[o.label] ?? "" }));
      const ok = useful(options);
      return ok && ok.length >= 2
        ? {
            id,
            question: "Quel type de voiture vous fait envie ?",
            help: "Choisissez ce qui correspond à votre quotidien.",
            multiple: false,
            options: ok,
          }
        : null;
    }
    case "budget": {
      const priced = pool.filter((car) => !car.price_on_request && salePrice(car) > 0);
      if (priced.length / pool.length < MIN_PRICED_SHARE) return null;
      const options = BUDGETS.map((b) => ({
        value: b.value,
        label: b.label,
        count: priced.filter((car) =>
          "max" in b ? salePrice(car) <= b.max : salePrice(car) > b.min,
        ).length,
      })).filter((o) => o.count > 0);
      return useful(options) && options.length >= 2
        ? {
            id,
            question: "Quel est votre budget ?",
            help: "Le financement est possible : parlez-en avec nous.",
            multiple: false,
            options,
          }
        : null;
    }
    case "boite": {
      const options = facetOptions(cars, filters, "boite")
        .filter((o) => (o.value === "auto" || o.value === "manuelle") && o.count > 0)
        .map((o) => ({
          ...o,
          hint:
            o.value === "auto"
              ? "Plus simple, surtout dans les bouchons"
              : "Plus de contrôle, souvent moins chère",
        }));
      const ok = useful(options);
      return ok
        ? {
            id,
            question: "Boîte automatique ou manuelle ?",
            help: "Si ça vous est égal, passez.",
            multiple: false,
            options: ok,
          }
        : null;
    }
    case "energie": {
      const options = facetOptions(cars, filters, "energie")
        .filter((o) => (CAR_FUELS as readonly string[]).includes(o.label) && o.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((o) => ({ ...o, hint: FUEL_HINTS[o.label] ?? "" }));
      const ok = useful(options);
      return ok && ok.length >= 2
        ? {
            id,
            question: "Quel carburant préférez-vous ?",
            help: "Pensez à vos trajets : ville, route ou les deux.",
            multiple: false,
            options: ok,
          }
        : null;
    }
    case "marque": {
      const options = facetOptions(cars, filters, "marque")
        .filter((o) => o.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
      return options.length >= 2
        ? {
            id,
            question: "Des marques préférées ?",
            help: "Choisissez-en une ou plusieurs, ou passez.",
            multiple: true,
            options,
          }
        : null;
    }
    case "annee": {
      const options = YEARS.map((y) => ({
        value: y.value,
        label: y.label,
        hint: y.hint,
        count: pool.filter((car) => car.year >= y.min).length,
      })).filter((o) => o.count > 0);
      const ok = useful(options);
      return ok
        ? {
            id,
            question: "Plutôt récente ?",
            help: "Une voiture plus ancienne coûte souvent moins cher.",
            multiple: false,
            options: ok,
          }
        : null;
    }
  }
}

/**
 * The next question to ask after the ones already answered or passed (`done`),
 * or null when there is nothing useful left to ask.
 */
export function nextStep(cars: Car[], answers: FinderAnswers, done: FinderStepId[]) {
  for (const id of ORDER) {
    if (done.includes(id)) continue;
    const step = buildStep(cars, answers, id);
    if (step) return step;
  }
  return null;
}

/** Cars matching every answer so far. */
export function finderResults(cars: Car[], answers: FinderAnswers) {
  return matching(cars, answers);
}

/** Questions that may still come (for the progress bar). */
export function remainingSteps(cars: Car[], answers: FinderAnswers, done: FinderStepId[]) {
  return ORDER.filter((id) => !done.includes(id) && buildStep(cars, answers, id)).length;
}

/** Readable summary of the answers ("SUV · Kia ou MG · automatique"). */
export function describeAnswers(cars: Car[], answers: FinderAnswers) {
  const parts: string[] = [];
  const label = (key: "carrosserie" | "boite" | "energie", value?: string) =>
    value ? facetOptions(cars, {}, key).find((o) => o.value === value)?.label : undefined;
  const body = label("carrosserie", answers.carrosserie);
  if (body) parts.push(body);
  const brands = brandsOf(answersToFilters({ marque: answers.marque ?? [] }));
  if (brands.length)
    parts.push(
      brands
        .map(
          (slug) => facetOptions(cars, {}, "marque").find((o) => o.value === slug)?.label ?? slug,
        )
        .join(" ou "),
    );
  const gearbox = label("boite", answers.boite);
  if (gearbox) parts.push(`boîte ${gearbox.toLowerCase()}`);
  const fuel = label("energie", answers.energie);
  if (fuel) parts.push(fuel.toLowerCase());
  const budget = BUDGETS.find((b) => b.value === answers.budget);
  if (budget) parts.push(budget.label.toLowerCase());
  const year = YEARS.find((y) => y.value === answers.annee);
  if (year) parts.push(year.hint);
  return parts.join(" · ");
}
