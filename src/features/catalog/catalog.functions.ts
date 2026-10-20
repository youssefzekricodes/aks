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
/** Notifications to the other admins about vehicle changes (after success only). */
const activity = () => import("@/server/activity");

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
  // Canonical links and structured data: the public address of the site.
  origin: (await repository()).publicOrigin(),
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
  .handler(async ({ data }) => {
    const result = await (await repository()).saveCar(data);
    await (await activity()).notifyCarActivity(data.id ? "edited" : "added", [result.id]);
    return result;
  });
export const deleteCar = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const { carNames, notifyCarActivity } = await activity();
    const names = await carNames([data.id]);
    const result = await (await repository()).deleteCar(data.id);
    await notifyCarActivity("deleted", [data.id], names);
    return result;
  });
export const setCarPublished = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, published: z.boolean() }))
  .handler(async ({ data }) => {
    const result = await (await repository()).publishCar(data.id, data.published);
    await (
      await activity()
    ).notifyCarActivity(data.published ? "published" : "unpublished", [data.id]);
    return result;
  });
export const setCarSold = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, sold: z.boolean() }))
  .handler(async ({ data }) => {
    const result = await (await repository()).setCarSold(data.id, data.sold);
    await (await activity()).notifyCarActivity(data.sold ? "sold" : "unsold", [data.id]);
    return result;
  });
export const setCarDiscount = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, discountPrice: z.number().int().min(0).max(1e9).nullable() }))
  .handler(async ({ data }) => {
    const result = await (await repository()).setCarDiscount(data.id, data.discountPrice);
    await (await activity()).notifyCarActivity("discount", [data.id]);
    return result;
  });
const idsSchema = z.array(idSchema).min(1).max(500);
export const bulkCars = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ids: idsSchema,
      action: z.enum(["publish", "unpublish", "sold", "unsold", "delete", "discount"]),
      percent: z.number().int().min(0).max(90).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { carNames, notifyCarActivity } = await activity();
    const names = data.action === "delete" ? await carNames(data.ids) : undefined;
    const result = await (await repository()).bulkCars(data.ids, data.action, data.percent);
    const failed = new Set(result.failed.map((f) => f.id));
    const done = data.ids.filter((id) => !failed.has(id));
    const kind = (
      {
        publish: "published",
        unpublish: "unpublished",
        sold: "sold",
        unsold: "unsold",
        delete: "deleted",
        discount: "discount",
      } as const
    )[data.action];
    if (done.length)
      await notifyCarActivity(
        kind,
        done,
        names && done.length === data.ids.length ? names : undefined,
      );
    return result;
  });
export const completeCars = createServerFn({ method: "POST" })
  .validator(
    z.object({
      updates: z
        .array(
          z.object({
            id: idSchema,
            fields: carSchema
              .pick({
                name: true,
                model: true,
                version: true,
                year: true,
                price: true,
                price_on_request: true,
                km_value: true,
                fuel: true,
                gearbox: true,
                body: true,
                country: true,
                fiscal_power: true,
                description: true,
              })
              .partial()
              .strict(),
          }),
        )
        .min(1)
        .max(500),
    }),
  )
  .handler(async ({ data }) => {
    const result = await (await repository()).completeCars(data.updates);
    const failed = new Set(result.failed.map((f) => f.id));
    const done = data.updates.map((u) => u.id).filter((id) => !failed.has(id));
    if (done.length) await (await activity()).notifyCarActivity("edited", done);
    return result;
  });
export const shareCars = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ids: z.array(idSchema).min(1).max(100),
      targets: z
        .array(z.enum(["facebook", "instagram"]))
        .min(1)
        .max(2),
    }),
  )
  .handler(async ({ data }) => (await repository()).shareCars(data.ids, data.targets));
export const setVitrine = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(idSchema).max(100) }))
  .handler(async ({ data }) => (await repository()).setVitrine(data.ids));
export const reorderCars = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(idSchema).min(1).max(2000) }))
  .handler(async ({ data }) => (await repository()).reorderCars(data.ids));
export const listFacebookSync = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).facebookSync(),
);
export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).dashboardStats(),
);
/** Public: one page view of a vehicle (called once per browser session). */
export const recordCarView = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().min(1).max(200) }))
  .handler(async ({ data }) => (await repository()).recordCarView(data.slug));
/* Facebook / Instagram (social-publish Edge Function). */
export const getSocialStatus = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).socialStatus(),
);
export const connectSocial = createServerFn({ method: "POST" })
  .validator(
    z.object({ code: z.string().min(1).max(2000), redirectUri: z.string().url().max(300) }),
  )
  .handler(async ({ data }) => (await repository()).socialConnect(data.code, data.redirectUri));
export const selectSocialPage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pageId: z
        .string()
        .regex(/^[0-9]+$/)
        .max(40),
    }),
  )
  .handler(async ({ data }) => (await repository()).socialSelectPage(data.pageId));
export const disconnectSocial = createServerFn({ method: "POST" }).handler(async () =>
  (await repository()).socialDisconnect(),
);
export const listSocialPosts = createServerFn({ method: "GET" })
  .validator(z.object({ carId: idSchema }))
  .handler(async ({ data }) => (await repository()).socialPosts(data.carId));
export const retrySocialShare = createServerFn({ method: "POST" })
  .validator(z.object({ carId: idSchema }))
  .handler(async ({ data }) => (await repository()).retryShare(data.carId));
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

/* Facebook → website (import inbox). */
const postIdSchema = z.string().regex(/^[0-9_]{5,80}$/);
export const listFacebookInbox = createServerFn({ method: "GET" }).handler(async () =>
  (await repository()).facebookInbox(),
);
export const syncFacebook = createServerFn({ method: "POST" }).handler(async () =>
  (await repository()).syncFacebook(),
);
export const decideFacebookPost = createServerFn({ method: "POST" })
  .validator(
    z.object({
      postId: postIdSchema,
      status: z.enum(["new", "imported", "dismissed"]),
      carId: idSchema.nullable().optional(),
    }),
  )
  .handler(async ({ data }) =>
    (await repository()).decideFacebookPost(data.postId, data.status, data.carId ?? null),
  );
export const importFacebookPost = createServerFn({ method: "POST" })
  .validator(
    z.object({
      postId: postIdSchema,
      brand: z.string().trim().min(1).max(200),
      model: z.string().trim().min(1).max(200),
      version: z.string().trim().max(200),
      year: z.number().int().min(1950).max(2100),
      km_value: z.number().int().min(0).max(1e8),
      fuel: z.string().trim().min(1).max(200),
      gearbox: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(200),
      country: z.string().trim().min(1).max(200),
      fiscal_power: z.number().int().min(0).max(100).nullable(),
      price: z.number().int().min(0).max(1e9),
      description: z.string().max(20000),
      photos: z.array(z.string().url().max(2000)).max(40),
      publish: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const result = await (await repository()).importFacebookPost(data);
    await (await activity()).notifyCarActivity("added", [result.carId]);
    return result;
  });
