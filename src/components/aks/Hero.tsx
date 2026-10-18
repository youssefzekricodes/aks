import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { ArrowRight, BadgeCheck, Clock, Handshake, Phone, Search, ShieldCheck } from "lucide-react";
import { publicCarsQuery } from "@/lib/queries";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { facetOptions, type SearchFilters } from "@/features/catalog/search";
import { BrandLogo } from "./BrandLogo";
import { FilterSelect } from "./FilterSelect";

export function Hero() {
  const text = useSiteText();
  const navigate = useNavigate();
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const budgets = useSiteCollection("inventory.budgets");
  const hours = useSiteCollection("showroom.items");
  const [marque, setMarque] = useState<string>();
  const [modele, setModele] = useState<string>();
  const [budget, setBudget] = useState<string>();

  const filters: SearchFilters = { marque };
  const brands = useMemo(() => facetOptions(cars, {}, "marque"), [cars]);
  const models = facetOptions(cars, filters, "modele");
  const openingHours = hours[0] ? `${hours[0].day} · ${hours[0].time}` : null;
  const trust = [
    { Icon: BadgeCheck, label: text("hero.trust_1", "Véhicules inspectés et garantis") },
    { Icon: Handshake, label: text("hero.trust_2", "Reprise de votre véhicule") },
    { Icon: ShieldCheck, label: text("hero.trust_3", "Financement sur mesure") },
  ];

  return (
    <section id="top" className="relative isolate overflow-hidden bg-[oklch(0.17_0.004_286)]">
      <img
        src={text("hero.image_1", "/images/aks-storefront.jpg")}
        alt={text(
          "hero.text_24",
          "Façade du showroom Auto Kontor Sfax de nuit, enseigne AKS éclairée et véhicules premium en vitrine",
        )}
        width={1600}
        height={900}
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full object-cover object-[70%_center] opacity-70"
      />
      {/* Left-to-right shade for the text, bottom shade so the search card sits on a calm base. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/10"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/60 to-transparent"
      />

      <div className="container-page flex min-h-[34rem] flex-col justify-center gap-8 py-12 sm:py-16 lg:min-h-[38rem]">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white ring-1 ring-white/15 backdrop-blur">
              <span className="size-1.5 rounded-full bg-[oklch(0.75_0.17_150)]" aria-hidden />
              {cars.length} véhicule{cars.length > 1 ? "s" : ""} en stock
            </span>
            {openingHours && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {openingHours}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem]">
            {text("hero.text_26", "Le showroom automobile")}{" "}
            <span className="text-[oklch(0.7_0.19_27)]">
              {text("hero.text_27", "premium de Sfax")}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
            {text(
              "hero.textarea_1",
              "Véhicules neufs et d'occasion sélectionnés avec exigence. Financement, reprise et garantie — accompagnés par une équipe qui connaît chaque voiture qu'elle vend.",
            )}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/recherche" className={buttonVariants({ size: "lg" })}>
              {text("hero.cta_stock", "Voir le stock")}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={text("identity.phone_link", "tel:+21652144869")}
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "border-white/30 text-white hover:bg-white/10",
              })}
            >
              <Phone className="size-4" />
              {text("identity.phone", "+216 52 144 869")}
            </a>
          </div>
        </div>

        <form
          role="search"
          aria-label="Recherche rapide"
          onSubmit={(event) => {
            event.preventDefault();
            const max = budgets.find((b) => String(b.max) === budget)?.max;
            navigate({
              to: "/recherche",
              search: { marque, modele, ...(max ? { prix_max: max } : {}) },
            });
          }}
          className="grid w-full max-w-5xl gap-3 rounded-xl bg-surface p-4 text-foreground shadow-2xl sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
        >
          <FilterSelect
            label={text("hero.text_28", "Marque")}
            allLabel={text("hero.text_18", "Toutes marques")}
            value={marque}
            onChange={(value) => {
              setMarque(value);
              setModele(undefined);
            }}
            options={brands.map((b) => ({
              ...b,
              icon: <BrandLogo brand={b.label} wordmark={false} className="h-5 shrink-0" />,
            }))}
            showCounts
          />
          <FilterSelect
            label={text("hero.model_label", "Modèle")}
            allLabel={text("hero.all_models", "Tous modèles")}
            value={modele}
            onChange={setModele}
            options={models}
            isDisabled={!marque}
            showCounts
          />
          <FilterSelect
            className="sm:col-span-2 lg:col-span-1"
            label={text("hero.budget_label", "Budget maximum")}
            allLabel={text("hero.any_budget", "Tous budgets")}
            value={budget}
            onChange={setBudget}
            options={budgets.map((b) => ({ value: String(b.max), label: b.label }))}
          />
          <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
            <Search className="size-4" />
            {text("hero.text_29", "Rechercher")}
          </Button>
        </form>

        <ul className="grid gap-x-8 gap-y-2 text-sm text-white/85 sm:flex sm:flex-wrap">
          {trust.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-[oklch(0.7_0.19_27)]" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
