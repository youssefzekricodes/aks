import "@tanstack/react-start/server-only";
import { formatKm, slugify, type Car } from "@/lib/cars";
import type { CarInput, Lead } from "@/features/catalog/types";
import {
  CONTENT_BY_KEY,
  CONTENT_FIELDS,
  validateContentValue,
} from "@/features/content/definition";
import { getRequest } from "@tanstack/react-start/server";
import { buildSocialCaption, type SocialPlatform } from "@/features/catalog/social";
import { adminClient, callEdgeFunction, checkOrigin } from "./auth";
import { env } from "./env";
import { requestSiteOrigin } from "./origin";
import { failure, publicClient, type Db } from "./supabase";
import { parseListing, type ParsedListing } from "@/features/catalog/facebook-listing";
import {
  deleteObjects,
  keyFromUrl,
  newKey,
  putObject,
  presignUpload,
  publicUrl,
  UPLOAD_RULES,
  verifyObject,
  type UploadKind,
} from "./r2";

/* ------------------------------------------------------------------ cars */

type CarRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string | null;
  version: string | null;
  country: string;
  year: number;
  price: number | string;
  price_on_request: boolean;
  km_value: number;
  fuel: string;
  gearbox: string;
  body: string;
  state: string;
  transmission: string | null;
  doors: number | null;
  seats: number | null;
  fiscal_power: number | null;
  description: string;
  published: boolean;
  sold: boolean;
  discount_price: number | string | null;
  featured_rank?: number | null;
  social_caption?: string;
  social_targets?: ("facebook" | "instagram")[];
  sort_order: number;
  updated_at: string;
  car_images?: { object_key: string; position: number }[];
};

const CAR_COLUMNS = "*, car_images(object_key, position)";

function toCar(row: CarRow): Car {
  const images = [...(row.car_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => publicUrl(image.object_key));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    model: row.model ?? undefined,
    version: row.version ?? undefined,
    country: row.country,
    year: row.year,
    price: Number(row.price),
    price_on_request: row.price_on_request,
    km: formatKm(row.km_value),
    km_value: row.km_value,
    fuel: row.fuel,
    gearbox: row.gearbox,
    body: row.body,
    state: row.state,
    transmission: row.transmission ?? undefined,
    doors: row.doors,
    seats: row.seats,
    fiscal_power: row.fiscal_power,
    images,
    description: row.description,
    published: row.published,
    sold: row.sold ?? false,
    discount_price: row.discount_price == null ? null : Number(row.discount_price),
    featured_rank: row.featured_rank ?? null,
    social_caption: row.social_caption ?? "",
    social_targets: row.social_targets ?? [],
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

/** Published cars for listings: first photo only, no description (keeps pages light). */
export async function carSummaries(): Promise<Car[]> {
  const query = (withSold: boolean) => {
    const base = publicClient().from("cars").select(CAR_COLUMNS).eq("published", true);
    return (withSold ? base.eq("sold", false) : base)
      .order("sort_order")
      .order("created_at", { ascending: false });
  };
  let { data, error } = await query(true);
  // Before the "sales_views" migration there is no `sold` column: keep the site up.
  if (error?.code === "42703") {
    console.error(
      "Colonne cars.sold absente : exécutez la migration 20261019120000_sales_views.sql.",
    );
    ({ data, error } = await query(false));
  }
  if (error) failure(error, "Chargement des véhicules impossible.");
  return (data as unknown as CarRow[]).map((row) => {
    const car = toCar(row);
    return { ...car, images: car.images.slice(0, 1), description: "" };
  });
}

export async function publishedCar(slug: string): Promise<Car | null> {
  const { data, error } = await publicClient()
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) failure(error, "Chargement du véhicule impossible.");
  return data ? toCar(data as unknown as CarRow) : null;
}

/** Every car, drafts included (admins). */
export async function cars(): Promise<Car[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("cars")
    .select(CAR_COLUMNS)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) failure(error, "Chargement des véhicules impossible.");
  return (data as unknown as CarRow[]).map(toCar);
}

