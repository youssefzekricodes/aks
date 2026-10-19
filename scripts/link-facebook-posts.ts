// One-off: records the Facebook post each imported vehicle came from, so the admin
// "Facebook" column shows it as published (with a link) and the automatic sharing
// never posts the same vehicle on the Page a second time.
//   npm run facebook:link-posts [-- --dry-run]
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { serviceClient } from "./lib/service.ts";

const { values: args } = parseArgs({
  options: {
    listings: { type: "string", default: "scripts/data/facebook-listings.json" },
    "dry-run": { type: "boolean", default: false },
    /** Only these listings (comma-separated listing ids). */
    only: { type: "string" },
  },
});

type Listing = {
  listing_id: string;
  title: string;
  brand: string;
  model: string | null;
  trim: string | null;
  year: number | null;
  source_post_ids: string[];
};
const doc = JSON.parse(readFileSync(args.listings!, "utf8")) as {
  source: { apify_dataset_id?: string; apify_dataset_ids?: string[] };
  listings: Listing[];
};

// Same slug as scripts/import-facebook.ts.
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const slugOf = (l: Listing) => {
  const name =
    [l.model?.trim() || "", l.trim?.trim() || ""].filter(Boolean).join(" ") || "Modèle à préciser";
  return `${slugify(`${l.brand} ${name} ${l.year ?? ""}`)}-${l.listing_id.slice(-12, -6)}`;
};

const token = process.env["APIFY_TOKEN"];
if (!token) throw new Error("APIFY_TOKEN manquant dans .env.");
type ScrapedPost = { postId?: string; url?: string; topLevelUrl?: string };
const posts = new Map<string, ScrapedPost>();
for (const id of doc.source.apify_dataset_ids ?? [doc.source.apify_dataset_id!]) {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${id}/items?format=json&clean=1&fields=postId,url,topLevelUrl,facebookUrl&limit=1000`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Apify : HTTP ${response.status}`);
  for (const p of (await response.json()) as ScrapedPost[])
    if (p.postId) posts.set(String(p.postId), p);
}

const supabase = serviceClient();
let linked = 0;
const skipped: string[] = [];
const only = args.only?.split(",");
for (const l of doc.listings.filter((l) => !only || only.includes(l.listing_id))) {
  const { data: car } = await supabase
    .from("cars")
    .select("id")
    .eq("slug", slugOf(l))
    .maybeSingle();
  if (!car) {
    skipped.push(`${l.title} (véhicule supprimé)`);
    continue;
  }
  const { data: existing } = await supabase
    .from("social_posts")
    .select("id")
    .eq("car_id", car.id)
    .eq("platform", "facebook")
    .in("status", ["pending", "published"])
    .limit(1);
  if (existing?.length) continue; // already recorded or posted by the site
  const postId = l.source_post_ids[0]!; // newest post of this car
  const post = posts.get(postId);
  const permalink = post?.topLevelUrl ?? post?.url ?? null;
  const pageId = permalink?.match(/facebook\.com\/(\d+)\/posts\//)?.[1];
  if (args["dry-run"]) {
    console.log(`~ ${l.title}: ${permalink ?? "(lien inconnu)"}`);
    linked++;
    continue;
  }
  const { error } = await supabase.from("social_posts").insert({
    car_id: car.id,
    platform: "facebook",
    status: "published",
    external_id: pageId ? `${pageId}_${postId}` : postId,
    permalink: permalink?.startsWith("https://") ? permalink : null,
  });
  if (error) skipped.push(`${l.title} (${error.message})`);
  else linked++;
}
console.log(
  `${linked} publication(s) Facebook ${args["dry-run"] ? "à enregistrer" : "enregistrées"}` +
    (skipped.length ? `, ignorées : ${skipped.join(", ")}` : "."),
);
