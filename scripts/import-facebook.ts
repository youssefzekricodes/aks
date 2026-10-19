// One-off import of the Facebook page listings (Apify scrape) into the site.
//
//   npm run import:facebook -- [--preview] [--dry-run] [--dataset-file <apify-export.json>]
//   (listings: scripts/data/facebook-listings.json, or --listings <file>)
//
// For each listing it:
//   1. takes the photos of the newest post of that car (from the Apify dataset:
//      APIFY_TOKEN in .env, or a JSON export passed with --dataset-file),
//   2. downloads them, keeps JPEG/WebP only, uploads them to R2 under
//      vehicles/YYYY/MM/<uuid>.<ext> (the key format the site expects) and reads
//      each one back to check its size,
//   3. creates the vehicle as a DRAFT (not published, no Facebook/Instagram post),
//      so the team can check it and publish the ones still for sale.
//
// Re-running is safe: a listing whose vehicle already exists (same slug) is skipped,
// and photo keys are derived from the listing so a re-upload overwrites, never duplicates.
// Values the posts don't give are left to fill in: the admin list tags those vehicles.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { r2, serviceClient } from "./lib/service.ts";

/** Stored when a post doesn't say; the admin "À compléter" tag looks for these. */
const TO_FILL = "À préciser";
const UNKNOWN_YEAR = 1900;
const MAX_PHOTOS = 12;
const MAX_BYTES = 4_000_000;

type Listing = {
  listing_id: string;
  status: "ok" | "review" | "fix";
  title: string;
  brand: string;
  model: string | null;
  trim: string | null;
  year: number | null;
  first_registration: string | null;
  mileage_km: number | null;
  fuel: string | null;
  fiscal_hp: number | null;
  gearbox: string | null;
  price_tnd: number | null;
  options: string | null;
  origin: string | null;
  last_posted_on: string;
  source_post_ids: string[];
  issues: string[];
};
type Media = {
  __typename?: string;
  id?: string;
  thumbnail?: string;
  photo_image?: { uri?: string };
  image?: { uri?: string };
  preferred_thumbnail?: { image?: { uri?: string } };
  thumbnailImage?: { uri?: string };
};
type Post = { postId?: string; media?: Media[] };

const { values: args } = parseArgs({
  options: {
    listings: { type: "string", default: "scripts/data/facebook-listings.json" },
    "dataset-file": { type: "string" },
    "dataset-id": { type: "string" },
    "dry-run": { type: "boolean", default: false },
    /** Print the mapped vehicles and stop (no network, nothing written). */
    preview: { type: "boolean", default: false },
    report: { type: "string", default: "import-facebook-report.json" },
  },
});

const doc = JSON.parse(readFileSync(args.listings!, "utf8")) as {
  source: { apify_dataset_id: string };
  listings: Listing[];
};

/* ------------------------------------------------------------ field mapping */

const FUELS: Record<string, string> = {
  Essence: "Essence",
  Diesel: "Diesel",
  "Hybride essence": "Hybride",
  "Hybride diesel": "Hybride",
  "Hybride rechargeable essence": "Hybride rechargeable",
  "Hybride rechargeable diesel": "Hybride rechargeable",
  Électrique: "Électrique",
};

const gearbox = (value: string | null) =>
  !value ? TO_FILL : /^auto/i.test(value) ? "Auto" : /^manu/i.test(value) ? "Manuelle" : TO_FILL;

const ORIGINS: [RegExp, string][] = [
  [/allemagne/i, "Germany"],
  [/france/i, "France"],
  [/italie/i, "Italy"],
  [/espagne/i, "Spain"],
  [/belgique|europe/i, TO_FILL],
];
const origin = (value: string | null) =>
  (value && ORIGINS.find(([pattern]) => pattern.test(value))?.[1]) || TO_FILL;

/** Body type by model (posts never state it). Unknown models are left to fill in. */
const BODIES: [RegExp, string][] = [
  [/^(amarok|d-max|hilux)/i, "Pick-up"],
  [/^(partner|combo|caddy|berlingo|express)/i, "Utilitaire"],
  [/^(rio|picanto|500|up|polo|qq)/i, "Citadine"],
  [/^(golf|a3|m[ée]gane|classe a)/i, "Compacte"],
  [/^4\d\di/i, "Coupé"],
  [/^(c \d|e \d|[35]\d\di|a4|elantra|passat)/i, "Berline"],
  [/^(sportage|seltos|tucson|zs|gla|gle|tiggo|h6|rav4|juke|tivoli|tiguan|ateca|jimny)/i, "SUV"],
];
const body = (model: string | null) =>
  (model && BODIES.find(([pattern]) => pattern.test(model))?.[1]) || TO_FILL;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const frDate = (iso: string) => iso.split("-").reverse().join("/");

