import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@heroui/styles";
import { MessageCircle, Phone, RotateCcw, Search, Ship, Sparkles, Timer } from "lucide-react";
import { telHref, whatsappHref } from "@/features/content/definition";
import type { Car } from "@/lib/cars";
import { usePhones, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { BodyIcon } from "./BodyIcon";
import { CarCard, CarGrid } from "./CarCard";

/**
 * Empty results, as a sales opportunity: the team can find or import the car.
 * Two cases: filters too narrow (reset + suggestions) or no stock at all
 * (new arrivals coming).
 */
export function NoResults({
  filtersActive,
  onReset,
  suggestions = [],
  className,
}: {
  filtersActive: boolean;
  onReset?: () => void;
  /** Other vehicles to show below (e.g. the latest arrivals). */
  suggestions?: Car[];
  className?: string;
}) {
  const text = useSiteText();
  const { primary, whatsapp } = usePhones();
  const empty = !filtersActive;
  const perks = [
    { Icon: Search, label: "Recherche personnalisée" },
    { Icon: Ship, label: "Importation sur demande" },
    { Icon: Timer, label: "Réponse rapide" },
  ];

  return (
    <div className={cn("grid gap-12", className)}>
      <section
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-xl justify-items-center">
          {/* Car silhouette with a search badge. */}
          <div className="relative grid size-28 place-items-center rounded-full bg-background ring-1 ring-border">
            <BodyIcon body="SUV" className="h-auto w-20" />
            <span className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg ring-4 ring-surface">
              {empty ? (
                <Sparkles className="size-5" aria-hidden />
              ) : (
                <Search className="size-5" aria-hidden />
              )}
            </span>
          </div>

          <h2 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
            {empty
              ? text("search.empty_stock_title", "De nouveaux véhicules arrivent bientôt")
              : text("search.text_5", "Aucun véhicule ne correspond à vos critères")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {empty
              ? text(
                  "search.empty_stock_text",
                  "Notre showroom se renouvelle. Dites-nous ce que vous cherchez : nous vous prévenons dès son arrivée, ou nous l’importons pour vous.",
                )
              : text(
                  "search.empty_text",
                  "Élargissez votre recherche, ou confiez-nous votre projet : notre équipe trouve ou importe le modèle exact que vous voulez.",
                )}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!empty && onReset && (
              <button type="button" onClick={onReset} className={buttonVariants({ size: "lg" })}>
                <RotateCcw className="size-4" aria-hidden />
                Réinitialiser les filtres
              </button>
            )}
            <Link
              to="/contact"
              className={buttonVariants({ size: "lg", variant: empty ? "primary" : "secondary" })}
            >
              Décrire le véhicule recherché
            </Link>
            {whatsapp && (
              <a
                href={whatsappHref(whatsapp.number)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "lg", variant: "tertiary" })}
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            )}
            {primary && (
              <a
                href={telHref(primary.number)}
                className={buttonVariants({ size: "lg", variant: "tertiary" })}
              >
                <Phone className="size-4" aria-hidden />
                Appeler
              </a>
            )}
          </div>

          <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-separator pt-6 text-sm text-muted">
            {perks.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-accent" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby="no-results-suggestions">
          <h2 id="no-results-suggestions" className="mb-5 text-xl font-semibold tracking-tight">
            {text("search.suggestions", "Ces véhicules pourraient vous intéresser")}
          </h2>
          <CarGrid>
            {suggestions.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </CarGrid>
        </section>
      )}
    </div>
  );
}
