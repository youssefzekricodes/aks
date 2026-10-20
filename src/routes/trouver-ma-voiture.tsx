import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { CarFinder } from "@/components/aks/finder/CarFinder";
import { resolveContent } from "@/features/content/definition";
import { breadcrumbJsonLd } from "@/features/seo/structured";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

/** Guided search: a few questions, the cars that fit. */
export const Route = createFileRoute("/trouver-ma-voiture")({
  loader: async ({ context }) => {
    const [content, config] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
      context.queryClient.ensureQueryData(publicCarsQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const origin = loaderData?.origin;
    return seo({
      title: "Trouver ma voiture en quelques questions | Auto Kontor Sfax (AKS)",
      description:
        "Type de voiture, boîte, carburant, marque : répondez à quelques questions et découvrez les voitures du stock AKS à Sfax qui vous correspondent.",
      siteName: resolveContent(loaderData?.content ?? {}, "seo.site_name"),
      origin,
      path: "/trouver-ma-voiture",
      jsonLd: [
        breadcrumbJsonLd(origin, [
          { name: "Accueil", path: "/" },
          { name: "Trouver ma voiture", path: "/trouver-ma-voiture" },
        ]),
      ],
    });
  },
  component: () => (
    <div className="min-h-screen">
      <Navbar />
      <CarFinder />
      <SiteFooter />
    </div>
  ),
});
