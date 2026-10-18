import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(200).optional();
const optionalCount = (max: number) => z.number().int().min(0).max(max).nullable().optional();
export const idSchema = z.string().uuid();
const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** Photos are R2 public URLs (the server checks they are ours and exist). */
const imageSchema = z.string().url().max(500);
export const carSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  name: text,
  brand: text,
  model: optionalText,
  version: optionalText,
  country: text,
  year: z.number().int().min(1900).max(2100),
  price: z.number().finite().min(0).max(1e9),
  price_on_request: z.boolean().optional().default(false),
  km: text,
  km_value: z.number().int().min(0).max(1e8),
  fuel: text,
  gearbox: text,
  body: text,
  state: text,
  transmission: optionalText,
  doors: optionalCount(9),
  seats: optionalCount(60),
  fiscal_power: optionalCount(100),
  images: z.array(imageSchema).max(12),
  description: z.string().max(20000),
  published: z.boolean(),
  sold: z.boolean().optional().default(false),
  social_caption: z.string().max(2200).optional().default(""),
  social_targets: z
    .array(z.enum(["facebook", "instagram"]))
    .max(2)
    .optional()
    .default([]),
  discount_price: z.number().finite().min(0).max(1e9).nullable().optional().default(null),
  /** Omitted for a new vehicle: it is placed first. */
  sort_order: z.number().int().min(-100000).max(100000).optional(),
});
export const leadSchema = z.object({
  name: text,
  phone: z.string().trim().min(5).max(40),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  message: z.string().max(5000).optional(),
  car_slug: z.string().max(200).optional(),
  turnstile_token: z.string().max(4096).optional(),
});
export const brandLogoSchema = z.object({
  slug: slugSchema,
  url: z.string().url().max(500),
});
export const brandSettingsSchema = z
  .array(
    z.object({
      slug: slugSchema,
      hidden: z.boolean(),
      favoriteRank: z.number().int().min(1).max(1000).nullable(),
    }),
  )
  .min(1)
  .max(200);
export const uploadSchema = z.object({
  kind: z.enum(["vehicle", "brand", "site"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(5_000_000),
  scope: z
    .string()
    .regex(/^[a-z0-9_.-]*$/)
    .max(100)
    .default(""),
});
