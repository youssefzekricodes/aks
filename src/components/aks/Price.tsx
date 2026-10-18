import { discountPercent, formatPrice, salePrice, type Car } from "@/lib/cars";
import { cn } from "@/lib/utils";

/**
 * Asking price; with a discount, the new price in the accent colour, the old one
 * struck through and the percentage saved. Screen readers hear "Prix remisé …,
 * au lieu de …".
 */
export function Price({
  car,
  currency = "DT",
  size = "md",
  badge = true,
  className,
}: {
  car: Pick<Car, "price" | "discount_price">;
  currency?: string;
  size?: "md" | "lg";
  /** Off where the percentage is already shown (car card photo). */
  badge?: boolean;
  className?: string;
}) {
  const percent = discountPercent(car);
  const main = size === "lg" ? "text-3xl" : "text-lg";
  if (!percent)
    return (
      <p className={cn("tabular font-semibold", main, className)}>
        {formatPrice(car.price, currency)}
      </p>
    );
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <p className={cn("tabular font-semibold text-accent", main)}>
        <span className="sr-only">Prix remisé : </span>
        {formatPrice(salePrice(car), currency)}
      </p>
      <p className={cn("tabular text-muted", size === "lg" ? "text-base" : "text-sm")}>
        <span className="sr-only">au lieu de </span>
        <del>{formatPrice(car.price, currency)}</del>
      </p>
      {badge && <DiscountBadge percent={percent} />}
    </div>
  );
}

export function DiscountBadge({ percent, className }: { percent: number; className?: string }) {
  if (!percent) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      −{percent} %<span className="sr-only"> de remise</span>
    </span>
  );
}
