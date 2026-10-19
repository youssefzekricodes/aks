// Replaces the 5 imported Facebook photos of each recent vehicle with its full gallery.
//
//   npm run galleries:update -- [--dry-run] [--link-only]
//
// Sources (Apify, ids recorded in the listings file; APIFY_TOKEN in .env):
//   posts dataset   – each post's first 5 photos (used to recognise its photo batch)
//   photos dataset  – every photo of the page (720×960)
// Photos uploaded together get nearly consecutive Facebook ids, so the page's photo
// stream is split into upload batches and each batch goes to the post whose 5 known
// photos it contains (same method as the migration kit's migrate_to_r2.py).
//
// Only listings with in_migration_scope = true are updated; older ones keep their photos.
// A vehicle whose photos were changed in the admin since the import is left alone.
// Every photo is copied to R2 first (kept in scripts/data/gallery-manifest.json), then
// linked to the vehicle. If the database still allows only 12 photos per vehicle, the
// first 12 are linked; run again with --link-only after the 40-photo migration.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { r2, serviceClient } from "./lib/service.ts";

const { values: args } = parseArgs({
  options: {
    listings: { type: "string", default: "scripts/data/facebook-listings.json" },
    manifest: { type: "string", default: "scripts/data/gallery-manifest.json" },
    "dry-run": { type: "boolean", default: false },
    "link-only": { type: "boolean", default: false },
    /** Only these listings (comma-separated listing ids). */
    only: { type: "string" },
    /** Photo batches no post claims, placed by hand: {"<any photo id of the batch>": "<listing id>"}. */
    assignments: { type: "string", default: "scripts/data/photo-assignments.json" },
  },
});

type Listing = {
  listing_id: string;
  title: string;
  brand: string;
  model: string | null;
  trim: string | null;
  year: number | null;
  last_posted_on: string;
  source_post_ids: string[];
  in_migration_scope?: boolean;
};
type Media = {
  __typename?: string;
  id?: string | number;
  thumbnail?: string;
  photo_image?: { uri?: string };
  image?: { uri?: string };
};
type Post = { postId?: string; media?: Media[] };
type PagePhoto = { id?: string; url?: string; image?: string };

const doc = JSON.parse(readFileSync(args.listings!, "utf8")) as {
  source: {
    apify_dataset_id?: string;
    apify_dataset_ids?: string[];
    apify_photos_dataset_id?: string;
    apify_photos_dataset_ids?: string[];
  };
  listings: Listing[];
};
const manifest: Record<string, string[]> = existsSync(args.manifest!)
  ? JSON.parse(readFileSync(args.manifest!, "utf8"))
  : {};
const saveManifest = () => writeFileSync(args.manifest!, JSON.stringify(manifest, null, 2));

/* ---------------------------------------------------------------- same slug as the import */

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function slugOf(l: Listing) {
  const name =
    [l.model?.trim() || "", l.trim?.trim() || ""].filter(Boolean).join(" ") || "Modèle à préciser";
  return `${slugify(`${l.brand} ${name} ${l.year ?? ""}`)}-${l.listing_id.slice(-12, -6)}`;
}

/** Deterministic UUID-shaped key, so re-runs overwrite rather than duplicate. */
function keyFor(seed: string, postedOn: string, ext: string) {
  const h = createHash("sha256").update(seed).digest("hex");
  const uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  const [y, m] = postedOn.split("-");
  return `vehicles/${y}/${m}/${uuid}.${ext}`;
}
/** Keys the first import gave this listing's photos (to tell untouched galleries apart). */
const importedKeys = (l: Listing) =>
  new Set(
    Array.from({ length: 12 }, (_, i) =>
      ["jpg", "webp"].map((ext) => keyFor(`facebook:${l.listing_id}:${i}`, l.last_posted_on, ext)),
    ).flat(),
  );

/* ---------------------------------------------------------------- Apify */

