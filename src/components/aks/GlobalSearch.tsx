import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowLeft, ArrowRight, CornerDownLeft, Search, X } from "@/components/icons";
import { brandOptions, quickSearch, sortCars } from "@/features/catalog/search";
import { carImage, formatKm, salePrice, formatPrice, type Car } from "@/lib/cars";
import { publicCarsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

type Item =
  | { kind: "car"; car: Car }
  | { kind: "brand"; slug: string; name: string; count: number }
  | { kind: "all"; query: string };

const plural = (n: number) => `${n} véhicule${n > 1 ? "s" : ""}`;

/**
 * Header search: a field (desktop) or an icon (mobile) opening a search panel
 * with instant results — matching vehicles with their photo, and brands with
 * their logo. ⌘K / Ctrl+K or "/" opens it from anywhere.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      if (
        (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-64 items-center gap-2 rounded-full bg-white px-3.5 text-sm text-zinc-500 shadow-sm transition-shadow hover:shadow-md hover:ring-2 hover:ring-white/30 xl:flex"
      >
        <Search className="size-4 shrink-0 text-zinc-700" aria-hidden />
        <span className="flex-1 truncate text-start">Rechercher une voiture…</span>
        <kbd className="rounded border border-zinc-200 px-1.5 text-[0.7rem] font-medium text-zinc-400">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechercher une voiture"
        className="hidden size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 md:grid xl:hidden"
      >
        <Search className="size-5" aria-hidden />
      </button>
      {/* Phones: a full page rather than a pop-up. */}
      <Link
        to="/rechercher"
        aria-label="Rechercher une voiture"
        className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 md:hidden"
      >
        <Search className="size-5" aria-hidden />
      </Link>

      <ModalOverlay
        isOpen={open}
        onOpenChange={setOpen}
        isDismissable
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-[entering]:opacity-0 data-[exiting]:opacity-0"
      >
        <Modal className="mx-auto mt-0 h-dvh w-full max-w-2xl sm:mt-[10vh] sm:h-auto sm:px-4 data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:duration-200 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:duration-150 motion-reduce:animate-none data-[entering]:slide-in-from-top-4 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95">
          <Dialog aria-label="Rechercher une voiture" className="outline-none">
            {open && <SearchPanel onClose={() => setOpen(false)} />}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

/** Search box and instant results; `page` fills the screen (phones, /rechercher). */
export function SearchPanel({
  onClose,
  variant = "dialog",
}: {
  onClose: () => void;
  variant?: "dialog" | "page";
}) {
  const navigate = useNavigate();
  const { data: cars = [], isPending } = useQuery(publicCarsQuery);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);
  const trimmed = query.trim();

  const { carResults, brandResults } = useMemo(() => {
    if (!trimmed) {
      // Nothing typed yet: the latest arrivals and the best-stocked brands.
      return {
        carResults: sortCars(cars).slice(0, 4),
        brandResults: brandOptions(cars, {}).slice(0, 6),
      };
    }
    const found = quickSearch(cars, trimmed);
    return { carResults: found.cars, brandResults: found.brands };
  }, [cars, trimmed]);

  const items: Item[] = [
    ...carResults.map((car) => ({ kind: "car" as const, car })),
    ...brandResults.map((b) => ({
      kind: "brand" as const,
      slug: b.value,
      name: b.label,
      count: b.count,
    })),
    ...(trimmed ? [{ kind: "all" as const, query: trimmed }] : []),
  ];
  const current = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => setActive(0), [trimmed]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function go(item: Item | undefined) {
    if (!item) return;
    // Full-page search (phones): the result replaces the search page in the history.
    // Closing it first would go "back" after the navigation and return to the old page.
    const page = variant === "page";
    if (!page) onClose();
    const replace = page;
    if (item.kind === "car")
      void navigate({ to: "/vehicule/$slug", params: { slug: item.car.slug }, replace });
    else if (item.kind === "brand")
      void navigate({ to: "/marques/$brand", params: { brand: item.slug }, replace });
    else void navigate({ to: "/recherche", search: { q: item.query }, replace });
  }

  const optionId = (index: number) => `${listId}-${index}`;
  const option = (index: number) => ({
    id: optionId(index),
    role: "option" as const,
    "aria-selected": index === current,
    "data-index": index,
    onMouseMove: () => setActive(index),
    onClick: () => go(items[index]),
    className: cn(
      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
      index === current ? "bg-surface-secondary" : "",
    ),
  });
  let index = -1;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-surface",
        variant === "page"
          ? "h-dvh"
          : "h-dvh shadow-2xl sm:h-auto sm:max-h-[75vh] sm:rounded-2xl sm:border sm:border-border",
      )}
    >
      <div className="flex items-center gap-3 border-b border-separator px-4">
        {variant === "page" ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Retour"
            className="-ms-1 grid size-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-surface-secondary"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
        )}
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={items.length ? optionId(current) : undefined}
          aria-autocomplete="list"
          aria-label="Marque, modèle, année…"
          placeholder="Marque, modèle, année…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(items[current] ?? (trimmed ? { kind: "all", query: trimmed } : undefined));
            }
          }}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={variant === "page" ? () => setQuery("") : onClose}
          aria-label={variant === "page" ? "Effacer" : "Fermer la recherche"}
          hidden={variant === "page" && !query}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label="Résultats"
        className="flex-1 overflow-y-auto p-2"
      >
        {carResults.length > 0 && (
          <li
            role="presentation"
            className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {trimmed ? "Véhicules" : "Derniers arrivages"}
          </li>
        )}
        {carResults.map((car) => {
          index += 1;
          return (
            <li key={car.id} {...option(index)}>
              <img
                src={carImage(car)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-20 shrink-0 rounded-lg bg-surface-secondary object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {car.brand} {car.name}
                </span>
                <span className="tabular block truncate text-sm text-muted">
                  {car.year} · {formatKm(car.km_value)} · {car.fuel}
                </span>
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                {car.price_on_request ? "Prix sur demande" : formatPrice(salePrice(car))}
              </span>
            </li>
          );
        })}

        {brandResults.length > 0 && (
          <li
            role="presentation"
            className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Marques
          </li>
        )}
        {brandResults.map((brand) => {
          index += 1;
          return (
            <li key={brand.value} {...option(index)}>
              <span className="grid h-12 w-20 shrink-0 place-items-center rounded-lg bg-background">
                <BrandLogo brand={brand.label} size={26} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {brand.label}
              </span>
              <span className="shrink-0 text-sm text-muted">
                {brand.count ? plural(brand.count) : "Sur commande"}
              </span>
            </li>
          );
        })}

        {trimmed && (
          <>
            {!carResults.length && !brandResults.length && !isPending && (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-muted">
                Aucun véhicule ne correspond à « {trimmed} » pour le moment.
              </li>
            )}
            {(() => {
              index += 1;
              return (
                <li {...option(index)}>
                  <span className="grid h-12 w-20 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <ArrowRight className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    Voir tous les résultats pour « {trimmed} »
                  </span>
                </li>
              );
            })()}
          </>
        )}
      </ul>

      <div className="hidden items-center gap-4 border-t border-separator px-4 py-2.5 text-xs text-muted sm:flex">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-border px-1">↑</kbd>
          <kbd className="rounded border border-border px-1">↓</kbd> naviguer
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="grid place-items-center rounded border border-border px-1">
            <CornerDownLeft className="size-3" aria-hidden />
          </kbd>
          ouvrir
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-border px-1">Échap</kbd> fermer
        </span>
      </div>
    </div>
  );
}
