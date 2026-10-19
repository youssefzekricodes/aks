import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { brandBySlug } from "@/features/catalog/brands";
import { filterCars } from "@/features/catalog/search";
import { homeFaq } from "@/features/seo/faq";
import { allLandings, POPULAR_BRANDS } from "@/features/seo/landings";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";

const chip =
  "inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent";

/**
 * /voitures-occasion-sfax: what AKS sells, then every popular search and brand
 * page as links (entry points for visitors and search engines).
 */
export function SearchGuide() {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const searches = allLandings().map((landing) => ({
    landing,
    count: filterCars(cars, landing.filters).length,
  }));
  const brands = POPULAR_BRANDS.map((slug) => brandBySlug(slug)).filter(
    (brand): brand is NonNullable<typeof brand> => Boolean(brand),
  );

  return (
    <div className="grid gap-12">
      <div className="grid max-w-3xl gap-3 text-base leading-relaxed text-muted">
        <p>
          <strong className="font-semibold text-foreground">AKS – Auto Kontor Sfax</strong> est un
          showroom automobile à Sfax spécialisé dans la vente de voitures d’occasion et neuves.
          Berlines, SUV, citadines ou utilitaires : chaque véhicule est sélectionné, contrôlé et
          présenté avec son prix, son kilométrage et ses photos.
        </p>
        <p>
          Reprise de votre ancienne voiture, financement avec nos partenaires bancaires, garantie
          mécanique et importation du modèle exact que vous cherchez : notre équipe vous accompagne
          de l’essai à la livraison.
        </p>
      </div>

      <section aria-labelledby="guide-searches">
        <h2 id="guide-searches" className="text-xl font-semibold tracking-tight">
          Recherches populaires
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {searches.map(({ landing, count }) => (
            <li key={landing.path}>
              <Link to="/recherche" search={landing.filters} className={chip}>
                {landing.h1.replace(" à Sfax", "")}
                {count > 0 && <span className="ms-1.5 tabular-nums text-muted">{count}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guide-brands">
        <h2 id="guide-brands" className="text-xl font-semibold tracking-tight">
          Par marque
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link to="/marques/$brand" params={{ brand: brand.slug }} className={chip}>
                {brand.name} occasion
              </Link>
            </li>
          ))}
          <li>
            <Link to="/marques" className={`${chip} font-medium text-accent`}>
              Toutes les marques
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

/** /faq: questions and answers (also sent to Google as FAQPage data). */
export function FaqList() {
  const { data: content } = useSuspenseQuery(siteContentQuery);
  return (
    <div className="divide-y divide-separator rounded-2xl border border-border bg-surface">
      {homeFaq(content).map(({ question, answer }, index) => (
        <details
          key={question}
          open={index === 0}
          className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
            <h2 className="text-base">{question}</h2>
            <ChevronDown
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{answer}</p>
        </details>
      ))}
    </div>
  );
}
