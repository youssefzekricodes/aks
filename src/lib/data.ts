// Compatibility facade; all persistence runs on the server.
export * from "@/features/catalog/catalog.functions";
export type { CarInput, Lead } from "@/features/catalog/types";
import { createUploadUrl } from "@/features/catalog/catalog.functions";

type UploadKind = "vehicle" | "brand" | "site";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
/** Limits on the file the user picks (before resizing). */
const MAX_SOURCE_BYTES = 15_000_000;

function loadImage(file: Blob) {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image illisible."));
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Traitement de l’image impossible."))),
      type,
      quality,
    ),
  );

function checkSource(file: File) {
  if (!ACCEPTED.includes(file.type))
    throw new Error(`« ${file.name} » : JPG, PNG ou WebP uniquement.`);
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error(`« ${file.name} » : fichier trop lourd (15 Mo maximum).`);
}

/** Vehicle photo: centred 4:3 crop, at most 1600 px wide, JPEG — the catalog format. */
export async function prepareVehiclePhoto(file: File): Promise<Blob> {
  checkSource(file);
  const image = await loadImage(file);
  const ratio = 4 / 3;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const sw = sourceRatio > ratio ? image.naturalHeight * ratio : image.naturalWidth;
  const sh = sourceRatio > ratio ? image.naturalHeight : image.naturalWidth / ratio;
  const width = Math.min(1600, Math.round(sw));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width / ratio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Traitement de l’image impossible.");
  context.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return toBlob(canvas, "image/jpeg", 0.85);
}

/**
 * Site images and logos keep their format and transparency; larger images are
 * scaled down (longest side `maxSide`). Logos must be PNG or WebP.
 */
export async function prepareImage(
  file: File,
  { maxSide = 2000, logo = false } = {},
): Promise<Blob> {
  checkSource(file);
  if (logo && file.type === "image/jpeg")
    throw new Error("Logo : PNG ou WebP avec fond transparent.");
  const image = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && file.size <= 2_000_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas, file.type === "image/jpeg" ? "image/jpeg" : "image/webp", 0.9);
}

/**
 * Uploads to R2 through a presigned URL from the server and returns the public
 * URL. `scope` is the brand slug or content field key. Progress is 0–1.
 */
export async function uploadImage(
  kind: UploadKind,
  blob: Blob,
  { scope = "", onProgress }: { scope?: string; onProgress?: (progress: number) => void } = {},
) {
  const { uploadUrl, publicUrl } = await createUploadUrl({
    data: {
      kind,
      contentType: blob.type as "image/jpeg" | "image/png" | "image/webp",
      size: blob.size,
      scope,
    },
  });
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", blob.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Envoi refusé par le stockage (${request.status}).`));
    // Network errors include a bucket without CORS for this site (see README → Cloudflare R2).
    request.onerror = () => reject(new Error("Envoi impossible : vérifiez votre connexion."));
    request.send(blob);
  });
  onProgress?.(1);
  return publicUrl;
}
