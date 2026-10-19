import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { brandBySlug } from "@/features/catalog/brands";
import { filterCars } from "@/features/catalog/search";
import { homeFaq } from "@/features/seo/faq";
import { allLandings, POPULAR_BRANDS } from "@/features/seo/landings";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";
import { Eyebrow, Section, sectionTitle } from "./Section";

const chip =
  "inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent";

/**
 * "Voitures d'occasion à Sfax": a short text for visitors and search engines,
 * links to the popular searches and brands, and the FAQ (also sent to Google).
 */
export function HomeSeo() {
  const { data: content } = useSuspenseQuery(siteContentQuery);
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const faq = homeFaq(content);
  // Searches with vehicles first; all of them are useful entry points.
  const searches = allLandings()
    .map((landing) => ({ landing, count: filterCars(cars, landing.filters).length }))
    .filter(({ landing }) => !("etat" in landing.filters && landing.filters.etat === "neuf"))
    .slice(0, 14);
  const brands = POPULAR_BRANDS.map((slug) => brandBySlug(slug)).filter(
    (brand): brand is NonNullable<typeof brand> => Boolean(brand),
  );

  return (
    <Section id="voitures-occasion-sfax" className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <div>
        <Eyebrow>Voitures d’occasion à Sfax</Eyebrow>
        <h2 className={`mt-4 ${sectionTitle}`}>Votre voiture d’occasion à Sfax, chez AKS</h2>
        <div className="mt-4 grid gap-3 text-base leading-relaxed text-muted">
          <p>
            <strong className="font-semibold text-foreground">AKS – Auto Kontor Sfax</strong> est un
            showroom automobile à Sfax spécialisé dans la vente de voitures d’occasion et neuves.
            Berlines, SUV, citadines ou utilitaires : chaque véhicule est sélectionné, contrôlé et
            présenté avec son prix, son kilométrage et ses photos.
          </p>
          <p>
            Reprise de votre ancienne voiture, financement avec nos partenaires bancaires, garantie
            mécanique et importation du modèle exact que vous cherchez : notre équipe vous
            accompagne de l’essai à la livraison.
          </p>
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground">
          Recherches populaires
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {searches.map(({ landing, count }) => (
            <li key={landing.path}>
              <Link to="/recherche" search={landing.filters} className={chip}>
                {landing.h1.replace(" à Sfax", "")}
                {count > 0 && <span className="ms-1.5 tabular-nums text-muted">{count}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground">
          Marques recherchées
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link to="/marques/$brand" params={{ brand: brand.slug }} className={chip}>
                {brand.name} occasion
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Questions fréquentes</h2>
        <div className="mt-6 divide-y divide-separator rounded-2xl border border-border bg-surface">
          {faq.map(({ question, answer }) => (
            <details
              key={question}
              className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                <h3 className="text-base">{question}</h3>
                <ChevronDown
                  className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
