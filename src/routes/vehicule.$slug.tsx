import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs, Button, Chip, Modal } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import {
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Cog,
  DoorOpen,
  Expand,
  Fuel,
  Gauge,
  Globe,
  MessageCircle,
  Phone,
  Settings2,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "@/components/icons";
import { resolveContent, telHref, whatsappHref } from "@/features/content/definition";
import { relatedCars } from "@/features/catalog/search";
import { brandInfo } from "@/features/catalog/brands";
import { usePhones, useSiteCollection, useSiteText } from "@/lib/site-content";
import {
  carImage,
  carTitle,
  COUNTRY_LABELS,
  formatKm,
  formatPrice,
  GEARBOX_LABELS,
  label,
  salePrice,
  type Car,
} from "@/lib/cars";
import {
  publicCarQuery,
  publicCarsQuery,
  publicConfigQuery,
  siteContentQuery,
} from "@/lib/queries";
import { absoluteUrl, seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { CarCard, CarGrid } from "@/components/aks/CarCard";
import { BrandLogo } from "@/components/aks/BrandLogo";
import { BodyIcon } from "@/components/aks/BodyIcon";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { Price } from "@/components/aks/Price";
import { recordCarView } from "@/lib/data";

export const Route = createFileRoute("/vehicule/$slug")({
  loader: async ({ params, context }) => {
    const [car, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarQuery(params.slug)),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
      context.queryClient.ensureQueryData(publicCarsQuery),
    ]);
    if (!car) throw notFound();
    return { car, content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const siteName = resolveContent(content, "seo.site_name");
    const origin = loaderData?.origin;
    const car = loaderData?.car;
    if (!car) return { meta: [{ title: `Véhicule — ${siteName}` }] };
    const path = `/vehicule/${car.slug}`;
    // Sold: kept reachable for old links, but out of search engines.
    if (car.sold)
      return seo({
        title: `${carTitle(car)} ${car.year} — Vendu — ${siteName}`,
        description: `Ce ${carTitle(car)} a été vendu. Découvrez les véhicules disponibles chez ${siteName} à Sfax.`,
        siteName,
        origin,
        path,
        image: carImage(car),
        noindex: true,
      });
    const price = car.price_on_request ? "Prix sur demande" : formatPrice(salePrice(car));
    const brand = brandInfo(car.brand);
    return seo({
      // "Peugeot 208 2021 occasion à Sfax — 45 000 DT | AKS": what people type, then the price.
      title: `${carTitle(car)} ${car.year} ${car.state.toLowerCase()} à Sfax${car.price_on_request ? "" : ` — ${formatPrice(salePrice(car))}`} | AKS`,
      ogType: "product",
      description: `${carTitle(car)} ${car.year}, ${formatKm(car.km_value)}, ${car.fuel}, ${label(GEARBOX_LABELS, car.gearbox)} — ${price} chez ${siteName} à Sfax.`,
      siteName,
      origin,
      path,
      image: carImage(car),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Car",
          name: carTitle(car),
          brand: { "@type": "Brand", name: brand.name },
          model: car.model || car.name,
          vehicleModelDate: String(car.year),
          bodyType: car.body,
          fuelType: car.fuel,
          vehicleTransmission: label(GEARBOX_LABELS, car.gearbox),
          ...(car.doors ? { numberOfDoors: car.doors } : {}),
          ...(car.seats ? { seatingCapacity: car.seats } : {}),
          itemCondition:
            car.state === "Neuf"
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: car.km_value,
            unitCode: "KMT",
          },
          image: car.images
            .filter((src) => !src.startsWith("data:"))
            .map((src) => absoluteUrl(origin, src)),
          description: car.description,
          url: absoluteUrl(origin, path),
          ...(car.price_on_request
            ? {}
            : {
                offers: {
                  "@type": "Offer",
                  url: absoluteUrl(origin, path),
                  price: salePrice(car),
                  priceCurrency: "TND",
                  availability: "https://schema.org/InStock",
                  itemCondition:
                    car.state === "Neuf"
                      ? "https://schema.org/NewCondition"
                      : "https://schema.org/UsedCondition",
                  areaServed: { "@type": "City", name: "Sfax" },
                  seller: {
                    "@type": "AutoDealer",
                    "@id": absoluteUrl(origin, "/#dealer"),
                    name: siteName,
                    url: absoluteUrl(origin, "/"),
                    address: {
                      "@type": "PostalAddress",
                      streetAddress: "Route Sidi Mansour, km 5",
                      addressLocality: "Sfax",
                      postalCode: "3000",
                      addressCountry: "TN",
                    },
                  },
                },
              }),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl(origin, "/") },
            {
              "@type": "ListItem",
              position: 2,
              name: brand.name,
              item: absoluteUrl(origin, `/marques/${brand.slug}`),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: carTitle(car),
              item: absoluteUrl(origin, path),
            },
          ],
        },
      ],
    });
  },
  component: VehiculePage,
});