/** Photo URLs → R2 keys, each confirmed to exist and to respect the upload rules. */
async function imageKeys(urls: string[], kind: UploadKind) {
  const keys = urls.map((url) => {
    const key = keyFromUrl(url, kind);
    if (!key) throw new Error("Une photo ne provient pas du stockage du site.");
    return key;
  });
  if (new Set(keys).size !== keys.length) throw new Error("Une photo est en double.");
  await Promise.all(keys.map((key) => verifyObject(key, kind)));
  return keys;
}

export async function saveCar(data: CarInput) {
  const supabase = await adminClient({ write: true });
  const keys = await imageKeys(data.images, "vehicle");
  const { images: _images, km: _km, ...fields } = data;
  // A new vehicle goes first in the list (save_car picks the order when it is absent).
  const car = data.id ? fields : { ...fields, sort_order: undefined };
  const { data: result, error } = await supabase
    .rpc("save_car", { p_car: car, p_image_keys: keys })
    .single<{ car_id: string; removed_keys: string[] }>();
  if (error) failure(error, "Enregistrement impossible.");
  await deleteObjects(result.removed_keys ?? []);
  // Post text and networks (kept out of save_car so older databases still save).
  const { error: socialError } = await supabase
    .from("cars")
    .update({
      social_caption: data.social_caption ?? "",
      social_targets: data.social_targets ?? [],
    })
    .eq("id", result.car_id);
  if (socialError && !["42703", "PGRST204"].includes(socialError.code))
    failure(socialError, "Enregistrement des réseaux sociaux impossible.");
  return { id: result.car_id, social: await shareCar(supabase, result.car_id) };
}

/** Display order: these vehicles get 0, 1, 2… in this order. */
export async function reorderCars(ids: string[]) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.rpc("reorder_cars", { p_ids: ids });
  if (error) failure(error, "Réorganisation impossible.");
  return { ok: true };
}

export async function setCarSold(id: string, sold: boolean) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.from("cars").update({ sold }).eq("id", id);
  if (error) failure(error, "Mise à jour impossible.");
  // Best effort: "VENDU" on the vehicle's Facebook post (posts made by the site).
  if (sold)
    await callEdgeFunction("social-publish", { action: "mark-sold", carId: id }).catch(
      (problem: unknown) => console.error(problem),
    );
  return { ok: true };
}

/** Sets or removes (null) the discounted price; it must stay below the price. */
export async function setCarDiscount(id: string, discountPrice: number | null) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase
    .from("cars")
    .update({ discount_price: discountPrice })
    .eq("id", id);
  if (error?.code === "23514") throw new Error("Le prix remisé doit être inférieur au prix.");
  if (error) failure(error, "Mise à jour de la remise impossible.");
  return { ok: true };
}

export type BulkAction = "publish" | "unpublish" | "sold" | "unsold" | "delete" | "discount";
export type BulkResult = { done: number; failed: { id: string; error: string }[] };

/**
 * One action on several vehicles, reusing the single-vehicle functions so the
 * rules stay the same (Facebook/Instagram on publish, R2 cleanup on delete…).
 * `percent` is the discount (0 removes it); hidden prices are skipped.
 */
