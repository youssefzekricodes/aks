import { useSiteText } from "@/lib/site-content";
import { Fuel, Gauge, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { carImage, type Car } from "@/lib/cars";

export function CarCard({ car }: { car: Car }) {
  const text = useSiteText();

  return (
    <article className="group glass-panel h-full overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-[0_0_50px_-12px_var(--primary)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <img
          src={carImage(car)}
          alt={`${car.brand} ${car.name}`}
          width={1024}
          height={768}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur">
          {car.state}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">
              {car.brand} {car.name}
            </h3>
            <p className="text-sm text-muted-foreground">{car.year}</p>
          </div>
          <p
            className={`shrink-0 text-right font-display font-bold text-primary ${
              car.price_on_request ? "max-w-28 text-sm" : "text-lg"
            }`}
          >
            {car.price_on_request
              ? text("card.text_3", "Prix à discuter")
              : `${car.price.toLocaleString("fr-FR")} ${text("card.text_1", "DT")}`}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-steel" />
            {car.km}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 shrink-0 text-steel" />
            {car.fuel}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-steel" />
            {car.gearbox}
          </span>
        </div>
        <Link
          to="/vehicule/$slug"
          params={{ slug: car.slug }}
          className="btn-3d btn-3d-primary mt-4 flex w-full items-center justify-center px-4 py-2 text-xs uppercase tracking-wider"
        >
          {text("card.text_2", "Voir les détails")}
        </Link>
      </div>
    </article>
  );
}
