import { useMemo, useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumbs,
  Button,
  Drawer,
  EmptyState,
  Label,
  ListBox,
  Pagination,
  SearchField,
  Select,
} from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { SearchX, SlidersHorizontal } from "lucide-react";
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
  const [query, setQuery] = useState(filters.q ?? "");

  const results = useMemo(() => sortCars(filterCars(cars, filters), filters.tri), [cars, filters]);
  const { items, page, pages } = paginate(results, filters.page);
  const active = activeFilterCount(filters) - (lockedBrand ? 1 : 0);

  const change: FilterChange = (patch) => onNavigate({ ...filters, ...patch, page: undefined });
  const reset = () => {
    setQuery("");
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
          <div className="flex flex-wrap items-end gap-3">
            <form
              role="search"
              className="min-w-48 flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                change({ q: query.trim() || undefined });
              }}
            >
              <SearchField
                value={query}
                onChange={setQuery}
                onClear={() => change({ q: undefined })}
                aria-label="Rechercher un véhicule"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Marque, modèle, année…" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </form>
            <Select
              className="w-52"
              value={filters.tri ?? "recent"}
              onChange={(key) =>
                change({
                  tri: key === "recent" || key === null ? undefined : (String(key) as Sort),
                })
              }
            >
              <Label className="sr-only">Trier par</Label>
              <Select.Trigger>
                <Select.Value />
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
            <EmptyState className="mt-8 rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <SearchX className="mx-auto size-8 text-muted" aria-hidden />
              <p className="mt-3 font-medium">Aucun véhicule ne correspond à ces critères.</p>
              <p className="mt-1 text-sm text-muted">
                Retirez un filtre ou contactez-nous : nous pouvons trouver le véhicule pour vous.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {active > 0 && <Button onPress={reset}>Réinitialiser les filtres</Button>}
                <Link to="/contact" className={buttonVariants({ variant: "secondary" })}>
                  Nous contacter
                </Link>
              </div>
            </EmptyState>
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