export async function bulkCars(
  ids: string[],
  action: BulkAction,
  percent = 0,
): Promise<BulkResult> {
  const result: BulkResult = { done: 0, failed: [] };
  let prices = new Map<string, { price: number; onRequest: boolean }>();
  if (action === "discount") {
    const supabase = await adminClient();
    const { data, error } = await supabase
      .from("cars")
      .select("id, price, price_on_request")
      .in("id", ids);
    if (error) failure(error, "Chargement des véhicules impossible.");
    prices = new Map(
      (data ?? []).map((row) => [
        row.id as string,
        { price: Number(row.price), onRequest: row.price_on_request as boolean },
      ]),
    );
  }
  for (const id of ids) {
    try {
      if (action === "publish" || action === "unpublish")
        await publishCar(id, action === "publish");
      else if (action === "sold" || action === "unsold") await setCarSold(id, action === "sold");
      else if (action === "delete") await deleteCar(id);
      else {
        const car = prices.get(id);
        if (!car) throw new Error("Véhicule introuvable.");
        if (percent > 0 && (car.onRequest || car.price <= 0))
          throw new Error("Prix masqué ou absent : remise impossible.");
        await setCarDiscount(
          id,
          percent > 0 ? Math.round((car.price * (100 - percent)) / 100) : null,
        );
      }
      result.done += 1;
    } catch (error) {
      result.failed.push({
        id,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
      });
    }
  }
  return result;
}

type CompletionField =
  | "name"
  | "model"
  | "version"
  | "year"
  | "price"
  | "price_on_request"
  | "km_value"
  | "fuel"
  | "gearbox"
  | "body"
  | "country"
  | "fiscal_power"
  | "description";
export type CarCompletion = {
  id: string;
  fields: { [K in CompletionField]?: CarInput[K] | undefined };
};

/** Saves the details filled in "Compléter les informations" (only the fields sent). */
export async function completeCars(updates: CarCompletion[]): Promise<BulkResult> {
  const supabase = await adminClient({ write: true });
  const result: BulkResult = { done: 0, failed: [] };
  for (const { id, fields } of updates) {
    try {
      const patch: Record<string, unknown> = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      );
      // A discount must stay below the price: drop it when the new price goes under.
      if (typeof fields.price === "number") {
        const { data } = await supabase.from("cars").select("discount_price").eq("id", id).single();
        if (data?.discount_price != null && Number(data.discount_price) >= fields.price)
          patch["discount_price"] = null;
      }
      const { error } = await supabase.from("cars").update(patch).eq("id", id);
      if (error) failure(error, "Enregistrement impossible.");
      result.done += 1;
    } catch (error) {
      result.failed.push({
        id,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
      });
    }
  }
  return result;
}

/** The home page showcase: these vehicles, in this order (the others leave it). */
export async function setVitrine(ids: string[]) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.rpc("set_vitrine", { p_ids: ids });
  if (error?.code === "PGRST202" || error?.code === "42883" || error?.code === "42703")
    throw new Error(
      "La vitrine n’est pas encore installée : exécutez la migration 20261019210000_vitrine.sql dans Supabase.",
    );
  if (error) failure(error, "Mise à jour de la vitrine impossible.");
  return { ok: true };
}

/** Counts a page view (published, unsold vehicles only; errors are ignored). */
export async function recordCarView(slug: string) {
  const { error } = await publicClient().rpc("record_car_view", { p_slug: slug });
  if (error && error.code !== "P0001") console.error(error);
  return { ok: true };
}

export type DashboardStats = {
  views: { carId: string; last30: number; total: number }[];
};

/** Page views per vehicle: last 30 days and all time (vehicle details come from the car list). */
export async function dashboardStats(): Promise<DashboardStats> {
  const supabase = await adminClient();
  // One row per vehicle and day: read every page (PostgREST caps a request at 1,000 rows).
  const data: { car_id: string; day: string; views: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("car_views")
      .select("car_id, day, views")
      .order("day")
      .order("car_id")
      .range(from, from + 999);
    if (error) failure(error, "Chargement des statistiques impossible.");
    data.push(...(page ?? []));
    if ((page ?? []).length < 1000) break;
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const byCar = new Map<string, { carId: string; last30: number; total: number }>();
  for (const row of data ?? []) {
    const id = row.car_id as string;
    const entry = byCar.get(id) ?? { carId: id, last30: 0, total: 0 };
    entry.total += row.views as number;
    if ((row.day as string) >= since) entry.last30 += row.views as number;
    byCar.set(id, entry);
  }
  return { views: [...byCar.values()] };
}

export async function publishCar(id: string, published: boolean) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.from("cars").update({ published }).eq("id", id);
  if (error) failure(error, "Mise à jour impossible.");
  return { ok: true, social: published ? await shareCar(supabase, id) : null };
}

