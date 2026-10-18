import { createFileRoute } from "@tanstack/react-router";
import { resolveContent } from "@/features/content/definition";
import { validateSearch } from "@/features/catalog/search";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { SearchPage } from "@/components/aks/search/SearchPage";

export const Route = createFileRoute("/recherche")({
  validateSearch,
  loader: async ({ context }) => {
    const [, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData, match }) => {
    const content = loaderData?.content ?? {};
    // Filtered variants are not indexed separately; the canonical is the unfiltered list.
    const filtered = Object.keys(match.search).length > 0;
    return seo({
      title: resolveContent(content, "seo.search_title"),
      description: resolveContent(content, "seo.search_description"),
      siteName: resolveContent(content, "seo.site_name"),
      origin: loaderData?.origin,
      path: "/recherche",
      noindex: filtered,
    });
  },
  component: RecherchePage,
});

function RecherchePage() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <div className="min-h-screen">
      <Navbar />
      <SearchPage
        filters={filters}
        onNavigate={(search) => navigate({ search, replace: true, resetScroll: false })}
        title="Voitures neuves et d’occasion"
        breadcrumbs={[{ label: "Accueil", to: "/" }, { label: "Véhicules" }]}
      />
      <SiteFooter />
    </div>
  );
}
