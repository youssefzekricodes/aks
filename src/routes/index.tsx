import { Fragment, type ReactNode } from "react";
import { Reveal } from "@/components/aks/Reveal";
import { createFileRoute } from "@tanstack/react-router";
import { useSiteText } from "@/lib/site-content";
import { resolveContent } from "@/features/content/definition";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { Hero } from "@/components/aks/Hero";
import { BodiesSection, BrandsSection } from "@/components/aks/Discovery";
import { Inventory } from "@/components/aks/Inventory";
import { About } from "@/components/aks/About";
import { Services } from "@/components/aks/Services";
import { Testimonials } from "@/components/aks/Testimonials";
import { Showroom } from "@/components/aks/Showroom";
import { dealerJsonLd, websiteJsonLd } from "@/features/seo/structured";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
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
    const get = (key: string) => resolveContent(content, key);
    return seo({
      title: get("seo.home_title"),
      description: get("seo.home_description"),
      siteName: get("seo.site_name"),
      origin,
      path: "/",
      image: get("hero.image_1"),
      jsonLd: [dealerJsonLd(content, origin), websiteJsonLd(content, origin)],
    });
  },
  component: Index,
});

function Index() {
  const text = useSiteText();
  const show = (key: string) => text(`sections.${key}`, "true") === "true";
  const sections: [string, ReactNode][] = [
    ["hero", <Hero />],
    ["brands", <BrandsSection />],
    ["bodies", <BodiesSection />],
    ["inventory", <Inventory />],
    ["sell", <SellCarBanner className="pb-14 lg:pb-20" />],
    ["about", <About />],
    ["services", <Services />],
    ["testimonials", <Testimonials />],
    ["showroom", <Showroom />],
  ];
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {sections
          .filter(([key]) => show(key))
          .map(([key, section]) =>
            // Sections below the hero fade up as they scroll into view; the
            // showcase reveals its cards one by one instead.
            key === "hero" || key === "inventory" ? (
              <Fragment key={key}>{section}</Fragment>
            ) : (
              <Reveal key={key}>{section}</Reveal>
            ),
          )}
      </main>
      <SiteFooter />
    </div>
  );
}