/** Public address of the site (see siteOrigin: a local APP_ORIGIN is ignored in production). */
export function publicOrigin() {
  return requestSiteOrigin(getRequest(), env.appOrigin);
}

/* ------------------------------------------------------------------ Facebook / Instagram */

export type ShareResult = {
  started: SocialPlatform[];
  skipped: { platform: SocialPlatform; reason: string }[];
  error?: string;
};

/**
 * Asks the `social-publish` Edge Function to post a published, unsold vehicle on
 * the networks chosen in its form. Never throws: the vehicle is saved either way.
 */
async function shareCar(supabase: Db, id: string): Promise<ShareResult | null> {
  const { data: row } = await supabase
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("id", id)
    .maybeSingle<CarRow>();
  if (!row || !row.published || row.sold || !row.social_targets?.length) return null;
  const car = toCar(row);
  const url = `${publicOrigin()}/vehicule/${car.slug}`;
  try {
    return (await callEdgeFunction("social-publish", {
      action: "publish",
      carId: id,
      caption: car.social_caption?.trim() || buildSocialCaption(car, { url }),
      url,
      images: car.images.filter((src) => src.startsWith("https://")),
      targets: car.social_targets,
    })) as ShareResult;
  } catch (error) {
    console.error(error);
    return {
      started: [],
      skipped: [],
      error: error instanceof Error ? error.message : "Publication sur les réseaux impossible.",
    };
  }
}

/**
 * "Publier sur Facebook / Instagram" for vehicles already on the site: sets the
 * networks, then shares each one (a network where it is already posted is skipped).
 */
export async function shareCars(ids: string[], targets: SocialPlatform[]) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.from("cars").update({ social_targets: targets }).in("id", ids);
  if (error) failure(error, "Mise à jour impossible.");
  const results = await Promise.all(ids.map((id) => shareCar(supabase, id)));
  return {
    started: results.reduce((n, r) => n + (r?.started.length ?? 0), 0),
    skipped: results.flatMap((r) => r?.skipped ?? []),
    notOnSale: results.filter((r) => r === null).length,
    error: results.find((r) => r?.error)?.error ?? null,
  };
}

/** Retry: same as publishing again (failed posts are not "already published"). */
export async function retryShare(id: string) {
  const supabase = await adminClient({ write: true });
  return shareCar(supabase, id);
}

export type SocialPost = {
  platform: SocialPlatform;
  status: "pending" | "published" | "failed";
  permalink: string | null;
  error: string | null;
  createdAt: string;
};

/** Post history of a vehicle, newest first (empty before the "social" migration). */
export async function socialPosts(carId: string): Promise<SocialPost[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("platform, status, permalink, error, created_at")
    .eq("car_id", carId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((p) => ({
    platform: p.platform as SocialPlatform,
    status: p.status as SocialPost["status"],
    permalink: p.permalink as string | null,
    error: p.error as string | null,
    createdAt: p.created_at as string,
  }));
}

export type FacebookSync = {
  carId: string;
  status: SocialPost["status"];
  permalink: string | null;
  error: string | null;
};

/** Latest Facebook post of every vehicle (admin list column). */
export async function facebookSync(): Promise<FacebookSync[]> {
  const supabase = await adminClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("social_posts")
      .select("car_id, status, permalink, error, created_at")
      .eq("platform", "facebook")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error) return []; // before the "social" migration
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const latest = new Map<string, FacebookSync>();
  for (const row of rows) {
    const carId = row["car_id"] as string;
    if (latest.has(carId)) continue; // newest first
    latest.set(carId, {
      carId,
      status: row["status"] as FacebookSync["status"],
      permalink: (row["permalink"] as string | null) ?? null,
      error: (row["error"] as string | null) ?? null,
    });
  }
  return [...latest.values()];
}

