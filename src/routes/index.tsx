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

const title = "Auto Kontor Sfax — Showroom automobile premium à Sfax";
const description =
  "Auto Kontor Sfax : vente de véhicules neufs et d'occasion premium à Sfax. Financement, reprise, garantie et importation sur commande.";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Inventory />
        <SellCarBanner className="pb-24 lg:pb-32" />
        <About />
        <Services />
        <Testimonials />
        <Showroom />
        <ContactFooter />
      </main>
    </div>
  );
}
