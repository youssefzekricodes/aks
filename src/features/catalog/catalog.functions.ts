import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { carSchema, idSchema, leadSchema } from "./schemas";

export const listPublicCars = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/server/db/repository")).cars(),
);
export const listPublicSiteContent = createServerFn({ method: "GET" }).handler(async () =>
  Object.fromEntries(
    (await import("@/server/db/repository")).content().map((r) => [r.key, r.value]),
  ),
);
export const listAllCars = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/server/db/repository")).cars(true),
);
export const listSiteContent = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/server/db/repository")).content(true),
);
export const listLeads = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/server/db/repository")).leads(),
);
export const saveCar = createServerFn({ method: "POST" })
  .validator(carSchema)
  .handler(async ({ data }) => (await import("@/server/db/repository")).saveCar(data));
export const deleteCar = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => (await import("@/server/db/repository")).deleteCar(data.id));
export const setCarPublished = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, published: z.boolean() }))
  .handler(async ({ data }) =>
    (await import("@/server/db/repository")).publishCar(data.id, data.published),
  );
export const setLeadHandled = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema, handled: z.boolean() }))
  .handler(async ({ data }) =>
    (await import("@/server/db/repository")).handleLead(data.id, data.handled),
  );
export const saveSiteContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entries: z
        .array(z.object({ key: z.string().min(1).max(100), value: z.string().max(3_000_000) }))
        .max(400),
    }),
  )
  .handler(async ({ data }) => (await import("@/server/db/repository")).saveContent(data.entries));
const submitLead = createServerFn({ method: "POST" })
  .validator(leadSchema)
  .handler(async ({ data }) => (await import("@/server/db/repository")).createLead(data));
export const createLead = (data: z.input<typeof leadSchema>) => submitLead({ data });
export async function getPublicCar(slug: string) {
  return (await listPublicCars()).find((car) => car.slug === slug) ?? null;
}
