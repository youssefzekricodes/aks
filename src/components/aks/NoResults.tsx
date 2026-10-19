import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@heroui/styles";
import { telHref, whatsappHref } from "@/features/content/definition";
import type { Car } from "@/lib/cars";
import { usePhones, useSiteCollection, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { CarCard, CarGrid } from "./CarCard";

/**
 * Empty results: say it plainly, and give the real ways to reach the showroom.
 * Two cases: filters too narrow (reset + suggestions) or no stock at all.
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
  const hours = useSiteCollection("showroom.items");
  const empty = !filtersActive;

  return (
    <div className={cn("grid gap-12", className)}>
      <section
        aria-live="polite"
        className="grid overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <div className="p-6 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {empty
              ? text("search.empty_stock_title", "Notre stock se renouvelle")
              : text("search.text_5", "Rien ne correspond à cette recherche")}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            {empty
              ? text(
                  "search.empty_stock_text",
                  "Les véhicules partent vite et de nouveaux arrivent chaque semaine. Dites-nous ce que vous cherchez : on vous appelle dès qu’un modèle correspond, ou on le fait venir pour vous.",
                )
              : text(
                  "search.empty_text",
                  "Essayez avec moins de filtres, ou décrivez-nous la voiture que vous cherchez : on peut la trouver ou l’importer.",
                )}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {!empty && onReset && (
              <button type="button" onClick={onReset} className={buttonVariants()}>
                Retirer les filtres
              </button>
            )}
            <Link
              to="/contact"
              className={buttonVariants({ variant: empty ? "primary" : "secondary" })}
            >
              Décrire la voiture recherchée
            </Link>
          </div>
        </div>

        {/* Real contact details rather than generic promises. */}
        <dl className="grid content-center gap-5 border-t border-border bg-background p-6 text-sm sm:p-10 md:border-l md:border-t-0">
          {primary && (
            <div>
              <dt className="text-muted">Par téléphone</dt>
              <dd className="mt-1">
                <a
                  href={telHref(primary.number)}
                  className="tabular text-lg font-semibold text-foreground hover:text-accent"
                >
                  {primary.number}
                </a>
              </dd>
            </div>
          )}
          {whatsapp && (
            <div>
              <dt className="text-muted">Sur WhatsApp</dt>
              <dd className="mt-1">
                <a
                  href={whatsappHref(whatsapp.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
                >
                  Écrire au {whatsapp.number}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Au showroom</dt>
            <dd className="mt-1 text-foreground">
              {text("showroom.text_3", "Route Sidi Mansour, km 5, Sfax 3000, Tunisie")}
              {hours[0] && (
                <span className="block text-muted">
                  {hours.map(({ day, time }) => `${day} · ${time}`).join(" — ")}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby="no-results-suggestions">
          <h2 id="no-results-suggestions" className="mb-5 text-xl font-semibold tracking-tight">
            {text("search.suggestions", "D’autres véhicules disponibles")}
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