function description(l: Listing) {
  const lines = [];
  if (l.first_registration)
    lines.push(`Première mise en circulation : ${frDate(l.first_registration)}.`);
  if (l.options)
    lines.push(`Équipements : ${l.options.replace(/TOUT OPTIONS/i, "toutes options")}.`);
  return lines.join("\n");
}

function toCar(l: Listing) {
  const model = l.model?.trim() || "";
  const version = l.trim?.trim() || "";
  const name = [model, version].filter(Boolean).join(" ") || "Modèle à préciser";
  return {
    slug: `${slugify(`${l.brand} ${name} ${l.year ?? ""}`)}-${l.listing_id.slice(-12, -6)}`,
    brand: l.brand,
    model,
    version,
    name,
    country: origin(l.origin),
    year: l.year ?? UNKNOWN_YEAR,
    // The posts don't give prices: shown as "Contactez-nous" until a price is set.
    price: l.price_tnd ?? 0,
    price_on_request: !l.price_tnd,
    km_value: l.mileage_km ?? 0,
    fuel: (l.fuel && FUELS[l.fuel]) || TO_FILL,
    gearbox: gearbox(l.gearbox),
    body: body(l.model),
    state: "Occasion",
    fiscal_power: l.fiscal_hp,
    description: description(l),
    published: false,
    sold: false,
    social_caption: "",
    social_targets: [],
  };
}

/* ------------------------------------------------------------ photos */

async function loadPosts(): Promise<Map<string, Post>> {
  let items: Post[];
  if (args["dataset-file"]) {
    items = JSON.parse(readFileSync(args["dataset-file"], "utf8")) as Post[];
  } else {
    const token = process.env["APIFY_TOKEN"];
    if (!token)
      throw new Error(
        "Set APIFY_TOKEN in .env, or export the Apify dataset as JSON and pass --dataset-file.",
      );
    const id = args["dataset-id"] ?? doc.source.apify_dataset_id;
    items = [];
    for (let offset = 0; ; offset += 100) {
      const url = new URL(`https://api.apify.com/v2/datasets/${id}/items`);
      for (const [k, v] of Object.entries({
        format: "json",
        clean: "1",
        fields: "postId,media",
        offset: String(offset),
        limit: "100",
      }))
        url.searchParams.set(k, v);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 404)
        throw new Error(`Apify dataset ${id} no longer exists: re-run the scraper (--dataset-id).`);
      if (!response.ok) throw new Error(`Apify: HTTP ${response.status} ${await response.text()}`);
      const page = (await response.json()) as Post[];
      items.push(...page);
      if (page.length < 100) break;
    }
  }
  return new Map(items.filter((i) => i.postId).map((i) => [String(i.postId), i]));
}

/** Photos of the newest post that has any, else a video's cover image. */
function photoUrls(l: Listing, posts: Map<string, Post>) {
  for (const id of l.source_post_ids) {
    const seen = new Set<string>();
    const urls = (posts.get(id)?.media ?? [])
      .filter((m) => m.__typename === "Photo")
      .filter((m) => !m.id || (!seen.has(m.id) && seen.add(m.id)))
      .map((m) => m.photo_image?.uri ?? m.image?.uri ?? m.thumbnail)
      .filter((url): url is string => Boolean(url));
    if (urls.length) return urls.slice(0, MAX_PHOTOS);
  }
  for (const id of l.source_post_ids) {
    const video = posts.get(id)?.media?.find((m) => m.__typename === "Video");
    const url =
      video?.preferred_thumbnail?.image?.uri ??
      video?.thumbnailImage?.uri ??
      video?.image?.uri ??
      video?.thumbnail;
    if (url) return [url];
  }
  return [];
}

