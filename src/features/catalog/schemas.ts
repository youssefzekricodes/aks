import { z } from "zod";
const text = z.string().trim().min(1).max(200);
export const idSchema = z.string().min(1).max(100);
export const carSchema = z.object({
  id: idSchema.optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: text,
  brand: text,
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
  images: z
    .array(
      z
        .string()
        .max(3_000_000)
        .refine(
          (v) =>
            /^https?:\/\//.test(v) ||
            /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
            /^\/(?!\/)/.test(v),
          "Image non valide",
        ),
    )
    .max(12),
  description: z.string().max(20000),
  published: z.boolean(),
  sort_order: z.number().int().min(-100000).max(100000),
});
export const leadSchema = z.object({
  name: text,
  phone: z.string().trim().min(5).max(40),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  message: z.string().max(5000).optional(),
  car_slug: z.string().max(200).optional(),
});
