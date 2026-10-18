import "@tanstack/react-start/server-only";
import { formatKm, type Car } from "@/lib/cars";
import type { CarInput, Lead } from "@/features/catalog/types";
import {
  CONTENT_BY_KEY,
  CONTENT_FIELDS,
  validateContentValue,
} from "@/features/content/definition";
import { adminClient, checkOrigin } from "./auth";
import { failure, publicClient, type Db } from "./supabase";
import {
  deleteObjects,
  keyFromUrl,
  newKey,
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
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

/** Published cars for listings: first photo only, no description (keeps pages light). */
export async function carSummaries(): Promise<Car[]> {
  const { data, error } = await publicClient()
    .from("cars")
    .select(CAR_COLUMNS)
    .eq("published", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
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
  const { data: result, error } = await supabase
    .rpc("save_car", { p_car: fields, p_image_keys: keys })
    .single<{ car_id: string; removed_keys: string[] }>();
  if (error) failure(error, "Enregistrement impossible.");
  await deleteObjects(result.removed_keys ?? []);
  return { id: result.car_id };
}

export async function publishCar(id: string, published: boolean) {
  const supabase = await adminClient({ write: true });
  const { error } = await supabase.from("cars").update({ published }).eq("id", id);
  if (error) failure(error, "Mise à jour impossible.");
  return { ok: true };
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
