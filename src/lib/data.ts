// Compatibility facade; all persistence runs on the server.
export * from "@/features/catalog/catalog.functions";
export type { CarInput, Lead } from "@/features/catalog/types";
export function readFileAsDataUrl(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2_000_000)
    return Promise.reject(new Error("Choisissez une image JPG, PNG ou WebP de moins de 2 Mo."));
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture impossible."));
    reader.readAsDataURL(file);
  });
}

/** Crop vehicle photos to the catalog's 4:3 format before they are stored. */
export async function readVehicleImageAsDataUrl(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2_000_000)
    throw new Error("Choisissez une image JPG, PNG ou WebP de moins de 2 Mo.");

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Lecture impossible."));
      element.src = sourceUrl;
    });
    const targetRatio = 4 / 3;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const sourceWidth =
      sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
    const sourceHeight =
      sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    const width = Math.min(1600, Math.round(sourceWidth));
    const height = Math.round(width / targetRatio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Traitement de l’image impossible.");
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
