import { slugify } from "@/lib/cars";
import { cn } from "@/lib/utils";

/**
 * Body-type picture from public/bodies/<slug>.svg (taken from the
 * automobile.tn search form). Each file holds two drawings side by side: grey
 * on the left, red on the right. We show one half: grey by default, red when
 * `active` or when a parent with the `group` class is hovered.
 */
export function BodyIcon({
  body,
  active = false,
  className,
}: {
  body: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block aspect-[500/228] h-8 bg-no-repeat transition-[background-position] duration-150",
        active ? "bg-right" : "bg-left group-hover:bg-right",
        className,
      )}
      style={{
        backgroundImage: `url(/bodies/${slugify(body)}.svg)`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}
