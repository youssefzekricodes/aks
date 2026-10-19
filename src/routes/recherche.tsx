import { createFileRoute } from "@tanstack/react-router";
import { resolveContent } from "@/features/content/definition";
import { filterCars, validateSearch } from "@/features/catalog/search";
import { landingFor } from "@/features/seo/landings";
import { breadcrumbJsonLd } from "@/features/seo/structured";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { SearchPage } from "@/components/aks/search/SearchPage";

export const Route = createFileRoute("/recherche")({
  validateSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const [cars, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    const landing = landingFor(deps.search);
    const count = landing ? filterCars(cars, landing.filters).length : 0;
    return { content, origin: config.origin, count };
  },
  head: ({ loaderData, match }) => {
    const content = loaderData?.content ?? {};
    const origin = loaderData?.origin;
    const siteName = resolveContent(content, "seo.site_name");
    // One filter (body type, fuel, gearbox, condition, budget) = a landing page of its
    // own, indexed while it has vehicles. Other combinations: canonical /recherche.
    const landing = landingFor(match.search);
    if (landing) {
      const count = loaderData?.count ?? 0;
      return seo({
        title: landing.title,
        description: landing.description(count),
        siteName,
        origin,
        path: landing.path,
        noindex: count === 0,
        jsonLd: [
          breadcrumbJsonLd(origin, [
            { name: "Accueil", path: "/" },
            { name: "Véhicules", path: "/recherche" },
            { name: landing.h1, path: landing.path },
          ]),
        ],
      });
    }
    const filtered = Object.keys(match.search).length > 0;
    return seo({
      title: resolveContent(content, "seo.search_title"),
      description: resolveContent(content, "seo.search_description"),
      siteName,
      origin,
      path: "/recherche",
      noindex: filtered,
      jsonLd: [
        breadcrumbJsonLd(origin, [
          { name: "Accueil", path: "/" },
          { name: "Véhicules", path: "/recherche" },
        ]),
      ],
    });
  },
  component: RecherchePage,
});

function RecherchePage() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const landing = landingFor(filters);
  return (
    <div className="min-h-screen">
      <Navbar />
      <SearchPage
        filters={filters}
        onNavigate={(search) => navigate({ search, replace: true, resetScroll: false })}
        title={landing?.h1 ?? "Voitures neuves et d’occasion à Sfax"}
        {...(landing ? { intro: <p>{landing.intro}</p> } : {})}
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          ...(landing
            ? [{ label: "Véhicules", to: "/recherche" }, { label: landing.h1 }]
            : [{ label: "Véhicules" }]),
        ]}
      />
      <SiteFooter />
    </div>
  );
}
