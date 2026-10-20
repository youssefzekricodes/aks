import { formatNumber, type Car } from "../../lib/cars.ts";
import { brandBySlug } from "./brands.ts";
import {
  brandsOf,
  facetOptions,
  toggleBrand,
  type FacetKey,
  type SearchFilters,
} from "./search.ts";

/*
 * The active search filters as readable, removable chips ("Boîte : Automatique",
 * "Budget : jusqu’à 120 000 DT"); a second brand reads "ou Peugeot", since brands
 * are alternatives while the other filters all apply together.
 */

export type FilterChip = {
  key: string;
  /** What the filter is about ("Boîte", "Budget"…); "ou" for a second brand. */
  group: string;
  /** Full name, for the helper and screen readers ("Marque : Peugeot"). */
  name: string;
  label: string;
  /** Filters without this one. */
  clear: Partial<SearchFilters>;
};

/** Every active filter as a labelled, removable chip (each brand is its own chip). */
export function activeChips(
  cars: Car[],
  filters: SearchFilters,
  lockedBrand?: string,
): FilterChip[] {
  const labelOf = (key: FacetKey) =>
    facetOptions(cars, {}, key).find((o) => o.value === filters[key])?.label ?? filters[key];
  const chips: Omit<FilterChip, "name">[] = [];
  if (filters.q)
    chips.push({
      key: "q",
      group: "Recherche",
      label: `« ${filters.q} »`,
      clear: { q: undefined },
    });
  if (filters.marque && !lockedBrand)
    for (const slug of brandsOf(filters))
      chips.push({
        key: `marque-${slug}`,
        // Several brands are alternatives: "Marque : Kia", "ou Peugeot".
        group: chips.some((c) => c.key.startsWith("marque-")) ? "ou" : "Marque",
        // Brands without stock are not in the facets: use the registry name.
        label:
          brandBySlug(slug)?.name ??
          facetOptions(cars, {}, "marque").find((o) => o.value === slug)?.label ??
          slug,
        clear: { marque: toggleBrand(filters, slug), modele: undefined },
      });
  const GROUPS = {
    modele: "Modèle",
    carrosserie: "Type",
    etat: "État",
    energie: "Carburant",
    boite: "Boîte",
    transmission: "Transmission",
  } as const;
  for (const key of ["modele", "carrosserie", "etat", "energie", "boite", "transmission"] as const)
    if (filters[key])
      chips.push({ key, group: GROUPS[key], label: labelOf(key)!, clear: { [key]: undefined } });
  if (filters.prix_min !== undefined || filters.prix_max !== undefined)
    chips.push({
      key: "prix",
      group: "Budget",
      label:
        filters.prix_min === undefined
          ? `jusqu’à ${formatNumber(filters.prix_max!)} DT`
          : filters.prix_max === undefined
            ? `plus de ${formatNumber(filters.prix_min)} DT`
            : `${formatNumber(filters.prix_min)} – ${formatNumber(filters.prix_max)} DT`,
      clear: { prix_min: undefined, prix_max: undefined },
    });
  if (filters.km_max !== undefined)
    chips.push({
      key: "km",
      group: "Kilométrage",
      label: `jusqu’à ${formatNumber(filters.km_max)} km`,
      clear: { km_max: undefined },
    });
  if (filters.annee_min !== undefined)
    chips.push({
      key: "annee",
      group: "Année",
      label: `${filters.annee_min} et plus`,
      clear: { annee_min: undefined },
    });
  return chips.map((chip) => ({
    ...chip,
    name: `${chip.group === "ou" ? "Marque" : chip.group} : ${chip.label}`,
  }));
}