export type SocialStatus = {
  /** Meta app credentials set on the Edge Function. */
  app: boolean;
  appId: string | null;
  loginConfigId?: string | null;
  facebook: { pageId: string; name: string; picture: string | null } | null;
  instagram: { username: string | null; picture: string | null } | null;
  /** Last read of the Page's posts (Import Facebook). */
  lastSyncedAt?: string | null;
  /** The Edge Function could not be reached (not deployed, migration missing…). */
  error?: string;
};

/** Connected Page / Instagram account (never any token). */
export async function socialStatus(): Promise<SocialStatus> {
  try {
    return (await callEdgeFunction(
      "social-publish",
      { action: "status" },
      { write: false },
    )) as SocialStatus;
  } catch (error) {
    return {
      app: false,
      appId: null,
      loginConfigId: null,
      facebook: null,
      instagram: null,
      error: error instanceof Error ? error.message : "Service indisponible.",
    };
  }
}

export type MetaPage = {
  id: string;
  name: string;
  picture: string | null;
  instagram: { id: string; username: string | null; picture: string | null } | null;
};

/** End of "Se connecter avec Facebook": exchanges the code, returns the Pages to choose from. */
export async function socialConnect(code: string, redirectUri: string) {
  return (await callEdgeFunction("social-publish", { action: "connect", code, redirectUri })) as {
    pages: MetaPage[];
  };
}

export async function socialSelectPage(pageId: string) {
  return callEdgeFunction("social-publish", { action: "select", pageId });
}

export async function socialDisconnect() {
  return callEdgeFunction("social-publish", { action: "disconnect" });
}

export async function deleteCar(id: string) {
  const supabase = await adminClient({ write: true });
  const { data: images } = await supabase.from("car_images").select("object_key").eq("car_id", id);
  const { error } = await supabase.from("cars").delete().eq("id", id);
  if (error) failure(error, "Suppression impossible.");
  await deleteObjects((images ?? []).map((image) => image.object_key as string));
  return { ok: true };
}

/* ------------------------------------------------------------------ uploads */

/**
 * Presigned upload for one file. `scope` is the brand slug or content field key
 * (it becomes part of the object key); vehicle photos are filed by date.
 */
export async function createUpload(
  kind: UploadKind,
  contentType: string,
  size: number,
  scope = "",
) {
  checkOrigin();
  await adminClient();
  const rule = UPLOAD_RULES[kind];
  if (!(rule.types as readonly string[]).includes(contentType))
    throw new Error("Format non autorisé.");
  if (size <= 0 || size > rule.maxBytes)
    throw new Error(`Fichier trop lourd (${Math.round(rule.maxBytes / 100_000) / 10} Mo maximum).`);
  const key = newKey(kind, contentType, scope);
  return { uploadUrl: await presignUpload(key, contentType, size), publicUrl: publicUrl(key), key };
}

/* ------------------------------------------------------------------ site content */

async function contentRows(client: Db) {
  const { data, error } = await client.from("site_content").select("key, value");
  if (error) failure(error, "Chargement du contenu impossible.");
  return new Map((data ?? []).map((row) => [row.key as string, row.value as string]));
}

function mergeDefaults(saved: Map<string, string>) {
  return CONTENT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: saved.get(field.key) ?? field.value,
  }));
}

export async function content() {
  return mergeDefaults(await contentRows(publicClient()));
}

export async function adminContent() {
  const supabase = await adminClient();
  return mergeDefaults(await contentRows(supabase));
}

