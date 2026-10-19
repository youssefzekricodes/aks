import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@heroui/styles";
import { ArrowRight } from "lucide-react";
import { publicCarsQuery } from "@/lib/queries";
import { useSiteText } from "@/lib/site-content";
import { sortCars } from "@/features/catalog/search";
import { CarCard, CarGrid } from "./CarCard";
import { NoResults } from "./NoResults";
import { Reveal } from "./Reveal";
import { Section, SectionHeader } from "./Section";

/**
 * Home page selection: the vehicles chosen in the admin "Vitrine", in that order;
 * without a selection, the first vehicles in showroom order.
 */
export function Inventory() {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const text = useSiteText();
  const chosen = cars
    .filter((car) => car.featured_rank != null)
    .sort((a, b) => a.featured_rank! - b.featured_rank!);
  const featured = chosen.length ? chosen.slice(0, 12) : sortCars(cars).slice(0, 6);
  const seeAll = (
    <Link to="/recherche" className={buttonVariants({ variant: "secondary" })}>
      {text("inventory.see_all", "Voir tout le stock")}
      <span className="tabular text-muted">({cars.length})</span>
      <ArrowRight className="size-4" />
    </Link>
  );

  return (
    <Section id="inventaire">
      <SectionHeader
        eyebrow={text("inventory.text_1", "Inventaire")}
        title={text("inventory_title", "Véhicules en vitrine")}
        description={text(
          "inventory_subtitle",
          "Chaque véhicule est inspecté sur 120 points avant d'entrer dans notre showroom.",
        )}
        action={cars.length > featured.length ? seeAll : undefined}
      />
      {featured.length ? (
        <CarGrid>
          {featured.map((car, i) => (
            <Reveal key={car.id} delay={(i % 3) * 90} className="h-full">
              <CarCard car={car} priority={i < 3} />
            </Reveal>
          ))}
        </CarGrid>
      ) : (
        <NoResults filtersActive={false} />
      )}
    </Section>
  );
}
