import { useEffect, useMemo, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "@/components/icons";
import { brandSettingsQuery, publicCarsQuery } from "@/lib/queries";
import { useSiteText } from "@/lib/site-content";
import {
  arrangeBrands,
  bodyOptions,
  brandOptions,
  carouselBrands,
  type FacetOption,
} from "@/features/catalog/search";
import { BrandLogo, useBrandLogoUrl } from "./BrandLogo";
import { BodyIcon } from "./BodyIcon";
import { NoStockModal, type NoStockItem } from "./NoStockModal";
import { Section, SectionHeader } from "./Section";

const plural = (count: number) => `${count} véhicule${count > 1 ? "s" : ""}`;

const brandTile =
  "group flex w-full min-w-0 flex-col items-center gap-2.5 rounded-lg px-1 py-3 text-center transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus";

/**
 * Borderless logo cell, like the reference catalogue: a fixed-size logo slot
 * (the brand name is the image's alt text) and the stock count. Links to the
 * brand page when in stock; brands without stock open the dialog instead.
 */
function BrandTile({ brand, onEmpty }: { brand: FacetOption; onEmpty: () => void }) {
  const text = useSiteText();
  const hasLogo = useBrandLogoUrl()(brand.label) !== null;
  const content = (
    <>
      <span className="flex h-14 w-full items-center justify-center">
        {hasLogo ? (
          <BrandLogo
            brand={brand.label}
            size={42}
            className="transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="line-clamp-2 text-sm font-semibold uppercase leading-tight tracking-wide">
            {brand.label}
          </span>
        )}
      </span>
      <span className="tabular block w-full truncate text-xs text-muted">
        {brand.count ? plural(brand.count) : text("brands.none", "Aucun véhicule")}
      </span>
    </>
  );
  return brand.count ? (
    <Link
      to="/marques/$brand"
      params={{ brand: brand.value }}
      className={brandTile}
      aria-label={`${brand.label}, ${plural(brand.count)}`}
      title={brand.label}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onEmpty}
      className={`${brandTile} opacity-60 hover:opacity-100`}
      aria-label={`${brand.label}, aucun véhicule en stock`}
      title={brand.label}
    >
      {content}
    </button>
  );
}

/** Every known brand, like the reference catalogue; brands without stock open a dialog. */
export function BrandGrid({ brands }: { brands: FacetOption[] }) {
  const [empty, setEmpty] = useState<NoStockItem | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-3 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
        {brands.map((brand) => (
          <li key={brand.value}>
            <BrandTile
              brand={brand}
              onEmpty={() => setEmpty({ kind: "brand", label: brand.label })}
            />
          </li>
        ))}
      </ul>
      <NoStockModal item={empty} onClose={() => setEmpty(null)} />
    </>
  );
}

const HOME_BRANDS = 10;
/** Auto-scroll speed, px per second. */
const SPEED = 30;
/** Below this many brands the row fits on large screens: no loop, no motion. */
const LOOP_FROM = 9;

/**
 * Infinite, auto-scrolling row of brands (no library). The list is rendered three
 * times and the scroll position jumps by one copy when it nears either end, so it
 * never runs out. Motion pauses on hover, focus and touch, and is off for users who
 * prefer reduced motion; swiping and scrolling keep working.
 */
