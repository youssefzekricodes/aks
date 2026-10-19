import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Navbar } from "@/components/aks/Navbar";
import { FaqList } from "@/components/aks/SeoPages";
import { Eyebrow, sectionTitle } from "@/components/aks/Section";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { resolveContent } from "@/features/content/definition";
import { homeFaq } from "@/features/seo/faq";
import { breadcrumbJsonLd, faqJsonLd } from "@/features/seo/structured";
import { publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

/** FAQ page (FAQPage data must sit on the page where the answers are shown). */
export const Route = createFileRoute("/faq")({
  loader: async ({ context }) => {
    const [content, config] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const origin = loaderData?.origin;
    return seo({
      title: "Questions fréquentes — achat, reprise, financement | Auto Kontor Sfax (AKS)",
      description:
        "Où acheter une voiture d’occasion à Sfax, garantie, reprise, financement, importation : les réponses d’AKS – Auto Kontor Sfax.",
      siteName: resolveContent(content, "seo.site_name"),
      origin,
      path: "/faq",
      jsonLd: [
        faqJsonLd(homeFaq(content)),
        breadcrumbJsonLd(origin, [
          { name: "Accueil", path: "/" },
          { name: "Questions fréquentes", path: "/faq" },
        ]),
      ],
    });
  },
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-20 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item>Questions fréquentes</Breadcrumbs.Item>
        </Breadcrumbs>
        <div className="mx-auto mt-10 max-w-3xl">
          <Eyebrow>FAQ</Eyebrow>
          <h1 className={`mt-4 ${sectionTitle}`}>Questions fréquentes</h1>
          <div className="mt-8">
            <FaqList />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-6">
            <p className="flex-1 text-base text-muted">
              Une autre question ? Notre équipe vous répond rapidement.
            </p>
            <Link to="/contact" className={buttonVariants()}>
              Nous contacter
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