/** Horizontal swipe (touch) → previous/next photo. */
function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (event: React.TouchEvent) => {
      start.current = event.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const end = event.changedTouches[0]?.clientX;
      if (start.current !== null && end !== undefined && Math.abs(end - start.current) > 40)
        onSwipe(end < start.current ? 1 : -1);
      start.current = null;
    },
  };
}

const roundControl =
  "grid place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white";

/** Thumbnails under the main photo; the last one shows how many more there are. */
const THUMBS = 5;

function Gallery({ car }: { car: Car }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const count = Math.max(1, car.images.length);
  const step = (by: number) => setActive((i) => (i + by + count) % count);
  const swipe = useSwipe(step);
  const title = carTitle(car);

  // Arrow keys in the full-screen viewer.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-surface-secondary" {...swipe}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Afficher les photos en plein écran"
          className="block w-full cursor-zoom-in"
        >
          <img
            key={active}
            src={carImage(car, active)}
            alt={`${title} — photo ${active + 1} sur ${count}`}
            width={1600}
            height={1200}
            fetchPriority={active === 0 ? "high" : "auto"}
            className="aspect-[4/3] w-full object-cover animate-in fade-in-0 duration-300 motion-reduce:animate-none"
          />
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => step(-1)}
              className={cn(
                roundControl,
                "absolute left-2 top-1/2 size-9 -translate-y-1/2 sm:left-3 sm:size-11",
              )}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => step(1)}
              className={cn(
                roundControl,
                "absolute right-2 top-1/2 size-9 -translate-y-1/2 sm:right-3 sm:size-11",
              )}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between sm:inset-x-3 sm:bottom-3">
          <span className="tabular rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
            {active + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              roundControl,
              "pointer-events-auto size-9 sm:h-9 sm:w-auto sm:gap-2 sm:px-3.5 sm:text-sm sm:font-medium sm:grid-flow-col",
            )}
          >
            <Expand className="size-4" />
            <span className="sr-only sm:not-sr-only">Plein écran</span>
          </button>
        </div>
      </div>

      {/* First 4 photos, then the 5th with "+N" over it: opens the full gallery there. */}
      {car.images.length > 1 && (
        <ul className="mt-2 grid grid-cols-5 gap-1.5 sm:mt-3 sm:gap-2">
          {car.images.slice(0, THUMBS).map((src, i) => {
            const more = i === THUMBS - 1 ? car.images.length - THUMBS : 0;
            const current = i === active || (more > 0 && active >= i);
            return (
              <li key={`${i}-${src.slice(-24)}`}>
                <button
                  type="button"
                  aria-label={
                    more > 0 ? `Voir les ${car.images.length} photos` : `Afficher la photo ${i + 1}`
                  }
                  aria-current={current}
                  onClick={() => {
                    setActive(i);
                    if (more > 0) setOpen(true);
                  }}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-md border-2 transition focus-visible:outline-2 focus-visible:outline-focus",
                    current ? "border-accent" : "border-transparent opacity-80 hover:opacity-100",
                  )}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {more > 0 && (
                    // The photo stays fully visible; a small badge says how many more.
                    <span className="absolute bottom-1 end-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-foreground shadow-sm sm:bottom-1.5 sm:end-1.5 sm:px-2 sm:py-1 sm:text-xs">
                      +{more}
                      <span className="sr-only"> autres photos</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Full-screen viewer: whole viewport, photo fitted, arrows, thumbnails, keys and swipe. */}
      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop className="bg-black">
          <Modal.Container className="fixed inset-0 m-0 h-dvh w-screen max-w-none p-0">
            <Modal.Dialog
              aria-label={`Galerie photos — ${title}`}
              className="flex h-dvh w-screen max-w-none flex-col rounded-none bg-black p-0 text-white shadow-none"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
                <span className="tabular text-sm text-white/70">
                  {active + 1} / {count}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className={cn(roundControl, "size-10")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="relative min-h-0 flex-1" {...swipe}>
                <img
                  key={active}
                  src={carImage(car, active)}
                  alt={`${title} — photo ${active + 1} sur ${count}`}
                  className="absolute inset-0 size-full object-contain animate-in fade-in-0 duration-300 motion-reduce:animate-none"
                />
                {count > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Photo précédente"
                      onClick={() => step(-1)}
                      className={cn(
                        roundControl,
                        "absolute left-3 top-1/2 size-11 -translate-y-1/2 sm:left-6 sm:size-12",
                      )}
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      type="button"
                      aria-label="Photo suivante"
                      onClick={() => step(1)}
                      className={cn(
                        roundControl,
                        "absolute right-3 top-1/2 size-11 -translate-y-1/2 sm:right-6 sm:size-12",
                      )}
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </>
                )}
              </div>

              {count > 1 && (
                <ul className="flex gap-2 overflow-x-auto px-4 py-3">
                  {car.images.map((src, i) => (
                    <li
                      key={`${i}-${src.slice(-24)}`}
                      // Centred when it fits, scrollable from the first photo when not.
                      className="shrink-0 first:ms-auto last:me-auto"
                      ref={(el) => {
                        if (el && i === active)
                          el.scrollIntoView({ block: "nearest", inline: "center" });
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Afficher la photo ${i + 1}`}
                        aria-current={i === active}
                        onClick={() => setActive(i)}
                        className={cn(
                          "block overflow-hidden rounded border-2",
                          i === active
                            ? "border-white"
                            : "border-transparent opacity-60 hover:opacity-100",
                        )}
                      >
                        <img src={src} alt="" className="h-12 w-16 object-cover sm:h-14 sm:w-20" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

/** Counts one view per vehicle and browser session (dashboard "most viewed"). */
function useRecordView(slug: string | null) {
  useEffect(() => {
    if (!slug) return;
    const key = `aks:vu:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode without storage: count anyway.
    }
    void recordCarView({ data: { slug } }).catch(() => undefined);
  }, [slug]);
}

/** Page of a sold vehicle, reached from an old or external link. */
function SoldPage({ car, related }: { car: Car; related: Car[] }) {
  const text = useSiteText();
  const brand = brandInfo(car.brand);
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-16 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item href={`/marques/${brand.slug}`}>{brand.name}</Breadcrumbs.Item>
          <Breadcrumbs.Item>{car.name}</Breadcrumbs.Item>
        </Breadcrumbs>

        <section
          aria-labelledby="sold-title"
          className="mt-6 grid overflow-hidden rounded-xl border border-border bg-surface md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <div className="relative bg-surface-secondary">
            <img
              src={carImage(car)}
              alt=""
              width={1600}
              height={1200}
              className="aspect-[4/3] size-full object-cover grayscale-[60%]"
            />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-md border-4 border-white bg-accent px-5 py-2 text-2xl font-extrabold uppercase tracking-[0.2em] text-accent-foreground shadow-xl sm:text-3xl">
              {text("vehicle.sold_stamp", "Vendu")}
            </span>
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <div className="flex items-center gap-2 text-sm text-muted">
              <BrandLogo brand={car.brand} wordmark={false} size={22} />
              {brand.name} · {car.year}
            </div>
            <h1 id="sold-title" className="text-2xl font-semibold leading-tight sm:text-3xl">
              {text("vehicle.sold_title", "Ce véhicule a trouvé preneur")}
            </h1>
            <p className="text-muted">
              <span className="font-medium text-foreground">{carTitle(car)}</span>{" "}
              {text(
                "vehicle.sold_text",
                "n’est plus disponible. Notre équipe peut vous trouver un modèle équivalent ou vous prévenir dès qu’un véhicule similaire arrive.",
              )}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/recherche" className={buttonVariants({ size: "lg" })}>
                {text("vehicle.sold_cta", "Voir les véhicules disponibles")}
              </Link>
              <Link
                to="/contact"
                search={{ vehicule: car.slug }}
                className={buttonVariants({ size: "lg", variant: "secondary" })}
              >
                <MessageCircle className="size-4" />
                {text("vehicle.sold_contact", "Chercher un modèle similaire")}
              </Link>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 text-lg font-semibold">
              {text("vehicle.related", "Ces véhicules pourraient vous intéresser")}
            </h2>
            <CarGrid>
              {related.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </CarGrid>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function VehiculePage() {
  const text = useSiteText();
  const benefits = useSiteCollection("vehicle.items");
  const { primary, whatsapp } = usePhones();
  const { slug } = Route.useParams();
  const { data: car } = useSuspenseQuery(publicCarQuery(slug));
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  useRecordView(car && !car.sold ? car.slug : null);
  if (!car) return null;

  const brand = brandInfo(car.brand);
  const similar = relatedCars(car, cars, 3);
  if (car.sold) return <SoldPage car={car} related={similar} />;

  // Body type uses its silhouette instead of a generic icon.
  const specs: [string, string | number | null | undefined, LucideIcon | "body"][] = [
    [text("vehicle.text_1", "Année"), car.year, Calendar],
    [text("vehicle.text_2", "Kilométrage"), formatKm(car.km_value), Gauge],
    [text("vehicle.text_3", "Carburant"), car.fuel, Fuel],
    [text("vehicle.text_4", "Boîte"), label(GEARBOX_LABELS, car.gearbox), Settings2],
    [text("vehicle.text_5", "Carrosserie"), car.body, "body"],
    ["Transmission", car.transmission, Cog],
    ["Puissance fiscale", car.fiscal_power ? `${car.fiscal_power} CV` : null, Zap],
    ["Portes", car.doors, DoorOpen],
    ["Places", car.seats, Users],
    [text("vehicle.text_6", "Origine"), label(COUNTRY_LABELS, car.country), Globe],
    ["État", car.state, BadgeCheck],
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-16 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item href={`/marques/${brand.slug}`}>{brand.name}</Breadcrumbs.Item>
          <Breadcrumbs.Item>{car.name}</Breadcrumbs.Item>
        </Breadcrumbs>

        {/* Mobile order: photos, price card, details. Desktop: card in a sticky right column. */}
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-8 lg:gap-y-0">
          <div className="min-w-0">
            <Gallery key={car.slug} car={car} />
          </div>

          <aside className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-fit">
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/marques/$brand"
                  params={{ brand: brand.slug }}
                  className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
                >
                  <BrandLogo brand={car.brand} wordmark={false} size={24} />
                  {brand.name}
                </Link>
                <Chip size="sm" color={car.state === "Neuf" ? "accent" : "default"}>
                  {car.state}
                </Chip>
              </div>
              <h1 className="mt-3 text-2xl font-semibold leading-tight">{car.name}</h1>
              <p className="tabular mt-1 text-sm text-muted">
                {car.year} · {formatKm(car.km_value)} · {car.fuel}
              </p>
              {car.price_on_request ? (
                <div className="mt-4">
                  <p className="text-xl font-semibold">
                    {text("vehicle.price_hidden", "Prix sur demande")}
                  </p>
                  <Link
                    to="/contact"
                    search={{ vehicule: car.slug, objet: "prix" }}
                    className={buttonVariants({ size: "lg", fullWidth: true, className: "mt-3" })}
                  >
                    <MessageCircle className="size-4" />
                    {text("vehicle.price_hidden_cta", "Contactez-nous pour le prix")}
                  </Link>
                </div>
              ) : (
                <Price
                  car={car}
                  size="lg"
                  currency={text("vehicle.text_9", "DT")}
                  className="mt-4"
                />
              )}
              <p className="mt-1 text-sm text-muted">
                {text("vehicle.text_8", "Disponible dans notre showroom à Sfax")}
              </p>

              <div className="mt-5 grid gap-2">
                <Link
                  to="/contact"
                  search={{ vehicule: car.slug, objet: "essai" }}
                  className={buttonVariants({
                    size: "lg",
                    fullWidth: true,
                    // With a hidden price, "Contactez-nous pour le prix" is the main action.
                    variant: car.price_on_request ? "secondary" : "primary",
                  })}
                >
                  {text("vehicle.text_16", "Réserver un essai")}
                </Link>
                {!car.price_on_request && (
                  <Link
                    to="/contact"
                    search={{ vehicule: car.slug, objet: "offre" }}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "lg",
                      fullWidth: true,
                    })}
                  >
                    {text("vehicle.text_17", "Demander une offre")}
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={telHref(primary?.number ?? "")}
                    className={buttonVariants({ variant: "tertiary", fullWidth: true })}
                  >
                    <Phone className="size-4" />
                    Appeler
                  </a>
                  <a
                    href={whatsappHref((whatsapp ?? primary)?.number ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "tertiary", fullWidth: true })}
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted">
                {text(
                  "vehicle.text_15",
                  "Échangez avec notre équipe pour vérifier sa disponibilité ou organiser un essai.",
                )}
              </p>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="lg:mt-10">
              <h2 className="text-lg font-semibold">
                {text("vehicle.text_12", "Caractéristiques")}
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 sm:gap-x-6 sm:p-5">
                {specs
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .map(([name, value, Icon]) => (
                    <div key={name} className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-secondary text-accent sm:size-9">
                        {Icon === "body" ? (
                          <BodyIcon body={car.body} active className="h-auto w-6" />
                        ) : (
                          <Icon className="size-4 sm:size-[18px]" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted">{name}</dt>
                        <dd className="tabular mt-0.5 break-words text-sm font-medium sm:text-base">
                          {value}
                        </dd>
                      </div>
                    </div>
                  ))}
              </dl>
            </section>

            {car.description && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">
                  {text("vehicle.text_11", "Description du véhicule")}
                </h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-muted">{car.description}</p>
                <p className="mt-3 leading-7 text-muted">
                  {text(
                    "vehicle.textarea_1",
                    "Le véhicule est visible sur rendez-vous chez Auto Kontor Sfax. Notre équipe peut vous accompagner pour l'essai, la reprise de votre ancien véhicule et les solutions de financement.",
                  )}
                </p>
              </section>
            )}

            {benefits.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">
                  {text("vehicle.text_13", "Services inclus")}
                </h2>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {benefits.map(({ text: item }) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 text-lg font-semibold">
              {text("vehicle.related", "Ces véhicules pourraient vous intéresser")}
            </h2>
            <CarGrid>
              {similar.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </CarGrid>
          </section>
        )}
      </main>
      <SellCarBanner className="pb-16" />
      <SiteFooter />
    </div>
  );
}
