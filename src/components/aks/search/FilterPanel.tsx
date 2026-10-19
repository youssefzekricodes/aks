import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button, Label, Slider } from "@heroui/react";
import { X } from "@/components/icons";
import { formatNumber, type Car } from "@/lib/cars";
import { cn } from "@/lib/utils";
import { brandSettingsQuery } from "@/lib/queries";
import {
  arrangeBrands,
  bodyOptions,
  brandOptions,
  brandsOf,
  facetOptions,
  toggleBrand,
  type FacetKey,
  type SearchFilters,
} from "@/features/catalog/search";
import { brandBySlug } from "@/features/catalog/brands";
import { BrandLogo, useBrandLogoUrl } from "../BrandLogo";
import { BodyIcon } from "../BodyIcon";
import { FilterSelect } from "../FilterSelect";
import { NoStockModal, type NoStockItem } from "../NoStockModal";

export type FilterChange = (patch: Partial<SearchFilters>) => void;

const KM_STEPS = [10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000];
const BRANDS_COLLAPSED = 9;

function Group({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 border-b border-separator py-5 first:pt-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold">{title}</legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

/** Toggle tile used for brands and body types (aria-pressed button). */
function Tile({
  pressed,
  disabled,
  dim = false,
  onPress,
  children,
  label,
}: {
  pressed: boolean;
  disabled?: boolean;
  /** Nothing in stock: still clickable (opens the dialog) but visually quieter. */
  dim?: boolean;
  onPress: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "group flex min-h-20 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-md border px-1.5 py-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40",
        pressed
          ? "border-accent bg-accent-soft text-foreground"
          : "border-border bg-surface text-muted hover:text-foreground",
        dim && !pressed && "opacity-55 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

function PriceRange({
  cars,
  filters,
  onChange,
}: {
  cars: Car[];
  filters: SearchFilters;
  onChange: FilterChange;
}) {
  const ceiling = useMemo(() => {
    const max = Math.max(0, ...cars.filter((c) => !c.price_on_request).map((c) => c.price));
    return Math.max(10_000, Math.ceil(max / 10_000) * 10_000);
  }, [cars]);
  const current: [number, number] = [
    filters.prix_min ?? 0,
    Math.min(filters.prix_max ?? ceiling, ceiling),
  ];
  const [value, setValue] = useState(current);
  // Follow URL changes (reset, chip removal).
  useEffect(() => setValue(current), [current[0], current[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Slider
      aria-label="Prix"
      minValue={0}
      maxValue={ceiling}
      step={5_000}
      value={value}
      onChange={(v) => setValue(v as [number, number])}
      onChangeEnd={(v) => {
        const [min, max] = v as [number, number];
        onChange({
          prix_min: min > 0 ? min : undefined,
          prix_max: max < ceiling ? max : undefined,
        });
      }}
      className="w-full"
    >
      <div className="flex justify-between text-sm">
        <Label className="sr-only">Prix</Label>
        <span className="tabular">{formatNumber(value[0])} DT</span>
        <span className="tabular">
          {formatNumber(value[1])} DT{value[1] >= ceiling ? " +" : ""}
        </span>
      </div>
      <Slider.Track className="mt-3">
        {({ state }) => (
          <>
            <Slider.Fill />
            {state.values.map((_, i) => (
              <Slider.Thumb
                key={i}
                index={i}
                aria-label={i === 0 ? "Prix minimum" : "Prix maximum"}
              />
            ))}
          </>
        )}
      </Slider.Track>
    </Slider>
  );
}

export function FilterPanel({
  cars,
  filters,
  onChange,
  lockedBrand,
}: {
  cars: Car[];
  filters: SearchFilters;
  onChange: FilterChange;
  /** On a brand page the brand cannot be toggled; offer a way out instead. */
  lockedBrand?: string;
}) {
  const [allBrands, setAllBrands] = useState(false);
  const logoUrl = useBrandLogoUrl();
  const options = (key: FacetKey) => facetOptions(cars, filters, key);
  const { data: brandSettings = [] } = useQuery(brandSettingsQuery);
  // Hidden brands stay reachable while they have cars matching the search.
  const brands = arrangeBrands(brandOptions(cars, filters), brandSettings, { keepStocked: true });
  const bodies = bodyOptions(cars, filters);
  // Types with nothing in the whole stock open a dialog instead of an empty search.
  const stocked = useMemo(
    () =>
      new Set(
        bodyOptions(cars, {})
          .filter((b) => b.count > 0)
          .map((b) => b.value),
      ),
    [cars],
  );
  const [empty, setEmpty] = useState<NoStockItem | null>(null);
  const brandsInStock = useMemo(
    () =>
      new Set(
        brandOptions(cars, {})
          .filter((b) => b.count > 0)
          .map((b) => b.value),
      ),
    [cars],
  );
  const states = options("etat");
  const fuels = options("energie");
  const gearboxes = options("boite");
  const transmissions = options("transmission");
  const models = options("modele");
  const years = useMemo(() => [...new Set(cars.map((c) => c.year))].sort((a, b) => b - a), [cars]);
  const chosenBrands = brandsOf(filters);
  const shownBrands = allBrands ? brands : brands.slice(0, BRANDS_COLLAPSED);

  return (
    <div>
      <NoStockModal item={empty} onClose={() => setEmpty(null)} />
      <Group title="Marque">
        {lockedBrand ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <BrandLogo brand={lockedBrand} wordmark={false} className="h-6 max-w-16" />
              {lockedBrand}
            </span>
            <Link
              to="/recherche"
              search={{ ...filters, marque: undefined, modele: undefined, page: undefined }}
              className="text-sm text-accent hover:underline"
            >
              Changer
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
              {shownBrands.map((b) => (
                <Tile
                  key={b.value}
                  label={`${b.label} (${b.count})`}
                  pressed={chosenBrands.includes(b.value)}
                  dim={!brandsInStock.has(b.value)}
                  onPress={() =>
                    // Several brands can be chosen; a model only goes with one brand.
                    brandsInStock.has(b.value) || chosenBrands.includes(b.value)
                      ? onChange({ marque: toggleBrand(filters, b.value), modele: undefined })
                      : setEmpty({ kind: "brand", label: b.label })
                  }
                >
                  {logoUrl(b.label) ? (
                    <>
                      <BrandLogo brand={b.label} size={26} />
                      <span className="block w-full truncate">{b.label}</span>
                    </>
                  ) : (
                    <span className="line-clamp-2 w-full break-words font-semibold uppercase leading-tight tracking-wide text-foreground/80">
                      {b.label}
                    </span>
                  )}
                </Tile>
              ))}
            </div>
            {brands.length > BRANDS_COLLAPSED && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onPress={() => setAllBrands((v) => !v)}
              >
                {allBrands ? "Moins de marques" : `Toutes les marques (${brands.length})`}
              </Button>
            )}
          </>
        )}
        <FilterSelect
          className="mt-3"
          label="Modèle"
          allLabel={
            chosenBrands.length === 1
              ? "Tous modèles"
              : chosenBrands.length
                ? "Une seule marque pour choisir un modèle"
                : "Choisissez d’abord une marque"
          }
          value={filters.modele}
          onChange={(modele) => onChange({ modele })}
          options={models}
          isDisabled={chosenBrands.length !== 1 || models.length === 0}
          showCounts
        />
      </Group>

      {bodies.length > 0 && (
        <Group title="Carrosserie">
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
            {bodies.map((b) => (
              <Tile
                key={b.value}
                label={`${b.label} (${b.count})`}
                pressed={filters.carrosserie === b.value}
                dim={!stocked.has(b.value)}
                onPress={() =>
                  stocked.has(b.value) || filters.carrosserie === b.value
                    ? onChange({
                        carrosserie: filters.carrosserie === b.value ? undefined : b.value,
                      })
                    : setEmpty({ kind: "body", label: b.label })
                }
              >
                <BodyIcon
                  body={b.label}
                  active={filters.carrosserie === b.value}
                  className="h-7 max-w-full"
                />
                <span className="block w-full truncate">{b.label}</span>
              </Tile>
            ))}
          </div>
        </Group>
      )}

      <Group title="Budget">
        <PriceRange cars={cars} filters={filters} onChange={onChange} />
      </Group>

      {states.length > 0 && (
        <Group title="État">
          <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-secondary p-1" role="group">
            {[{ value: undefined, label: "Tous", count: undefined }, ...states].map((s) => {
              const active = filters.etat === s.value;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ etat: s.value })}
                  className={cn(
                    "rounded px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus",
                    active
                      ? "bg-surface font-medium shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title="Caractéristiques">
        <div className="grid gap-3">
          <FilterSelect
            label="Kilométrage maximum"
            allLabel="Indifférent"
            value={filters.km_max === undefined ? undefined : String(filters.km_max)}
            onChange={(v) => onChange({ km_max: v ? Number(v) : undefined })}
            options={KM_STEPS.map((km) => ({ value: String(km), label: `${formatNumber(km)} km` }))}
          />
          <FilterSelect
            label="Année minimum"
            allLabel="Indifférente"
            value={filters.annee_min === undefined ? undefined : String(filters.annee_min)}
            onChange={(v) => onChange({ annee_min: v ? Number(v) : undefined })}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          {fuels.length > 0 && (
            <FilterSelect
              label="Énergie"
              allLabel="Toutes"
              value={filters.energie}
              onChange={(energie) => onChange({ energie })}
              options={fuels}
              showCounts
            />
          )}
          {gearboxes.length > 0 && (
            <FilterSelect
              label="Boîte de vitesses"
              allLabel="Toutes"
              value={filters.boite}
              onChange={(boite) => onChange({ boite })}
              options={gearboxes}
              showCounts
            />
          )}
          {transmissions.length > 0 && (
            <FilterSelect
              label="Transmission"
              allLabel="Toutes"
              value={filters.transmission}
              onChange={(transmission) => onChange({ transmission })}
              options={transmissions}
              showCounts
            />
          )}
        </div>
      </Group>
    </div>
  );
}

/** Removable chips for the active filters. */
export function ActiveFilters({
  cars,
  filters,
  onChange,
  onReset,
  lockedBrand,
}: {
  cars: Car[];
  filters: SearchFilters;
  onChange: FilterChange;
  onReset: () => void;
  lockedBrand?: string;
}) {
  const labelOf = (key: FacetKey) =>
    facetOptions(cars, {}, key).find((o) => o.value === filters[key])?.label ?? filters[key];
  const chips: { key: string; label: string; clear: Partial<SearchFilters> }[] = [];
  if (filters.q) chips.push({ key: "q", label: `« ${filters.q} »`, clear: { q: undefined } });
  if (filters.marque && !lockedBrand)
    for (const slug of brandsOf(filters))
      chips.push({
        key: `marque-${slug}`,
        // Brands without stock are not in the facets: use the registry name.
        label:
          brandBySlug(slug)?.name ??
          facetOptions(cars, {}, "marque").find((o) => o.value === slug)?.label ??
          slug,
        clear: { marque: toggleBrand(filters, slug), modele: undefined },
      });
  for (const key of ["modele", "carrosserie", "etat", "energie", "boite", "transmission"] as const)
    if (filters[key]) chips.push({ key, label: labelOf(key)!, clear: { [key]: undefined } });
  if (filters.prix_min !== undefined || filters.prix_max !== undefined)
    chips.push({
      key: "prix",
      label: `${formatNumber(filters.prix_min ?? 0)} – ${
        filters.prix_max === undefined ? "∞" : formatNumber(filters.prix_max)
      } DT`,
      clear: { prix_min: undefined, prix_max: undefined },
    });
  if (filters.km_max !== undefined)
    chips.push({
      key: "km",
      label: `≤ ${formatNumber(filters.km_max)} km`,
      clear: { km_max: undefined },
    });
  if (filters.annee_min !== undefined)
    chips.push({
      key: "annee",
      label: `Depuis ${filters.annee_min}`,
      clear: { annee_min: undefined },
    });
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.clear)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-sm hover:border-[color-mix(in_oklab,var(--border)_60%,var(--foreground)_25%)] focus-visible:outline-2 focus-visible:outline-focus"
          aria-label={`Retirer le filtre ${chip.label}`}
        >
          {chip.label}
          <X className="size-3.5 text-muted" aria-hidden />
        </button>
      ))}
      <Button variant="ghost" size="sm" onPress={onReset}>
        Réinitialiser
      </Button>
    </div>
  );
}
