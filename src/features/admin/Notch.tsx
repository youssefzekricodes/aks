import type { CSSProperties, ReactNode } from "react";

/**
 * A "cut-out" corner of a card (phone admin design): a tab in the page colour
 * holding a button, joined to the card by two inverted curves. Place it inside a
 * `relative` card; it covers the card's corner.
 */
export function Notch({
  corner,
  children,
  radius = "1.5rem",
}: {
  corner: "top-left" | "top-right" | "bottom-left";
  children: ReactNode;
  radius?: string;
}) {
  // Background everywhere in the small square except a quarter circle of card.
  const curve = (at: string): CSSProperties => ({
    width: radius,
    height: radius,
    background: `radial-gradient(circle at ${at}, transparent calc(${radius} - 0.5px), var(--background) ${radius})`,
  });
  const tab: Record<typeof corner, string> = {
    "top-left": "top-0 left-0 pb-2 pe-2",
    "top-right": "top-0 right-0 pb-2 ps-2",
    "bottom-left": "bottom-0 left-0 pt-2 pe-2",
  };
  const rounded: Record<typeof corner, CSSProperties> = {
    "top-left": { borderBottomRightRadius: radius },
    "top-right": { borderBottomLeftRadius: radius },
    "bottom-left": { borderTopRightRadius: radius },
  };
  return (
    <div className={`absolute z-10 bg-background ${tab[corner]}`} style={rounded[corner]}>
      {corner === "bottom-left" && (
        <>
          <span aria-hidden className="absolute bottom-full left-0" style={curve("100% 0")} />
          <span aria-hidden className="absolute bottom-0 left-full" style={curve("100% 0")} />
        </>
      )}
      {corner === "top-left" && (
        <>
          <span aria-hidden className="absolute left-0 top-full" style={curve("100% 100%")} />
          <span aria-hidden className="absolute left-full top-0" style={curve("100% 100%")} />
        </>
      )}
      {corner === "top-right" && (
        <>
          <span aria-hidden className="absolute right-0 top-full" style={curve("0 100%")} />
          <span aria-hidden className="absolute right-full top-0" style={curve("0 100%")} />
        </>
      )}
      {children}
    </div>
  );
}