export function BrandCarousel({ brands }: { brands: FacetOption[] }) {
  const text = useSiteText();
  const track = useRef<HTMLUListElement>(null);
  const [empty, setEmpty] = useState<NoStockItem | null>(null);
  const loop = brands.length >= LOOP_FROM;
  // Pause reasons; `until` is a timestamp (after a swipe).
  const hold = useRef({ hover: false, focus: false, touch: false, until: 0 });

  useEffect(() => {
    const element = track.current;
    if (!element || !loop) return;
    const copy = () => element.scrollWidth / 3;
    /** Keeps the position inside the middle copy (± half a copy). */
    const wrap = (position: number) => {
      const width = copy();
      if (position < width * 0.5) return position + width;
      if (position >= width * 1.5) return position - width;
      return position;
    };
    let position = copy();
    element.scrollLeft = position;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const h = hold.current;
      if (!h.hover && !h.focus && !h.touch && now >= h.until) {
        // The user scrolled (swipe, wheel): continue from there.
        if (Math.abs(element.scrollLeft - position) > 1) position = element.scrollLeft;
        position = wrap(position);
        if (!still.matches) position += SPEED * dt;
        element.scrollLeft = position;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Wrap after manual scrolling too (while paused under the pointer).
    const settle = () => {
      const next = wrap(element.scrollLeft);
      if (next !== element.scrollLeft) element.scrollLeft = next;
      position = element.scrollLeft;
    };
    element.addEventListener("scrollend", settle);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scrollend", settle);
    };
  }, [loop, brands]);

  const copies = loop ? [0, 1, 2] : [1];

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrousel"
      aria-label={text("brands.title", "Nos marques")}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hold.current.hover = true;
      }}
      onPointerLeave={() => (hold.current.hover = false)}
      onFocus={() => (hold.current.focus = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) hold.current.focus = false;
      }}
      onTouchStart={() => (hold.current.touch = true)}
      onTouchEnd={() => {
        hold.current.touch = false;
        hold.current.until = performance.now() + 2000;
      }}
    >
      <ul
        ref={track}
        className={`-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 sm:gap-3 ${loop ? "" : "snap-x snap-mandatory"}`}
      >
        {copies.map((copy) =>
          brands.map((brand) => (
            <li
              key={`${copy}-${brand.value}`}
              // Copies are decoration only: one set for assistive tech and the Tab key.
              aria-hidden={copy !== 1 || undefined}
              inert={copy !== 1}
              className="w-[29%] shrink-0 snap-start sm:w-[calc((100%-3rem)/5)] lg:w-[calc((100%-5.25rem)/8)]"
            >
              <BrandTile
                brand={brand}
                onEmpty={() => setEmpty({ kind: "brand", label: brand.label })}
              />
            </li>
          )),
        )}
      </ul>
      <NoStockModal item={empty} onClose={() => setEmpty(null)} />
    </div>
  );
}

/**
 * Home page: favourite brands first, then the best-stocked ones (10 in all, more
 * if there are more favourites); the full list lives on /marques.
 */
export function BrandsSection() {
  const text = useSiteText();
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const { data: settings } = useSuspenseQuery(brandSettingsQuery);
  const all = useMemo(() => arrangeBrands(brandOptions(cars, {}), settings), [cars, settings]);
  const top = useMemo(() => carouselBrands(all, settings, HOME_BRANDS), [all, settings]);
  return (
    <Section id="marques">
      <SectionHeader
        eyebrow={text("brands.eyebrow", "Marques")}
        title={text("brands.title", "Nos marques")}
        description={text(
          "brands.subtitle",
          "Choisissez une marque pour voir les véhicules disponibles.",
        )}
        action={
          <Link
            to="/marques"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            {text("brands.see_all", "Toutes les marques")}
            <span className="tabular text-muted">({all.length})</span>
            <ChevronRight className="size-4" />
          </Link>
        }
      />
      <BrandCarousel brands={top} />
    </Section>
  );
}

// Borderless like the brand grid; the picture scales with the cell so it always fits.
const bodyTile =
  "group flex h-full w-full min-w-0 flex-col items-center gap-1.5 rounded-lg px-1 py-3 text-center transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus";

/** All body types; empty ones open a "nothing in stock" dialog instead of an empty search. */
export function BodiesSection() {
  const text = useSiteText();
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const bodies = useMemo(() => bodyOptions(cars, {}), [cars]);
  const [empty, setEmpty] = useState<NoStockItem | null>(null);
  return (
    <Section id="carrosseries" className="pt-0 lg:pt-0">
      <SectionHeader
        eyebrow={text("bodies.eyebrow", "Carrosseries")}
        title={text("bodies.title", "Par carrosserie")}
        description={text(
          "bodies.subtitle",
          "SUV, berline, citadine… trouvez le type de véhicule qui vous ressemble.",
        )}
      />
      {/* Phones: one swipeable row (snaps to each tile); grid from tablets up. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-5 sm:gap-x-2 sm:gap-y-1 sm:overflow-visible sm:px-0 lg:grid-cols-9">
        {bodies.map((body) => {
          const content = (
            <>
              <BodyIcon body={body.label} className="h-auto w-full max-w-28" />
              <span className="w-full truncate text-sm font-medium">{body.label}</span>
              <span className="tabular w-full truncate text-xs text-muted">
                {body.count ? plural(body.count) : text("bodies.none", "Aucun véhicule")}
              </span>
            </>
          );
          return (
            <li key={body.value} className="w-28 shrink-0 snap-start sm:w-auto">
              {body.count ? (
                <Link to="/recherche" search={{ carrosserie: body.value }} className={bodyTile}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmpty({ kind: "body", label: body.label })}
                  className={`${bodyTile} opacity-60 hover:opacity-100`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <NoStockModal item={empty} onClose={() => setEmpty(null)} />
    </Section>
  );
}
