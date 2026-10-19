import { createFileRoute } from "@tanstack/react-router";
import { normalizeOrigin } from "@/lib/seo";
import { requestSiteOrigin } from "@/server/origin";
import type { Car } from "@/lib/cars";
import { facetOptions, filterCars } from "@/features/catalog/search";
import { brandBySlug } from "@/features/catalog/brands";
import { allLandings, POPULAR_BRANDS } from "@/features/seo/landings";

const escape = (value: string) => value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

type Entry = { path: string; lastmod?: string | undefined; images?: string[] };

/** Most recent change among these cars (W3C date, as Google expects). */
const newest = (cars: Car[]) =>
  cars
    .map((car) => car.updated_at)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)
    ?.slice(0, 10);

/**
 * Indexable pages only: home, catalogue, contact, brand pages with stock and
 * every published vehicle with its photos (image sitemap extension). Filtered
 * searches and empty brand pages are noindex and left out on purpose.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = requestSiteOrigin(request, normalizeOrigin(process.env["APP_ORIGIN"]));
        const cars = await (await import("@/server/repository")).carSummaries();
        const latest = newest(cars);
        const entries: Entry[] = [
          { path: "/", lastmod: latest },
          { path: "/recherche", lastmod: latest },
          { path: "/marques", lastmod: latest },
          { path: "/contact" },
          { path: "/voitures-occasion-sfax", lastmod: latest },
          { path: "/faq" },
          { path: "/confidentialite" },
          { path: "/suppression-des-donnees" },
          // Brand pages: in stock, or searched brands (indexed with an "on request" text).
          ...[
            ...new Set([
              ...facetOptions(cars, {}, "marque").map((brand) => brand.value),
              ...POPULAR_BRANDS.filter((slug) => brandBySlug(slug)),
            ]),
          ].map((slug) => ({
            path: `/marques/${slug}`,
            lastmod: newest(cars.filter((car) => facetMatches(car, slug))),
          })),
          // Search landing pages ("SUV d'occasion à Sfax"…) that have vehicles.
          ...allLandings()
            .map((landing) => ({ landing, matching: filterCars(cars, landing.filters) }))
            .filter(({ matching }) => matching.length > 0)
            .map(({ landing, matching }) => ({ path: landing.path, lastmod: newest(matching) })),
          ...cars.map((car) => ({
            path: `/vehicule/${car.slug}`,
            lastmod: car.updated_at?.slice(0, 10),
            images: car.images,
          })),
        ];

        const absolute = (url: string) => (url.startsWith("http") ? url : origin + url);
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map((entry) =>
    [
      "  <url>",
      `    <loc>${escape(origin + entry.path)}</loc>`,
      entry.lastmod && `    <lastmod>${entry.lastmod}</lastmod>`,
      ...(entry.images ?? []).map(
        (image) =>
          `    <image:image><image:loc>${escape(absolute(image))}</image:loc></image:image>`,
      ),
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  )
  .join("\n")}
</urlset>
`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

/** Same brand grouping as the facets (aliases included). */
function facetMatches(car: Car, slug: string) {
  return facetOptions([car], {}, "marque").some((option) => option.value === slug);
}
