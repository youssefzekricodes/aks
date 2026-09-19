import { resolveContent } from "@/features/content/definition";
import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Fuel,
  Gauge,
  Globe2,
  Images,
  MessageCircle,
  Settings2,
  Tag,
  X,
} from "lucide-react";
import { carImage, type Car } from "@/lib/cars";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { ContactFooter } from "@/components/aks/ContactFooter";

export const Route = createFileRoute("/vehicule/$slug")({
  loader: async ({ params, context }) => {
    const [allCars, content] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
    ]);
    const car = (allCars as Car[]).find((c) => c.slug === params.slug);
    if (!car) throw notFound();
    return { car, content };
  },
  head: ({ loaderData }) => {
    const siteName = resolveContent(loaderData?.content ?? {}, "seo.site_name");
    const title = loaderData
      ? `${loaderData.car.brand} ${loaderData.car.name} — ${siteName}`
      : `Véhicule — ${siteName}`;
    const description = loaderData
      ? `${loaderData.car.brand} ${loaderData.car.name} ${loaderData.car.year}, ${loaderData.car.km}, ${loaderData.car.fuel} — ${loaderData.car.price.toLocaleString("fr-FR")} DT chez ${siteName}.`
      : `Détails du véhicule chez ${siteName}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: VehiculePage,
});

function VehiculePage() {
  const benefits = useSiteCollection("vehicle.items");
  const text = useSiteText();

  const { car } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const sideImages = car.images.slice(1, 4);
  const hasMoreImages = car.images.length > 4;

  const specs = [
    { icon: Calendar, label: text("vehicle.text_1", "Année"), value: String(car.year) },
    { icon: Gauge, label: text("vehicle.text_2", "Kilométrage"), value: car.km },
    { icon: Fuel, label: text("vehicle.text_3", "Carburant"), value: car.fuel },
    { icon: Settings2, label: text("vehicle.text_4", "Boîte"), value: car.gearbox },
    { icon: Tag, label: text("vehicle.text_5", "Carrosserie"), value: car.body },
    { icon: Globe2, label: text("vehicle.text_6", "Origine"), value: car.country },
  ];
  const prefillContactMessage = (message: string) => {
    window.dispatchEvent(new CustomEvent("prefill-contact-message", { detail: { message } }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {text("vehicle.text_7", "Retour à l'inventaire")}
        </Link>

        <section className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(260px,1fr)]">
          <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-border bg-card sm:min-h-[520px] lg:min-h-[640px]">
            <img
              src={carImage(car, activeImage)}
              alt={`${car.brand} ${car.name} — vue ${activeImage + 1}`}
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-lg">
              <Images className="h-4 w-4 text-primary" />
              {activeImage + 1} / {car.images.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:grid-rows-3">
            {sideImages.map((image: string, index: number) => {
              const imageIndex = index + 1;
              const isMoreTile = hasMoreImages && index === sideImages.length - 1;
              return (
                <button
                  key={image}
                  type="button"
                  aria-label={
                    isMoreTile
                      ? `Afficher les ${car.images.length - 3} photos supplémentaires`
                      : `Afficher la vue ${imageIndex + 1}`
                  }
                  aria-pressed={activeImage === imageIndex}
                  onClick={() => {
                    if (isMoreTile) {
                      setActiveImage(imageIndex);
                      setIsGalleryOpen(true);
                    } else {
                      setActiveImage(imageIndex);
                    }
                  }}
                  className={`relative min-h-28 overflow-hidden rounded-lg border bg-card transition-colors sm:min-h-40 lg:min-h-0 ${
                    activeImage === imageIndex
                      ? "border-primary"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${car.brand} ${car.name} — miniature ${imageIndex + 1}`}
                    width={512}
                    height={1024}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {isMoreTile && (
                    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-primary/75 text-xl font-bold text-primary-foreground backdrop-blur-[1px]">
                      <Images className="h-6 w-6" />+{car.images.length - 3}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {isGalleryOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Galerie photos de ${car.brand} ${car.name}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={() => setIsGalleryOpen(false)}
          >
            <div
              className="relative flex h-full w-full max-w-6xl flex-col justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="absolute right-0 top-0 z-10 rounded-full bg-background/90 p-3 text-foreground transition-colors hover:bg-background"
                aria-label="Fermer la galerie"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={carImage(car, activeImage)}
                alt={`${car.brand} ${car.name} — vue ${activeImage + 1}`}
                className="mx-auto max-h-[78vh] max-w-full rounded-lg object-contain"
              />
              <div className="mt-4 flex items-center justify-center gap-4 text-sm font-semibold text-white">
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage(
                      (current) => (current - 1 + car.images.length) % car.images.length,
                    )
                  }
                  className="rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span>
                  {activeImage + 1} / {car.images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveImage((current) => (current + 1) % car.images.length)}
                  className="rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="border-b border-border py-8 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <span className="inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
              {car.state}
            </span>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
              {car.brand} <span className="text-primary">{car.name}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {text("vehicle.text_8", "Disponible dans notre showroom à Sfax")}
            </p>
          </div>
          <p className="mt-5 shrink-0 font-display text-3xl font-bold text-primary sm:mt-0 sm:text-4xl">
            {car.price.toLocaleString("fr-FR")} {text("vehicle.text_9", "DT")}
          </p>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                {text("vehicle.text_10", "Présentation")}
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {text("vehicle.text_11", "Description du véhicule")}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
                {car.description}
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                {text(
                  "vehicle.textarea_1",
                  "Le véhicule est visible sur rendez-vous chez Auto Kontor Sfax. Notre équipe peut vous accompagner pour l'essai, la reprise de votre ancien véhicule et les solutions de financement.",
                )}
              </p>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-bold">{text("vehicle.text_12", "Caractéristiques")}</h2>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                {specs.map((s) => (
                  <div key={s.label} className="bg-card p-5">
                    <s.icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-bold">{text("vehicle.text_13", "Services inclus")}</h2>
              <div className="mt-5 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                {benefits.map(({ text: item }) => (
                  <p key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-28">
            <MessageCircle className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">
              {text("vehicle.text_14", "Ce véhicule vous intéresse ?")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {text(
                "vehicle.text_15",
                "Échangez avec notre équipe pour vérifier sa disponibilité ou organiser un essai.",
              )}
            </p>
            <div className="mt-7 grid gap-4">
              <a
                href={text("vehicle.link_1", "#contact")}
                onClick={() =>
                  prefillContactMessage(
                    `Bonjour, je souhaite réserver un essai pour la ${car.brand} ${car.name} (${car.year}). Pouvez-vous me communiquer vos disponibilités ?`,
                  )
                }
                className="btn-3d btn-3d-primary px-7 py-4 text-base"
              >
                {text("vehicle.text_16", "Réserver un essai")}
              </a>
              <a
                href={text("vehicle.link_1", "#contact")}
                onClick={() =>
                  prefillContactMessage(
                    `Bonjour, je souhaite recevoir une offre pour la ${car.brand} ${car.name} (${car.year}). Merci de me recontacter.`,
                  )
                }
                className="btn-3d btn-3d-steel px-7 py-4 text-base"
              >
                {text("vehicle.text_17", "Demander une offre")}
              </a>
            </div>
          </aside>
        </div>

        <SellCarBanner className="mt-16 px-0" />
      </main>
      <ContactFooter />
    </div>
  );
}