export async function saveContent(entries: { key: string; value: string }[]) {
  const supabase = await adminClient({ write: true });
  const uploaded: string[] = [];
  for (const entry of entries) {
    const field = CONTENT_BY_KEY.get(entry.key);
    if (!field) throw new Error("Champ de contenu inconnu.");
    const problem = validateContentValue(field, entry.value);
    if (problem) throw new Error(problem);
    if (field.type === "image") {
      const key = keyFromUrl(entry.value, "site");
      if (key) uploaded.push(key);
    }
  }
  await Promise.all(uploaded.map((key) => verifyObject(key, "site")));

  // Images being replaced: remember their R2 keys to delete after the save.
  const imageKeys = entries
    .filter((e) => CONTENT_BY_KEY.get(e.key)?.type === "image")
    .map((e) => e.key);
  const { data: previous } = imageKeys.length
    ? await supabase.from("site_content").select("key, value").in("key", imageKeys)
    : { data: [] };

  const { error } = await supabase
    .from("site_content")
    .upsert(entries.map(({ key, value }) => ({ key, value })));
  if (error) failure(error, "Publication impossible.");

  const replaced = (previous ?? [])
    .map((row) => keyFromUrl(row.value as string, "site"))
    .filter((key): key is string => Boolean(key) && !uploaded.includes(key!));
  await deleteObjects(replaced);
  return { ok: true };
}

/* ------------------------------------------------------------------ leads */

/** Cloudflare Turnstile check; enforced only when TURNSTILE_SECRET_KEY is set. */
async function verifyTurnstile(token: string | undefined) {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) return;
  if (!token) throw new Error("Vérification anti-spam requise.");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  }).catch(() => null);
  const result = (await response?.json().catch(() => null)) as { success?: boolean } | null;
  if (!result?.success) throw new Error("Vérification anti-spam échouée. Veuillez réessayer.");
}

export async function createLead(data: {
  name: string;
  phone: string;
  email?: string | undefined;
  message?: string | undefined;
  car_slug?: string | undefined;
  turnstile_token?: string | undefined;
}) {
  checkOrigin();
  await verifyTurnstile(data.turnstile_token);
  const { error } = await publicClient().rpc("submit_lead", {
    p_name: data.name,
    p_phone: data.phone,
    p_email: data.email || null,
    p_message: data.message || null,
    p_car_slug: data.car_slug || null,
  });
  if (error) failure(error, "Envoi impossible.");
  return { ok: true };
}

export async function leads(): Promise<Lead[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, message, car_slug, handled, created_at")
    .order("created_at", { ascending: false });
  if (error) failure(error, "Chargement des demandes impossible.");
  return (data ?? []) as Lead[];
}

export async function handleLead(id: string, handled: boolean) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase
    .from("leads")
    .update({ handled, handled_at: handled ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) failure(error, "Mise à jour impossible.");
  return { ok: true };
}

export async function deleteLead(id: string) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) failure(error, "Suppression impossible.");
  return { ok: true };
}

/* ------------------------------------------------------------------ brand logos */

export async function brandLogos(): Promise<{ slug: string; url: string }[]> {
  const { data, error } = await publicClient()
    .from("brand_logos")
    .select("slug, object_key")
    .order("slug");
  if (error) failure(error, "Chargement des logos impossible.");
  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    url: publicUrl(row.object_key as string),
  }));
}

export async function saveBrandLogo(slug: string, url: string) {
  const supabase = await adminClient({ write: true });
  const key = keyFromUrl(url, "brand");
  if (!key || !key.startsWith(`brands/${slug}/`)) throw new Error("Logo non valide.");
  await verifyObject(key, "brand");
  const { data: previous } = await supabase
    .from("brand_logos")
    .select("object_key")
    .eq("slug", slug)
    .maybeSingle();
  const { error } = await supabase.from("brand_logos").upsert({ slug, object_key: key });
  if (error) failure(error, "Enregistrement du logo impossible.");
  if (previous && previous.object_key !== key) await deleteObjects([previous.object_key as string]);
  return { ok: true };
}

