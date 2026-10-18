import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@heroui/react";
import { resolveContent } from "@/features/content/definition";
import { arrangeBrands, brandOptions } from "@/features/catalog/search";
import {
  brandSettingsQuery,
  publicCarsQuery,
  publicConfigQuery,
  siteContentQuery,
} from "@/lib/queries";
import { absoluteUrl, seo } from "@/lib/seo";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { BrandGrid } from "@/components/aks/Discovery";

export const Route = createFileRoute("/marques/")({
  loader: async ({ context }) => {
    const [, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const origin = loaderData?.origin;
    return seo({
      title: resolveContent(content, "seo.brands_title"),
      description: resolveContent(content, "seo.brands_description"),
      siteName: resolveContent(content, "seo.site_name"),
      origin,
      path: "/marques",
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
          ],
        },
      ],
    });
  },
  component: BrandsPage,
});

function BrandsPage() {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const { data: settings } = useSuspenseQuery(brandSettingsQuery);
  const brands = arrangeBrands(brandOptions(cars, {}), settings);
  const stocked = brands.filter((b) => b.count > 0).length;
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-20 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item>Marques</Breadcrumbs.Item>
        </Breadcrumbs>
        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Les voitures par marque</h1>
        <p className="mt-1 text-sm text-muted">
          {brands.length} marques · {stocked} actuellement en stock dans notre showroom.
        </p>
        <div className="mt-8">
          <BrandGrid brands={brands} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
