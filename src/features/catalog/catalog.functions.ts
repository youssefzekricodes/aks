import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  brandLogoSchema,
  brandSettingsSchema,
  carSchema,
  idSchema,
  leadSchema,
  uploadSchema,
} from "./schemas";

const repository = () => import("@/server/repository");

/** Published cars for listings (first photo only, no description). */
export const listPublicCars = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).carSummaries(),
);
const getPublicCarFn = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(200) }))
  .handler(async ({ data }) => (await repository()).publishedCar(data.slug));
export const getPublicCar = (slug: string) => getPublicCarFn({ data: { slug } });
export const listPublicSiteContent = createServerFn({ method: "GET" }).handler(async () =>
  Object.fromEntries((await (await repository()).content()).map((r) => [r.key, r.value])),
);
/** Public runtime settings the browser needs (no secrets). */
export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => ({
  turnstileSiteKey: process.env["TURNSTILE_SITE_KEY"] || null,
  origin: process.env["APP_ORIGIN"] || null,
}));
export const listBrandLogos = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).brandLogos(),
);

export const listBrandSettings = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).brandSettings(),
);

/* Admin — every handler re-checks the Supabase session; RLS enforces it again in the database. */
export const listAllCars = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).cars(),
);
export const listSiteContent = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).adminContent(),
);
export const listLeads = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).leads(),
);
export const createUploadUrl = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(async ({ data }) =>
    (await repository()).createUpload(data.kind, data.contentType, data.size, data.scope),
  );
export const saveCar = createServerFn({ method: "POST" })
  .validator(carSchema)
  .handler(async ({ data }) => (await repository()).saveCar(data));
export const deleteCar = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => (await repository()).deleteCar(data.id));
export const setCarPublished = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, published: z.boolean() }))
  .handler(async ({ data }) => (await repository()).publishCar(data.id, data.published));
export const setLeadHandled = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, handled: z.boolean() }))
  .handler(async ({ data }) => (await repository()).handleLead(data.id, data.handled));
export const deleteLead = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => (await repository()).deleteLead(data.id));
export const saveSiteContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entries: z
        .array(z.object({ key: z.string().min(1).max(100), value: z.string().max(200_000) }))
        .max(400),
    }),
  )
  .handler(async ({ data }) => (await repository()).saveContent(data.entries));
export const saveBrandLogo = createServerFn({ method: "POST" })
  .validator(brandLogoSchema)
  .handler(async ({ data }) => (await repository()).saveBrandLogo(data.slug, data.url));
export const saveBrandSettings = createServerFn({ method: "POST" })
  .validator(brandSettingsSchema)
  .handler(async ({ data }) => (await repository()).saveBrandSettings(data));
export const deleteBrandLogo = createServerFn({ method: "POST" })
  .validator(z.object({ slug: brandLogoSchema.shape.slug }))
  .handler(async ({ data }) => (await repository()).deleteBrandLogo(data.slug));
const submitLead = createServerFn({ method: "POST" })
  .validator(leadSchema)
  .handler(async ({ data }) => (await repository()).createLead(data));
export const createLead = (data: z.input<typeof leadSchema>) => submitLead({ data });
