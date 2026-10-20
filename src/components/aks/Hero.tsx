import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { ArrowRight, Phone, Search, Sparkles } from "@/components/icons";
import { publicCarsQuery } from "@/lib/queries";
import { useSiteText, usePhones } from "@/lib/site-content";
import { telHref } from "@/features/content/definition";
import { bodyOptions, facetOptions, type SearchFilters } from "@/features/catalog/search";
import { BrandLogo } from "./BrandLogo";
import { FilterSelect, MultiFilterSelect } from "./FilterSelect";

export function Hero() {
  const text = useSiteText();
  const navigate = useNavigate();
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const { primary } = usePhones();
  const mobileImage = text("hero.image_mobile", "");
  const intro = text(
    "hero.textarea_1",
    "Véhicules neufs et d'occasion sélectionnés avec exigence. Financement, reprise et garantie — accompagnés par une équipe qui connaît chaque voiture qu'elle vend.",
  );
  const [marques, setMarques] = useState<string[]>([]);
  const marque = marques.length ? marques.join(",") : undefined;
  const [modele, setModele] = useState<string>();
  const [carrosserie, setCarrosserie] = useState<string>();

  const filters: SearchFilters = { marque };
  const brands = useMemo(() => facetOptions(cars, {}, "marque"), [cars]);
  const models = facetOptions(cars, filters, "modele");
  // Type of car rather than budget: most cars show no price, a budget would hide them.
  const bodies = bodyOptions(cars, { marque }).filter((o) => o.count > 0);

  return (
    <>
      <section id="top" className="relative isolate overflow-hidden bg-[oklch(0.17_0.004_286)]">
        {/* Phones get their own (portrait) photo when one is set; otherwise the desktop one. */}
        <picture>
          {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
          <img
            src={text("hero.image_1", "/images/aks-storefront.jpg")}
            alt={text(
              "hero.text_24",
              "Façade du showroom Auto Kontor Sfax de nuit, enseigne AKS éclairée et véhicules premium en vitrine",
            )}
            width={1600}
            height={900}
            fetchPriority="high"
            className={`absolute inset-0 -z-10 size-full object-cover ${mobileImage ? "object-center md:object-[70%_center]" : "object-[70%_center]"}`}
          />
        </picture>
        {/* Shade only where the text sits: left on desktop, bottom on phones. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10 md:bg-gradient-to-r md:from-black/80 md:via-black/35 md:to-transparent"
        />

        <div className="container-page flex min-h-[min(78svh,40rem)] flex-col justify-end pb-20 pt-24 md:min-h-[min(82svh,46rem)] md:justify-center md:pb-28">
          <div className="max-w-3xl">
            <h1 className="text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {text("hero.text_26", "Voitures d’occasion et neuves")}{" "}
              <span className="text-[oklch(0.7_0.19_27)]">
                {text("hero.text_27", "à Sfax, chez AKS")}
              </span>
            </h1>
            {intro && (
              <p className="mt-4 line-clamp-3 max-w-xl text-base text-white/80 sm:text-lg">
                {intro}
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/recherche" className={buttonVariants({ size: "lg" })}>
                {text("hero.cta_stock", "Voir le stock")}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href={telHref(primary?.number ?? "")}
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "border-white/30 text-white backdrop-blur hover:bg-white/10",
                })}
              >
                <Phone className="size-4" />
                Appeler
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick search overlaps the bottom of the photo instead of covering it. */}
      <div className="container-page relative z-10 -mt-12 md:-mt-16">
        <form
          role="search"
          aria-label="Recherche rapide"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/recherche", search: { marque, modele, carrosserie } });
          }}
          className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
        >
          <MultiFilterSelect
            label={text("hero.text_28", "Marque")}
            allLabel={text("hero.text_18", "Toutes marques")}
            values={marques}
            onChange={(values) => {
              setMarques(values);
              setModele(undefined);
            }}
            options={brands.map((b) => ({
              ...b,
              // Same box for every logo (equal visual weight); brands without one keep the space.
              icon: (
                <span className="grid h-6 w-9 shrink-0 place-items-center" aria-hidden>
                  <BrandLogo brand={b.label} wordmark={false} size={20} />
                </span>
              ),
            }))}
            showCounts
          />
          <FilterSelect
            className="hidden sm:grid"
            label={text("hero.model_label", "Modèle")}
            allLabel={text("hero.all_models", "Tous modèles")}
            value={modele}
            onChange={setModele}
            options={models}
            isDisabled={marques.length !== 1}
            showCounts
          />
          <FilterSelect
            className="sm:col-span-2 lg:col-span-1"
            label="Type de voiture"
            allLabel="Tous les types"
            value={carrosserie}
            onChange={setCarrosserie}
            options={bodies}
            showCounts
          />
          <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
            <Search className="size-4" />
            {text("hero.text_29", "Rechercher")}
          </Button>
          {/* For visitors who do not know what to pick. */}
          <Link
            to="/trouver-ma-voiture"
            className="group flex items-center gap-3 rounded-xl bg-accent-soft/60 px-3 py-2.5 text-sm transition-colors hover:bg-accent-soft sm:col-span-2 lg:col-span-4"
          >
            <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <strong className="font-semibold">Vous ne savez pas quoi choisir ?</strong>{" "}
              <span className="text-muted">Trouvez votre voiture en quelques questions.</span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </form>
      </div>
    </>
  );
}