async function items<T>(datasetId: string, fields: string): Promise<T[]> {
  const token = process.env["APIFY_TOKEN"];
  if (!token) throw new Error("APIFY_TOKEN manquant dans .env.");
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);
    url.search = new URLSearchParams({
      format: "json",
      clean: "1",
      fields,
      offset: String(offset),
      limit: "500",
    }).toString();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404)
      throw new Error(`Le dataset Apify ${datasetId} n’existe plus : relancez le scraper.`);
    if (!response.ok) throw new Error(`Apify : HTTP ${response.status}`);
    const page = (await response.json()) as T[];
    all.push(...page);
    if (page.length < 500) return all;
  }
}

/* ---------------------------------------------------------------- photo matching */

// Facebook ids exceed 2^53: BigInt throughout.
const BATCH_SPLIT = 500n * 10n ** 6n; // a larger gap starts a new upload batch
const SESSION_JOIN = 20_000n * 10n ** 6n; // an unclaimed batch this close joins its neighbour

function fbidOf(photo: PagePhoto): bigint | null {
  let id: string | null = null;
  try {
    id = new URL(photo.url ?? "").searchParams.get("fbid");
  } catch {
    id = null;
  }
  if (!id && photo.id) {
    try {
      id = Buffer.from(photo.id, "base64").toString("utf8").split(":").at(-1) ?? null;
    } catch {
      id = null;
    }
  }
  return id && /^\d+$/.test(id) ? BigInt(id) : null;
}

const knownPhotos = (post: Post | undefined) =>
  (post?.media ?? [])
    .filter((m) => m.__typename === "Photo" && /^\d+$/.test(String(m.id ?? "")))
    .map((m) => BigInt(String(m.id)));

const feedUrls = (post: Post | undefined) =>
  (post?.media ?? [])
    .filter((m) => m.__typename === "Photo")
    .map((m) => m.photo_image?.uri ?? m.image?.uri ?? m.thumbnail)
    .filter((url): url is string => Boolean(url));

