import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Fuel,
  Gauge,
  Globe2,
  Images,
  MessageCircle,
  Settings2,
  Tag,
} from "lucide-react";
import { carImage, type Car } from "@/lib/cars";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { ContactFooter } from "@/components/aks/ContactFooter";

export const Route = createFileRoute("/vehicule/$slug")({
  loader: async ({ params, context }) => {
    const [allCars] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
    ]);
    const car = (allCars as Car[]).find((c) => c.slug === params.slug);
    if (!car) throw notFound();
    return { car };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.car.brand} ${loaderData.car.name} — Auto Kontor Sfax`
      : "Véhicule — Auto Kontor Sfax";
    const description = loaderData
      ? `${loaderData.car.brand} ${loaderData.car.name} ${loaderData.car.year}, ${loaderData.car.km}, ${loaderData.car.fuel} — ${loaderData.car.price.toLocaleString("fr-FR")} DT chez Auto Kontor Sfax.`
      : "Détails du véhicule chez Auto Kontor Sfax.";
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
  const { car } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(0);

  const specs = [
    { icon: Calendar, label: "Année", value: String(car.year) },
    { icon: Gauge, label: "Kilométrage", value: car.km },
    { icon: Fuel, label: "Carburant", value: car.fuel },
    { icon: Settings2, label: "Boîte", value: car.gearbox },
    { icon: Tag, label: "Carrosserie", value: car.body },
    { icon: Globe2, label: "Origine", value: car.country },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'inventaire
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

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {car.images.slice(1).map((image: string, index: number) => {
              const imageIndex = index + 1;
              return (
                <button
                  key={image}
                  type="button"
                  aria-label={`Afficher la vue ${imageIndex + 1}`}
                  aria-pressed={activeImage === imageIndex}
                  onClick={() => setActiveImage(imageIndex)}
                  className={`relative min-h-28 overflow-hidden rounded-lg border bg-card transition-colors sm:min-h-40 lg:min-h-0 ${
                    activeImage === imageIndex ? "border-primary" : "border-border hover:border-primary/60"
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
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-border py-8 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <span className="inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
              {car.state}
            </span>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
              {car.brand} <span className="text-primary">{car.name}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Disponible dans notre showroom à Sfax</p>
          </div>
          <p className="mt-5 shrink-0 font-display text-3xl font-bold text-primary sm:mt-0 sm:text-4xl">
            {car.price.toLocaleString("fr-FR")} DT
          </p>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Présentation</p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Description du véhicule</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">{car.description}</p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                Le véhicule est visible sur rendez-vous chez Auto Kontor Sfax. Notre équipe peut vous accompagner pour l'essai, la reprise de votre ancien véhicule et les solutions de financement.
              </p>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-bold">Caractéristiques</h2>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
                {specs.map((s) => (
                  <div key={s.label} className="bg-card p-5">
                    <s.icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className="mt-1 font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-2xl font-bold">Services inclus</h2>
              <div className="mt-5 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                {["Contrôle qualité avant livraison", "Historique et dossier du véhicule", "Solutions de financement", "Reprise de votre ancien véhicule"].map((item) => (
                  <p key={item} className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</p>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-28">
            <MessageCircle className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Ce véhicule vous intéresse ?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Échangez avec notre équipe pour vérifier sa disponibilité ou organiser un essai.</p>
            <div className="mt-7 grid gap-4">
              <a href="#contact" className="btn-3d btn-3d-primary px-7 py-4 text-base">Réserver un essai</a>
              <a href="#contact" className="btn-3d btn-3d-steel px-7 py-4 text-base">Demander une offre</a>
            </div>
          </aside>
        </div>

        <SellCarBanner className="mt-16 px-0" />
      </main>
      <ContactFooter />
    </div>
  );
}
