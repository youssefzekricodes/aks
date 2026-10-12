import { useSiteText } from "@/lib/site-content";
import { resolveContent } from "@/features/content/definition";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { Hero } from "@/components/aks/Hero";
import { Inventory } from "@/components/aks/Inventory";
import { About } from "@/components/aks/About";
import { Services } from "@/components/aks/Services";
import { Testimonials } from "@/components/aks/Testimonials";
import { Showroom } from "@/components/aks/Showroom";
import { ContactFooter } from "@/components/aks/ContactFooter";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [, content] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
    ]);
    return { content };
  },
  head: ({ loaderData }) => {
    const title = resolveContent(loaderData?.content ?? {}, "seo.home_title");
    const description = resolveContent(loaderData?.content ?? {}, "seo.home_description");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Index,
});

function Index() {
  const text = useSiteText();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {text("sections.hero", "true") === "true" && <Hero />}
        {text("sections.inventory", "true") === "true" && <Inventory />}
        {text("sections.sell", "true") === "true" && <SellCarBanner className="pb-16 lg:pb-20" />}
        {text("sections.about", "true") === "true" && <About />}
        {text("sections.services", "true") === "true" && <Services />}
        {text("sections.testimonials", "true") === "true" && <Testimonials />}
        {text("sections.showroom", "true") === "true" && <Showroom />}
        {text("sections.contact", "true") === "true" && <ContactFooter />}
      </main>
    </div>
  );
}
