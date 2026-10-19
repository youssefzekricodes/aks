import { useMemo, useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Breadcrumbs, Button, Drawer, Label, ListBox, Pagination, Select } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { publicCarsQuery } from "@/lib/queries";
import {
  activeFilterCount,
  filterCars,
  paginate,
  sortCars,
  type SearchFilters,
  type Sort,
} from "@/features/catalog/search";
import { CarCard, CarGrid } from "../CarCard";
import { NoResults } from "../NoResults";
import { ActiveFilters, FilterPanel, type FilterChange } from "./FilterPanel";

const SORT_LABELS: Record<Sort, string> = {
  recent: "Recommandés",
  "prix-asc": "Prix croissant",
  "prix-desc": "Prix décroissant",
  "km-asc": "Kilométrage croissant",
  "annee-desc": "Année la plus récente",
};

function resultCount(count: number) {
  return `${count} véhicule${count > 1 ? "s" : ""}`;
}

/**
 * Listing with filters, sorting and pagination. The URL is the source of truth:
 * `onNavigate` receives the next filters and updates the route's search params.
 */
export function SearchPage({
  filters,
  onNavigate,
  title,
  intro,
  breadcrumbs,
  lockedBrand,
}: {
  filters: SearchFilters;
  onNavigate: (next: SearchFilters) => void;
  title: ReactNode;
  intro?: ReactNode;
  breadcrumbs: { label: string; to?: string }[];
  lockedBrand?: string;
}) {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const [drawer, setDrawer] = useState(false);

  const results = useMemo(() => sortCars(filterCars(cars, filters), filters.tri), [cars, filters]);
  const { items, page, pages } = paginate(results, filters.page);
  const active = activeFilterCount(filters) - (lockedBrand ? 1 : 0);

  const change: FilterChange = (patch) => onNavigate({ ...filters, ...patch, page: undefined });
  const reset = () => {
    onNavigate(lockedBrand ? { marque: filters.marque } : {});
  };
  const goTo = (p: number) => {
    onNavigate({ ...filters, page: p > 1 ? p : undefined });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const panel = (
    <FilterPanel
      cars={cars}
      filters={filters}
      onChange={change}
      {...(lockedBrand ? { lockedBrand } : {})}
    />
  );

  return (
    <main className="container-page pb-20 pt-6">
      <Breadcrumbs>
        {breadcrumbs.map((crumb) => (
          <Breadcrumbs.Item key={crumb.label} {...(crumb.to ? { href: crumb.to } : {})}>
            {crumb.label}
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="tabular mt-1 text-sm text-muted" aria-live="polite">
            {resultCount(results.length)}
            {active > 0 &&
              ` · ${active} filtre${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}`}
          </p>
          {intro && <div className="mt-3 max-w-3xl text-sm text-muted">{intro}</div>}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside aria-label="Filtres" className="hidden lg:block">
          <div>{panel}</div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Select
              className="w-60"
              value={filters.tri ?? "recent"}
              onChange={(key) =>
                change({
                  tri: key === "recent" || key === null ? undefined : (String(key) as Sort),
                })
              }
            >
              <Label className="sr-only">Trier par</Label>
              <Select.Trigger>
                <ArrowUpDown className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="shrink-0 text-muted">Trier :</span>
                <Select.Value className="min-w-0 truncate font-medium" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(Object.keys(SORT_LABELS) as Sort[]).map((sort) => (
                    <ListBox.Item key={sort} id={sort} textValue={SORT_LABELS[sort]}>
                      {SORT_LABELS[sort]}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Drawer isOpen={drawer} onOpenChange={setDrawer}>
              <Button variant="secondary" className="lg:hidden">
                <SlidersHorizontal className="size-4" />
                Filtres{active > 0 && ` (${active})`}
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="bottom">
                  <Drawer.Dialog className="max-h-[88vh]">
                    <Drawer.Handle />
                    <Drawer.Header>
                      <Drawer.Heading>Filtres</Drawer.Heading>
                      <Drawer.CloseTrigger />
                    </Drawer.Header>
                    <Drawer.Body className="overflow-y-auto scrollbar-none">{panel}</Drawer.Body>
                    <Drawer.Footer className="gap-2">
                      <Button variant="tertiary" onPress={reset} isDisabled={active === 0}>
                        Réinitialiser
                      </Button>
                      <Button className="flex-1" slot="close">
                        Voir {resultCount(results.length)}
                      </Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </div>

          <div className="mt-4">
            <ActiveFilters
              cars={cars}
              filters={filters}
              onChange={change}
              onReset={reset}
              {...(lockedBrand ? { lockedBrand } : {})}
            />
          </div>

          {items.length > 0 ? (
            <div className="mt-5">
              <CarGrid>
                {items.map((car, i) => (
                  <CarCard key={car.id} car={car} priority={i < 3} />
                ))}
              </CarGrid>
            </div>
          ) : (
            <NoResults
              className="mt-8"
              // With no stock at all, say new arrivals are coming rather than "reset".
              filtersActive={active > 0 && cars.length > 0}
              onReset={reset}
              // Other stock to look at instead (the matching list is empty).
              suggestions={sortCars(cars).slice(0, 3)}
            />
          )}

          {pages > 1 && (
            <Pagination className="mt-10 justify-center" aria-label="Pagination des résultats">
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous isDisabled={page === 1} onPress={() => goTo(page - 1)}>
                    <Pagination.PreviousIcon />
                    <span>Précédent</span>
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link isActive={p === page} onPress={() => goTo(p)}>
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next isDisabled={page === pages} onPress={() => goTo(page + 1)}>
                    <span>Suivant</span>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          )}
        </div>
      </div>
    </main>
  );
}