export async function deleteBrandLogo(slug: string) {
  const supabase = await adminClient({ write: true });
  const { data: previous } = await supabase
    .from("brand_logos")
    .select("object_key")
    .eq("slug", slug)
    .maybeSingle();
  const { error } = await supabase.from("brand_logos").delete().eq("slug", slug);
  if (error) failure(error, "Suppression du logo impossible.");
  if (previous) await deleteObjects([previous.object_key as string]);
  return { ok: true };
}

/* ------------------------------------------------------------------ brand settings */

export type BrandSetting = { slug: string; hidden: boolean; favoriteRank: number | null };

export async function brandSettings(): Promise<BrandSetting[]> {
  const { data, error } = await publicClient()
    .from("brand_settings")
    .select("slug, hidden, favorite_rank");
  // The site still works (everything visible, no favourites) before the migration runs.
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    hidden: row.hidden as boolean,
    favoriteRank: (row.favorite_rank as number | null) ?? null,
  }));
}

/** Upserts the given brands (e.g. one toggle, or every favourite after a reorder). */
export async function saveBrandSettings(settings: BrandSetting[]) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase
    .from("brand_settings")
    .upsert(
      settings.map((s) => ({ slug: s.slug, hidden: s.hidden, favorite_rank: s.favoriteRank })),
    );
  if (error) failure(error, "Enregistrement de la marque impossible.");
  return { ok: true };
}

/* ------------------------------------------------------------------ Facebook → website */

export type InboxStatus = "new" | "imported" | "dismissed";
export type InboxItem = {
  postId: string;
  postedAt: string;
  message: string;
  permalink: string | null;
  photos: string[];
  status: InboxStatus;
  carId: string | null;
  parsed: ParsedListing;
};

const inboxMissing = (code?: string) => code === "42P01" || code === "PGRST205";
const INBOX_MIGRATION =
  "L’import Facebook n’est pas encore installé : exécutez la migration 20261019220000_facebook_inbox.sql dans Supabase.";

/** Page posts read by the last syncs, newest first, with the vehicle read from their text. */
export async function facebookInbox(): Promise<{ items: InboxItem[]; installed: boolean }> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("facebook_inbox")
    .select("post_id, posted_at, message, permalink, photos, status, car_id")
    .order("posted_at", { ascending: false })
    .limit(300);
  if (inboxMissing(error?.code)) return { items: [], installed: false };
  if (error) failure(error, "Chargement des publications impossible.");
  return {
    installed: true,
    items: (data ?? []).map((row) => ({
      postId: row.post_id as string,
      postedAt: row.posted_at as string,
      message: row.message as string,
      permalink: (row.permalink as string | null) ?? null,
      photos: (row.photos as string[]) ?? [],
      status: row.status as InboxStatus,
      carId: (row.car_id as string | null) ?? null,
      parsed: parseListing(row.message as string),
    })),
  };
}

/** Reads the Page's recent posts into the inbox (social-publish Edge Function). */
export async function syncFacebook() {
  return (await callEdgeFunction("social-publish", { action: "sync" })) as {
    read: number;
    lastSyncedAt: string;
  };
}

export async function decideFacebookPost(
  postId: string,
  status: InboxStatus,
  carId: string | null = null,
) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.rpc("facebook_inbox_decide", {
    p_post_id: postId,
    p_status: status,
    p_car_id: carId,
  });
  if (inboxMissing(error?.code) || error?.code === "PGRST202") throw new Error(INBOX_MIGRATION);
  if (error) failure(error, "Mise à jour impossible.");
  return { ok: true };
}

export type FacebookImport = {
  postId: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  km_value: number;
  fuel: string;
  gearbox: string;
  body: string;
  country: string;
  fiscal_power: number | null;
  /** 0 = "Contactez-nous" on the site. */
  price: number;
  description: string;
  /** Chosen photos, in order (from the post's photos). */
  photos: string[];
  publish: boolean;
};

const FALLBACK_FB_HOST = "scontent.xx.fbcdn.net";

