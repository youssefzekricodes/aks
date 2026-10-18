import { createFileRoute } from "@tanstack/react-router";
import { useSiteText } from "@/lib/site-content";
import { primaryPhone, resolveContent, resolvePhones } from "@/features/content/definition";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { Hero } from "@/components/aks/Hero";
import { BodiesSection, BrandsSection } from "@/components/aks/Discovery";
import { Inventory } from "@/components/aks/Inventory";
import { About } from "@/components/aks/About";
import { Services } from "@/components/aks/Services";
import { Testimonials } from "@/components/aks/Testimonials";
import { Showroom } from "@/components/aks/Showroom";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { publicCarsQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo, absoluteUrl } from "@/lib/seo";

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
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: get("seo.site_name"),
          url: absoluteUrl(origin, "/"),
          logo: absoluteUrl(origin, get("identity.logo")),
          image: absoluteUrl(origin, get("hero.image_1")),
          telephone: primaryPhone(resolvePhones(content))?.number,
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "09:00",
            closes: "21:00",
          },
          sameAs: [get("contact.link_1"), get("contact.link_instagram")].filter(Boolean),
          email: get("identity.email"),
          address: {
            "@type": "PostalAddress",
            streetAddress: get("showroom.text_3"),
            addressLocality: "Sfax",
            postalCode: "3000",
            addressCountry: "TN",
          },
        },
      ],
    });
  },
  component: Index,
});

function Index() {
  const text = useSiteText();
  const show = (key: string) => text(`sections.${key}`, "true") === "true";
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {show("hero") && <Hero />}
        {show("brands") && <BrandsSection />}
        {show("bodies") && <BodiesSection />}
        {show("inventory") && <Inventory />}
        {show("sell") && <SellCarBanner className="pb-14 lg:pb-20" />}
        {show("about") && <About />}
        {show("services") && <Services />}
        {show("testimonials") && <Testimonials />}
        {show("showroom") && <Showroom />}
      </main>
      <SiteFooter />
    </div>
  );
}
