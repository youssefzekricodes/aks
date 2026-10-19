import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumbs } from "@heroui/react";
import { Navbar } from "@/components/aks/Navbar";
import { SearchGuide } from "@/components/aks/SeoPages";
import { Eyebrow, sectionTitle } from "@/components/aks/Section";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { resolveContent } from "@/features/content/definition";
import { breadcrumbJsonLd } from "@/features/seo/structured";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

/** Guide page: what AKS sells and links to every popular search and brand page. */
export const Route = createFileRoute("/voitures-occasion-sfax")({
  loader: async ({ context }) => {
    const [, content, config] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const origin = loaderData?.origin;
    return seo({
      title: "Voitures d’occasion à Sfax : recherches populaires et marques | AKS",
      description:
        "Trouvez votre voiture d’occasion à Sfax chez AKS – Auto Kontor Sfax : SUV, berlines, citadines, automatiques, diesel, par budget et par marque. Reprise, financement, importation.",
      siteName: resolveContent(loaderData?.content ?? {}, "seo.site_name"),
      origin,
      path: "/voitures-occasion-sfax",
      jsonLd: [
        breadcrumbJsonLd(origin, [
          { name: "Accueil", path: "/" },
          { name: "Voitures d’occasion à Sfax", path: "/voitures-occasion-sfax" },
        ]),
      ],
    });
  },
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-20 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item>Voitures d’occasion à Sfax</Breadcrumbs.Item>
        </Breadcrumbs>
        <div className="mt-10">
          <Eyebrow>Voitures d’occasion à Sfax</Eyebrow>
          <h1 className={`mt-4 ${sectionTitle}`}>Votre voiture d’occasion à Sfax, chez AKS</h1>
          <div className="mt-6">
            <SearchGuide />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