/** {postId: photo URLs in the post's order} for posts whose batch checks out. */
function buildIndex(
  posts: Map<string, Post>,
  pagePhotos: PagePhoto[],
  assigned_by_hand: Map<bigint, string> = new Map(),
) {
  const stream = new Map<bigint, string>();
  for (const photo of pagePhotos) {
    const id = fbidOf(photo);
    if (id !== null && photo.image) stream.set(id, photo.image);
  }
  const ids = [...stream.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const batches: bigint[][] = [];
  for (const id of ids) {
    const last = batches.at(-1);
    if (last && id - last.at(-1)! <= BATCH_SPLIT) last.push(id);
    else batches.push([id]);
  }

  const known = new Map([...posts].map(([id, post]) => [id, knownPhotos(post)]));
  const ownerOf = new Map<bigint, string>();
  for (const [post, photos] of known) for (const photo of photos) ownerOf.set(photo, post);

  const claims = batches.map(
    (b) => new Set(b.flatMap((id) => (ownerOf.has(id) ? [ownerOf.get(id)!] : []))),
  );
  const resolved = claims.map((c) => (c.size === 1 ? [...c][0]! : null));
  // Batches placed by hand (checked by looking at the photos).
  batches.forEach((b, i) => {
    if (claims[i]!.size) return;
    const owner = b.map((id) => assigned_by_hand.get(id)).find(Boolean);
    if (owner) {
      claims[i] = new Set([owner]);
      resolved[i] = owner;
    }
  });
  claims.forEach((c, i) => {
    if (c.size) return;
    const near = new Set<string>();
    if (i > 0 && batches[i]![0]! - batches[i - 1]!.at(-1)! <= SESSION_JOIN && resolved[i - 1])
      near.add(resolved[i - 1]!);
    if (
      i + 1 < batches.length &&
      batches[i + 1]![0]! - batches[i]!.at(-1)! <= SESSION_JOIN &&
      resolved[i + 1]
    )
      near.add(resolved[i + 1]!);
    if (near.size === 1) resolved[i] = [...near][0]!;
  });

  const assigned = new Map<string, Set<bigint>>();
  const conflicted = new Set<string>();
  batches.forEach((b, i) => {
    if (claims[i]!.size > 1) claims[i]!.forEach((p) => conflicted.add(p));
    else if (resolved[i]) {
      const set = assigned.get(resolved[i]!) ?? new Set<bigint>();
      b.forEach((id) => set.add(id));
      assigned.set(resolved[i]!, set);
    }
  });

  const oldest = ids[0];
  const index = new Map<string, string[]>();
  const checks = new Map<string, string>();
  for (const [post, photos] of known) {
    const got = assigned.get(post) ?? new Set<bigint>();
    if (!photos.length) checks.set(post, "no_known_photos");
    else if (conflicted.has(post)) checks.set(post, "conflict");
    else if (oldest === undefined || photos.every((p) => p < oldest))
      checks.set(post, "not_covered");
    else {
      checks.set(post, photos.every((p) => got.has(p)) ? "verified" : "partial");
      if (got.size) {
        const rest = [...got]
          .filter((id) => !photos.includes(id))
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const order = [...photos.filter((p) => got.has(p)), ...rest];
        index.set(
          post,
          order.map((id) => stream.get(id)!),
        );
      }
    }
  }
  return { index, checks };
}

/* ---------------------------------------------------------------- download / upload */

const FALLBACK_HOST = "scontent.xx.fbcdn.net";
async function download(url: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      let response: Response;
      try {
        response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      } catch (error) {
        const fallback = new URL(url);
        if (!fallback.host.endsWith(".fbcdn.net")) throw error;
        fallback.host = FALLBACK_HOST;
        response = await fetch(fallback, { headers: { "User-Agent": "Mozilla/5.0" } });
      }
      if ([403, 404, 410].includes(response.status))
        throw new Error(`HTTP ${response.status} (lien expiré ?)`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = new Uint8Array(await response.arrayBuffer());
      const jpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
      const webp =
        String.fromCharCode(...data.subarray(0, 4)) === "RIFF" &&
        String.fromCharCode(...data.subarray(8, 12)) === "WEBP";
      if (!jpeg && !webp) throw new Error("pas une image JPEG/WebP");
      if (data.length < 2_000 || data.length > 4_000_000) throw new Error("taille refusée");
      return { data, ext: jpeg ? "jpg" : "webp", type: jpeg ? "image/jpeg" : "image/webp" };
    } catch (error) {
      if (attempt >= 3 || /HTTP 4|image|taille/.test(String(error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
}

async function pool<T>(tasks: (() => Promise<T>)[], size = 6) {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]!();
      }
    }),
  );
  return results;
}

/* ---------------------------------------------------------------- run */

const supabase = serviceClient();
const storage = r2();
const only = args.only?.split(",");
const scope = doc.listings.filter(
  (l) => l.in_migration_scope && (!only || only.includes(l.listing_id)),
);
console.log(
  `${scope.length} véhicules dans le périmètre (${doc.listings.length - scope.length} anciens ignorés).`,
);

