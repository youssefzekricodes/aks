import type { CSSProperties, ReactNode } from "react";
import { useLocale } from "./i18n";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Same corner seen in a mirrored (right-to-left) screen. */
const MIRROR: Record<Corner, Corner> = {
  "top-left": "top-right",
  "top-right": "top-left",
  "bottom-left": "bottom-right",
  "bottom-right": "bottom-left",
};

/**
 * A "cut-out" corner of a card (phone admin design): a tab in the page colour
 * holding a button, joined to the card by two inverted curves. Place it inside a
 * `relative` card; it covers the card's corner. Corners are given for French and
 * mirrored in Arabic (right-to-left).
 */
export function Notch({
  corner: given,
  children,
  radius = "1.5rem",
}: {
  corner: Corner;
  children: ReactNode;
  radius?: string;
}) {
  const rtl = useLocale() === "ar";
  const corner = rtl ? MIRROR[given] : given;
  const top = corner.startsWith("top");
  const left = corner.endsWith("left");
  // Background everywhere in the small square except a quarter circle of card.
  const curve = (at: string): CSSProperties => ({
    position: "absolute",
    width: radius,
    height: radius,
    background: `radial-gradient(circle at ${at}, transparent calc(${radius} - 0.5px), var(--background) ${radius})`,
  });
  // The quarter circle sits on the side away from the tab.
  const at = `${left ? "100%" : "0"} ${top ? "100%" : "0"}`;
  const tab: CSSProperties = {
    position: "absolute",
    zIndex: 10,
    background: "var(--background)",
    [top ? "top" : "bottom"]: 0,
    [left ? "left" : "right"]: 0,
    [top ? "paddingBottom" : "paddingTop"]: "0.5rem",
    [left ? "paddingRight" : "paddingLeft"]: "0.5rem",
    [`border${top ? "Bottom" : "Top"}${left ? "Right" : "Left"}Radius`]: radius,
  };
  return (
    <div style={tab}>
      {/* Curve along the card's edge, below/above the tab. */}
      <span
        aria-hidden
        style={{ ...curve(at), [top ? "top" : "bottom"]: "100%", [left ? "left" : "right"]: 0 }}
      />
      {/* Curve along the card's edge, beside the tab. */}
      <span
        aria-hidden
        style={{ ...curve(at), [top ? "top" : "bottom"]: 0, [left ? "left" : "right"]: "100%" }}
      />
      {children}
    </div>
  );
}