function imageType(data: Uint8Array) {
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return { ext: "jpg", type: "image/jpeg" };
  const ascii = (from: number, to: number) => String.fromCharCode(...data.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

/** Regional Facebook caches (e.g. scontent.ftpa1-1.fna.fbcdn.net) don't resolve everywhere. */
const FALLBACK_HOST = "scontent.xx.fbcdn.net";

async function fetchPhoto(url: string) {
  const headers = { "User-Agent": "Mozilla/5.0" };
  try {
    return await fetch(url, { headers });
  } catch (error) {
    const fallback = new URL(url);
    if (!fallback.host.endsWith(".fbcdn.net") || fallback.host === FALLBACK_HOST) throw error;
    fallback.host = FALLBACK_HOST;
    return fetch(fallback, { headers });
  }
}

async function download(url: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetchPhoto(url);
      if ([403, 404, 410].includes(response.status))
        throw new Error(`HTTP ${response.status} (lien Facebook expiré ?)`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = new Uint8Array(await response.arrayBuffer());
      const kind = imageType(data);
      if (!kind) throw new Error("pas une image JPEG/WebP");
      if (data.length < 2_000 || data.length > MAX_BYTES)
        throw new Error(`taille refusée (${data.length} o)`);
      return { data, ...kind };
    } catch (error) {
      if (attempt >= 3 || String(error).includes("HTTP 4") || String(error).includes("image"))
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
}

/** Stable UUID-shaped id per listing photo, so re-runs overwrite instead of duplicating. */
function photoKey(l: Listing, index: number, ext: string) {
  const h = createHash("sha256").update(`facebook:${l.listing_id}:${index}`).digest("hex");
  const uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  const [y, m] = l.last_posted_on.split("-");
  return `vehicles/${y}/${m}/${uuid}.${ext}`;
}

/* ------------------------------------------------------------ run */

type Result = {
  listing_id: string;
  title: string;
  status: "created" | "exists" | "dry_run" | "failed";
  slug?: string;
  photos?: number;
  photo_errors?: string[];
  error?: string;
  issues?: string[];
};

if (args.preview) {
  for (const l of doc.listings) {
    const car = toCar(l);
    const fill = Object.entries(car)
      .filter(([, v]) => v === TO_FILL || v === UNKNOWN_YEAR)
      .map(([k]) => k);
    console.log(
      `${l.status.padEnd(6)} ${car.slug.padEnd(48)} ${car.body.padEnd(10)} ${car.fuel.padEnd(20)} ${car.gearbox.padEnd(10)} ${fill.join(",")}`,
    );
  }
  process.exit(0);
}

const supabase = serviceClient();
const storage = r2();
const posts = await loadPosts();
console.log(`${posts.size} posts Facebook chargés, ${doc.listings.length} véhicules à importer.`);

const { data: last } = await supabase
  .from("cars")
  .select("sort_order")
  .order("sort_order", { ascending: false })
  .limit(1);
let order = (last?.[0]?.sort_order ?? 0) + 1;

// Newest posts first in the list.
const listings = [...doc.listings].sort((a, b) => b.last_posted_on.localeCompare(a.last_posted_on));
const results: Result[] = [];

for (const l of listings) {
  const car = toCar(l);
  const result: Result = {
    listing_id: l.listing_id,
    title: l.title,
    slug: car.slug,
    status: "failed",
    issues: l.issues,
  };
  results.push(result);
  try {
    const { data: existing, error: existsError } = await supabase
      .from("cars")
      .select("id")
      .eq("slug", car.slug)
      .maybeSingle();
    if (existsError) throw existsError;
    if (existing) {
      result.status = "exists";
      console.log(`= ${l.title} (déjà importé)`);
      continue;
    }

    const keys: string[] = [];
    result.photo_errors = [];
    for (const [index, url] of photoUrls(l, posts).entries()) {
      try {
        const photo = await download(url);
        const key = photoKey(l, index, photo.ext);
        if (!args["dry-run"]) {
          const put = await storage.client.fetch(`${storage.bucketUrl}/${key}`, {
            method: "PUT",
            body: photo.data,
            headers: {
              "content-type": photo.type,
              "cache-control": "public, max-age=31536000, immutable",
            },
          });
          if (!put.ok) throw new Error(`R2 PUT ${put.status}`);
          const head = await storage.client.fetch(`${storage.bucketUrl}/${key}`, {
            method: "HEAD",
          });
          if (!head.ok || Number(head.headers.get("content-length")) !== photo.data.length)
            throw new Error("vérification R2 échouée");
        }
        keys.push(key);
      } catch (error) {
        result.photo_errors.push(
          `photo ${index + 1}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
    result.photos = keys.length;

    if (args["dry-run"]) {
      result.status = "dry_run";
      console.log(`~ ${l.title}: ${keys.length} photo(s)`);
      continue;
    }

    const { data: created, error } = await supabase
      .from("cars")
      .insert({ ...car, sort_order: order++ })
      .select("id")
      .single();
    if (error) throw error;
    if (keys.length) {
      const { error: imageError } = await supabase
        .from("car_images")
        .insert(keys.map((object_key, position) => ({ car_id: created.id, object_key, position })));
      if (imageError) {
        await supabase.from("cars").delete().eq("id", created.id);
        throw imageError;
      }
    }
    result.status = "created";
    console.log(
      `✓ ${l.title}: ${keys.length} photo(s)${result.photo_errors.length ? ` (${result.photo_errors.length} en échec)` : ""}`,
    );
  } catch (error) {
    result.error = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`✗ ${l.title}: ${result.error}`);
  }
}

writeFileSync(args.report!, JSON.stringify(results, null, 2));
const count = (status: Result["status"]) => results.filter((r) => r.status === status).length;
const photoFailures = results.reduce((n, r) => n + (r.photo_errors?.length ?? 0), 0);
console.log(
  `\n${count("created")} créés, ${count("exists")} déjà présents, ${count("dry_run")} testés, ${count("failed")} en échec, ` +
    `${results.reduce((n, r) => n + (r.photos ?? 0), 0)} photos, ${photoFailures} photo(s) en échec. Rapport : ${args.report}`,
);
if (count("failed") || photoFailures) process.exitCode = 1;
