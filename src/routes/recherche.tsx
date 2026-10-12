import { resolveContent } from "@/features/content/definition";
import { useSiteText } from "@/lib/site-content";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type Car } from "@/lib/cars";
import { publicCarsQuery, siteContentQuery } from "@/lib/queries";
import { Navbar } from "@/components/aks/Navbar";
import { SellCarBanner } from "@/components/aks/SellCarBanner";
import { CarCard } from "@/components/aks/CarCard";
import { Reveal } from "@/components/aks/Reveal";

export const Route = createFileRoute("/recherche")({
  loader: async ({ context }) => {
    const [, content] = await Promise.all([
      context.queryClient.ensureQueryData(publicCarsQuery),
      context.queryClient.ensureQueryData(siteContentQuery),
    ]);
    return { content };
  },
  validateSearch: (search) => ({
    price: String(search["price"] || "all"),
    type: String(search["type"] || "all"),
    km: String(search["km"] || "all"),
    brand: String(search["brand"] || "all"),
  }),
  head: ({ loaderData }) => {
    const title = resolveContent(loaderData?.content ?? {}, "seo.search_title");
    const description = resolveContent(loaderData?.content ?? {}, "seo.search_description");
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
  component: RecherchePage,
});

function matchesPrice(price: string, car: Car) {
  if (price === "all") return true;
  // "Prix à discuter" vehicles have no known price: they never match a band.
  if (car.price_on_request === true) return false;
  if (price === "0-30000") return car.price >= 0 && car.price < 30000;
  if (price === "30000-50000") return car.price >= 30000 && car.price < 50000;
  if (price === "50000-100000") return car.price >= 50000 && car.price < 100000;
  if (price === "100000-200000") return car.price >= 100000 && car.price < 200000;
  if (price === "200000+") return car.price >= 200000;
  return true;
}

function matchesKm(km: string, car: Car) {
  if (km === "all") return true;
  if (km === "0-50000") return car.km_value >= 0 && car.km_value < 50000;
  if (km === "50000-100000") return car.km_value >= 50000 && car.km_value < 100000;
  if (km === "100000-200000") return car.km_value >= 100000 && car.km_value < 200000;
  if (km === "200000+") return car.km_value >= 200000;
  return true;
}

function RecherchePage() {
  const text = useSiteText();

  const { price, type, km, brand } = Route.useSearch();
  const { data: cars } = useSuspenseQuery(publicCarsQuery);

  const filtered = cars.filter(
    (car: Car) =>
      matchesPrice(price, car) &&
      (type === "all" || car.body === type) &&
      matchesKm(km, car) &&
      (brand === "all" || car.brand === brand),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {text("search.text_1", "Retour à l'accueil")}
        </Link>

        <h1 className="mt-8 text-4xl font-bold sm:text-5xl">
          {text("search.text_2", "Résultats de recherche")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {text(
            filtered.length === 1 ? "search.results_one" : "search.results_many",
            "{count} véhicules trouvés",
          ).replaceAll("{count}", String(filtered.length))}
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((car, i) => (
            <Reveal key={car.name} delay={i * 60}>
              <CarCard car={car} />
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-lg text-foreground">
              {text("search.text_5", "Aucun véhicule ne correspond à ces critères.")}
            </p>
            <Link
              to="/recherche"
              search={{ price: "all", type: "all", km: "all", brand: "all" }}
              className="btn-3d btn-3d-primary mt-6 inline-flex"
            >
              {text("search.text_6", "Voir tout l'inventaire")}
            </Link>
          </div>
        )}
      </main>
      <SellCarBanner className="pb-24" />
    </div>
  );
}