if (!args["link-only"]) {
  const postIds = doc.source.apify_dataset_ids ?? [doc.source.apify_dataset_id!];
  const photoIds = doc.source.apify_photos_dataset_ids ?? [doc.source.apify_photos_dataset_id!];
  if (!photoIds[0]) throw new Error("Pas de dataset photos dans le fichier des annonces.");
  const posts = new Map<string, Post>();
  for (const id of postIds)
    for (const p of await items<Post>(id, "postId,media"))
      if (p.postId) posts.set(String(p.postId), p);
  const pagePhotos: PagePhoto[] = [];
  for (const id of photoIds) pagePhotos.push(...(await items<PagePhoto>(id, "id,url,image")));
  const byHand = new Map<bigint, string>(
    existsSync(args.assignments!)
      ? Object.entries(
          JSON.parse(readFileSync(args.assignments!, "utf8")) as Record<string, string>,
        )
          .filter(([key]) => /^\d+$/.test(key))
          .map(([key, listing]) => [BigInt(key), listing])
      : [],
  );
  const { index, checks } = buildIndex(posts, pagePhotos, byHand);
  console.log(`${posts.size} posts, ${pagePhotos.length} photos de la page.`);

  let total = 0;
  for (const l of scope) {
    if (manifest[l.listing_id]?.length) continue; // already copied
    const post = l.source_post_ids.find((id) => index.get(id)?.length);
    const urls = post
      ? index.get(post)!
      : feedUrls(posts.get(l.source_post_ids.find((id) => feedUrls(posts.get(id)).length) ?? ""));
    const check = post ? checks.get(post) : "first_5_only";
    if (args["dry-run"]) {
      console.log(`~ ${l.title}: ${urls.length} photos (${check})`);
      total += urls.length;
      continue;
    }
    const keys = await pool(
      urls.map((url, i) => async () => {
        try {
          const photo = await download(url);
          const key = keyFor(`facebook-full:${l.listing_id}:${i}`, l.last_posted_on, photo.ext);
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
          return key;
        } catch (error) {
          console.error(
            `  ✗ ${l.title} photo ${i + 1}: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    );
    const ok = keys.filter((k): k is string => Boolean(k));
    if (ok.length < urls.length) {
      console.error(
        `✗ ${l.title}: ${urls.length - ok.length} photo(s) en échec, relancez le script.`,
      );
      continue; // not recorded: the next run retries the whole set
    }
    manifest[l.listing_id] = ok;
    saveManifest();
    total += ok.length;
    console.log(`↑ ${l.title}: ${ok.length} photos copiées (${check})`);
  }
  console.log(`${total} photos ${args["dry-run"] ? "trouvées" : "copiées dans R2"}.`);
  if (args["dry-run"]) process.exit(0);
}

/* Link the copied photos to the vehicles. */
const summary = { full: 0, capped: 0, skipped: [] as string[], missing: [] as string[] };
for (const l of scope) {
  const keys = manifest[l.listing_id];
  if (!keys?.length) continue;
  const { data: car } = await supabase
    .from("cars")
    .select("id")
    .eq("slug", slugOf(l))
    .maybeSingle();
  if (!car) {
    summary.missing.push(l.title);
    continue;
  }
  const { data: current } = await supabase
    .from("car_images")
    .select("object_key, position")
    .eq("car_id", car.id)
    .order("position");
  const old = (current ?? []).map((row) => row.object_key as string);
  if (old.length === keys.length && old.every((k, i) => k === keys[i])) {
    summary.full += 1;
    continue; // already done
  }
  const imported = importedKeys(l);
  const touched = old.some((k) => !imported.has(k) && !keys.includes(k));
  if (touched) {
    summary.skipped.push(l.title);
    continue;
  }

  const link = async (list: string[]) => {
    await supabase.from("car_images").delete().eq("car_id", car.id);
    return supabase
      .from("car_images")
      .insert(list.map((object_key, position) => ({ car_id: car.id, object_key, position })));
  };
  let { error } = await link(keys);
  let capped = false;
  if (error?.code === "23514" && keys.length > 12) {
    ({ error } = await link(keys.slice(0, 12))); // database still limited to 12
    capped = true;
  }
  if (error) {
    // Put the previous photos back.
    await supabase.from("car_images").delete().eq("car_id", car.id);
    await supabase
      .from("car_images")
      .insert(old.map((object_key, position) => ({ car_id: car.id, object_key, position })));
    console.error(`✗ ${l.title}: ${error.message}`);
    continue;
  }
  // Remove the old 5 small photos from R2 (they are part of the new full set).
  const unused = old.filter((k) => !keys.includes(k));
  await Promise.all(
    unused.map((k) => storage.client.fetch(`${storage.bucketUrl}/${k}`, { method: "DELETE" })),
  );
  if (capped) summary.capped += 1;
  else summary.full += 1;
  console.log(`✓ ${l.title}: ${capped ? `12 / ${keys.length}` : keys.length} photos`);
}
console.log(
  `\n${summary.full} galeries complètes, ${summary.capped} limitées à 12 (migration 40 photos à exécuter), ` +
    `${summary.skipped.length} modifiées dans l’admin et laissées telles quelles${summary.skipped.length ? ` (${summary.skipped.join(", ")})` : ""}, ` +
    `${summary.missing.length} véhicules supprimés${summary.missing.length ? ` (${summary.missing.join(", ")})` : ""}.`,
);
