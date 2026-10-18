import { createFileRoute, notFound } from "@tanstack/react-router";
import { resolveContent } from "@/features/content/definition";
import { brandBySlug } from "@/features/catalog/brands";
import { facetOptions, filterCars, validateSearch } from "@/features/catalog/search";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { absoluteUrl, seo } from "@/lib/seo";
import { carImage, carTitle } from "@/lib/cars";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { SearchPage } from "@/components/aks/search/SearchPage";

export const Route = createFileRoute("/marques/$brand")({
  validateSearch,
  loader: async ({ context, params }) => {
    const [cars, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    const inStock = facetOptions(cars, {}, "marque").find((b) => b.value === params.brand);
    const known = brandBySlug(params.brand);
    // Known brands without stock still get a page (empty state, noindex); anything else is a 404.
    if (!inStock && !known) throw notFound();
    const name = inStock?.label ?? known!.name;
    const brandCars = filterCars(cars, { marque: params.brand });
    return { content, origin: config.origin, name, cars: brandCars };
  },
  head: ({ loaderData, params }) => {
    const content = loaderData?.content ?? {};
    const origin = loaderData?.origin;
    const name = loaderData?.name ?? params.brand;
    const count = loaderData?.cars.length ?? 0;
    const fill = (template: string) =>
      template.replaceAll("{brand}", name).replaceAll("{count}", String(count));
    const path = `/marques/${params.brand}`;
    return seo({
      title: fill(resolveContent(content, "seo.brand_title")),
      description: fill(resolveContent(content, "seo.brand_description")),
      siteName: resolveContent(content, "seo.site_name"),
      origin,
      path,
      image: loaderData?.cars[0] ? carImage(loaderData.cars[0]) : undefined,
      noindex: count === 0,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl(origin, "/") },
            {
              "@type": "ListItem",
              position: 2,
              name: "Marques",
              item: absoluteUrl(origin, "/marques"),
            },
            { "@type": "ListItem", position: 3, name, item: absoluteUrl(origin, path) },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: (loaderData?.cars ?? []).map((car, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: carTitle(car),
            url: absoluteUrl(origin, `/vehicule/${car.slug}`),
          })),
        },
      ],
    });
  },
  component: BrandPage,
});

function BrandPage() {
  const { brand } = Route.useParams();
  const { name } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <div className="min-h-screen">
      <Navbar />
      <SearchPage
        filters={{ ...search, marque: brand }}
        onNavigate={({ marque: _brand, ...rest }) =>
          navigate({ search: rest, replace: true, resetScroll: false })
        }
        lockedBrand={name}
        title={`${name} neuves et d’occasion`}
        breadcrumbs={[
          { label: "Accueil", to: "/" },
          { label: "Marques", to: "/marques" },
          { label: name },
        ]}
      />
      <SiteFooter />
    </div>
  );
}
