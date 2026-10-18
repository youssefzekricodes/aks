import {
  carTitle,
  discountPercent,
  formatKm,
  formatPrice,
  GEARBOX_LABELS,
  label,
  salePrice,
  type Car,
} from "../../lib/cars.ts";
import { brandInfo } from "./brands.ts";

export const SOCIAL_PLATFORMS = ["facebook", "instagram"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};
/** Instagram's caption limit (Facebook allows more). */
export const SOCIAL_CAPTION_MAX = 2200;

const hashtag = (value: string) => `#${value.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "")}`;

/** Suggested post text from the vehicle details; the admin can edit it freely. */
export function buildSocialCaption(
  car: Pick<
    Car,
    "brand" | "name" | "year" | "km_value" | "fuel" | "gearbox" | "price" | "discount_price"
  > & { price_on_request?: boolean | undefined; state?: string | undefined },
  { url, phone }: { url: string; phone?: string | undefined },
) {
  const percent = discountPercent(car);
  const price = car.price_on_request
    ? "Prix sur demande"
    : percent
      ? `${formatPrice(salePrice(car))} au lieu de ${formatPrice(car.price)} (−${percent} %)`
      : formatPrice(car.price);
  return [
    `🚗 ${carTitle(car)} — ${car.year}${car.state ? ` · ${car.state}` : ""}`,
    "",
    `• ${formatKm(car.km_value)} · ${car.fuel} · ${label(GEARBOX_LABELS, car.gearbox)}`,
    `💰 ${price}`,
    "",
    "📍 Disponible chez Auto Kontor Sfax — Route Sidi Mansour, km 5, Sfax",
    phone ? `📞 ${phone}` : null,
    `👉 ${url}`,
    "",
    ["#AutoKontorSfax", "#Sfax", "#Tunisie", hashtag(brandInfo(car.brand).name), "#voiture"].join(
      " ",
    ),
  ]
    .filter((line) => line !== null)
    .join("\n")
    .slice(0, SOCIAL_CAPTION_MAX);
}
