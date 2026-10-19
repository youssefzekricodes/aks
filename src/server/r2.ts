import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { env } from "./env";

/**
 * Cloudflare R2 (S3 API). Credentials stay on the server: browsers only get
 * short-lived presigned PUT URLs for one exact key, type and size.
 *
 * Object keys:
 *   vehicles/{yyyy}/{mm}/{uuid}.{ext}   car photos
 *   brands/{brand-slug}/{uuid}.{ext}    uploaded brand logos
 *   site/{field}/{uuid}.{ext}           CMS images (logo, favicon, hero…)
 */
export const UPLOAD_RULES = {
  vehicle: { types: ["image/jpeg", "image/webp"], maxBytes: 4_000_000 },
  brand: { types: ["image/png", "image/webp"], maxBytes: 400_000 },
  site: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 3_000_000 },
  /** Administrator profile photo (square, resized in the browser). */
  avatar: { types: ["image/jpeg", "image/webp"], maxBytes: 500_000 },
} as const;
export type UploadKind = keyof typeof UPLOAD_RULES;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const KEY_PATTERNS: Record<UploadKind, RegExp> = {
  vehicle: /^vehicles\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/,
  brand: /^brands\/[a-z0-9-]+\/[0-9a-f-]{36}\.(png|webp)$/,
  site: /^site\/[a-z0-9_.-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/,
  avatar: /^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/,
};

let client: AwsClient | undefined;
function r2() {
  const { accessKeyId, secretAccessKey } = env.r2;
  return (client ??= new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  }));
}
const objectUrl = (key: string) =>
  `https://${env.r2.accountId}.r2.cloudflarestorage.com/${env.r2.bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

export const publicUrl = (key: string) => `${env.r2.publicUrl}/${key}`;

/** Inverse of publicUrl for keys of a given kind; null for anything else. */
export function keyFromUrl(url: string, kind: UploadKind) {
  const prefix = `${env.r2.publicUrl}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return KEY_PATTERNS[kind].test(key) ? key : null;
}

export function newKey(kind: UploadKind, contentType: string, scope = "") {
  const ext = EXT[contentType];
  if (!ext) throw new Error("Type de fichier non autorisé.");
  const id = randomUUID();
  if (kind === "vehicle") {
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `vehicles/${now.getUTCFullYear()}/${month}/${id}.${ext}`;
  }
  if (kind === "avatar") return `avatars/${scope}/${id}.${ext}`; // scope: the admin's id
  return `${kind === "brand" ? "brands" : "site"}/${scope}/${id}.${ext}`;
}

/** Presigned PUT valid 5 minutes, locked to the exact content type and size. */
export async function presignUpload(key: string, contentType: string, size: number) {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", "300");
  const signed = await r2().sign(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": contentType, "content-length": String(size) },
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signed.url;
}

/** Server-side upload (photos copied from Facebook), checked like a browser upload. */
export async function putObject(key: string, body: Uint8Array<ArrayBuffer>, contentType: string) {
  const response = await r2().fetch(objectUrl(key), {
    method: "PUT",
    body,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
  if (!response.ok) throw new Error(`Envoi de la photo impossible (R2 ${response.status}).`);
}

/** HEAD an uploaded object: confirms it exists and matches the allowed type/size. */
export async function verifyObject(key: string, kind: UploadKind) {
  const response = await r2().fetch(objectUrl(key), { method: "HEAD" });
  if (!response.ok) throw new Error("Une photo n’a pas été envoyée correctement. Réessayez.");
  const type = response.headers.get("content-type") ?? "";
  const size = Number(response.headers.get("content-length") ?? 0);
  const rule = UPLOAD_RULES[kind];
  if (!(rule.types as readonly string[]).includes(type) || size <= 0 || size > rule.maxBytes)
    throw new Error("Fichier refusé : type ou taille non autorisés.");
}

/** Best effort: a failed delete only leaves an orphan for scripts/r2-cleanup.ts. */
export async function deleteObjects(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const response = await r2().fetch(objectUrl(key), { method: "DELETE" });
        if (!response.ok && response.status !== 404)
          console.error("R2 delete failed", key, response.status);
      } catch (error) {
        console.error("R2 delete failed", key, error);
      }
    }),
  );
}