/** Downloads a Facebook photo (JPEG/WebP only); regional CDN hosts fall back to the main one. */
async function fetchFacebookPhoto(url: string) {
  const get = (target: string | URL) =>
    fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    });
  let response: Response;
  try {
    response = await get(url);
  } catch {
    const fallback = new URL(url);
    fallback.host = FALLBACK_FB_HOST;
    response = await get(fallback);
  }
  if ([403, 404, 410].includes(response.status))
    throw new Error("Lien de photo Facebook expiré : relancez la synchronisation puis réessayez.");
  if (!response.ok) throw new Error(`Photo Facebook indisponible (${response.status}).`);
  const data = new Uint8Array(await response.arrayBuffer()) as Uint8Array<ArrayBuffer>;
  const jpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const webp =
    String.fromCharCode(...data.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.subarray(8, 12)) === "WEBP";
  if (!jpeg && !webp) throw new Error("Une photo Facebook n’est ni JPEG ni WebP.");
  if (data.length > UPLOAD_RULES.vehicle.maxBytes) throw new Error("Photo Facebook trop lourde.");
  return { data, type: jpeg ? "image/jpeg" : "image/webp" };
}

/**
 * Creates a vehicle from a Page post: copies the chosen photos to R2, saves the
 * vehicle (first in the list), then marks the post imported and records it as the
 * vehicle's Facebook post (so it is never shared on the Page again).
 */
export async function importFacebookPost(input: FacebookImport) {
  const supabase = await adminClient({ write: true });
  const { data: row, error } = await supabase
    .from("facebook_inbox")
    .select("post_id, photos, status, posted_at")
    .eq("post_id", input.postId)
    .maybeSingle();
  if (inboxMissing(error?.code)) throw new Error(INBOX_MIGRATION);
  if (error) failure(error, "Publication introuvable.");
  if (!row) throw new Error("Publication introuvable.");
  if (row.status !== "new") throw new Error("Cette publication a déjà été traitée.");
  const allowed = new Set((row.photos as string[]) ?? []);
  const photos = input.photos.filter((url) => allowed.has(url)).slice(0, 40);

  // Photos first: nothing is saved if one can't be copied.
  const keys: string[] = new Array(photos.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(6, photos.length) }, async () => {
      while (next < photos.length) {
        const index = next++;
        const photo = await fetchFacebookPhoto(photos[index]!);
        const key = newKey("vehicle", photo.type);
        await putObject(key, photo.data, photo.type);
        keys[index] = key;
      }
    }),
  ).catch(async (problem: unknown) => {
    await deleteObjects(keys.filter(Boolean));
    throw problem;
  });

  const name = [input.model.trim(), input.version.trim()].filter(Boolean).join(" ") || input.model;
  const slugBase = [input.brand, name, input.year].join(" ");
  const car = {
    slug: `${slugify(slugBase)}-${input.postId.split("_").at(-1)!.slice(-12, -6) || "fb"}`,
    name,
    brand: input.brand.trim(),
    model: input.model.trim(),
    version: input.version.trim(),
    country: input.country,
    year: input.year,
    price: input.price,
    price_on_request: input.price <= 0,
    km_value: input.km_value,
    fuel: input.fuel,
    gearbox: input.gearbox,
    body: input.body,
    state: "Occasion",
    transmission: "",
    doors: null,
    seats: null,
    fiscal_power: input.fiscal_power,
    description: input.description,
    published: input.publish,
    sold: false,
    discount_price: null,
  };
  const { data: saved, error: saveError } = await supabase
    .rpc("save_car", { p_car: car, p_image_keys: keys })
    .single<{ car_id: string }>();
  if (saveError) {
    await deleteObjects(keys);
    failure(saveError, "Enregistrement du véhicule impossible.");
  }
  await decideFacebookPost(input.postId, "imported", saved.car_id);
  return { carId: saved.car_id, photos: keys.length };
}
