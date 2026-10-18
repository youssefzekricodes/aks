import { Link } from "@tanstack/react-router";
import { Chip, Skeleton } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { MessageCircle } from "lucide-react";

import { useSiteText } from "@/lib/site-content";
import { carImage, formatKm, formatPrice, GEARBOX_LABELS, label, type Car } from "@/lib/cars";
import { BrandLogo } from "./BrandLogo";

/**
 * Listing card: photo, brand, model, one line of key specs, price.
 * The whole card is the link (title link stretched over the card).
 */
export function CarCard({ car, priority = false }: { car: Car; priority?: boolean }) {
  const text = useSiteText();
  const specs = [
    String(car.year),
    formatKm(car.km_value),
    car.fuel,
    label(GEARBOX_LABELS, car.gearbox),
  ];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[border-color,box-shadow] hover:border-[color-mix(in_oklab,var(--border)_60%,var(--foreground)_25%)] hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-secondary">
        <img
          src={carImage(car)}
          alt=""
          width={800}
          height={600}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <Chip
          size="sm"
          color={car.state === "Neuf" ? "accent" : "default"}
          className="absolute left-3 top-3 shadow-sm"
        >
          {car.state}
        </Chip>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <BrandLogo brand={car.brand} wordmark={false} size={18} />
          <span>{car.brand}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-1 text-base font-semibold">
          <Link
            to="/vehicule/$slug"
            params={{ slug: car.slug }}
            className="outline-none after:absolute after:inset-0"
          >
            {car.name}
          </Link>
        </h3>
        <p className="tabular mt-1 text-sm text-muted">{specs.join(" · ")}</p>
        {car.price_on_request ? (
          // Price hidden by the admin: invite to ask instead. Above the stretched card link.
          <div className="mt-auto pt-4">
            <Link
              to="/contact"
              search={{ vehicule: car.slug, objet: "prix" }}
              className={buttonVariants({
                size: "sm",
                variant: "secondary",
                className: "relative z-10",
              })}
            >
              <MessageCircle className="size-4" />
              {text("card.price_hidden_cta", "Contactez-nous")}
            </Link>
          </div>
        ) : (
          <p className="tabular mt-auto pt-4 text-lg font-semibold">
            {formatPrice(car.price, text("card.text_1", "DT"))}
          </p>
        )}
      </div>
    </article>
  );
}

export function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/4 rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="mt-4 h-5 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function CarGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">{children}</div>;
}
