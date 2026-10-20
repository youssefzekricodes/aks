import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button, Modal, Slider } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Crop, Minus, Plus, RotateCcw } from "@/components/icons";
import { cn } from "@/lib/utils";
import { t } from "./i18n";

/** A crop shape offered to the user; `aspect: null` keeps the picture's own proportions. */
export type CropFormat = { id: string; label: string; aspect: number | null };

export type CropOptions = {
  title: string;
  /** First one is selected by default. */
  formats: CropFormat[];
  /** Output is scaled down to this width (never up). */
  maxWidth: number;
  /** "keep": PNG/WebP sources stay transparent (WebP), JPEG stays JPEG. */
  type: "image/jpeg" | "keep";
  /** Logos: allow zooming out so the whole picture fits, with transparent margins. */
  allowMargins?: boolean;
  hint?: string;
};

export const CROP_PRESETS = {
  vehicle: {
    title: "Recadrer la photo",
    formats: [{ id: "4:3", label: "4:3 (annonces)", aspect: 4 / 3 }],
    maxWidth: 1600,
    type: "image/jpeg",
    hint: "Les photos des annonces sont toutes au format 4:3.",
  },
  banner: {
    title: "Recadrer la photo de la bannière",
    formats: [
      { id: "16:9", label: "16:9", aspect: 16 / 9 },
      { id: "21:9", label: "21:9 (panoramique)", aspect: 21 / 9 },
      { id: "3:2", label: "3:2", aspect: 3 / 2 },
      { id: "original", label: "Original", aspect: null },
    ],
    maxWidth: 2400,
    type: "image/jpeg",
    hint: "Sur petits écrans, les bords gauche et droit sont coupés : gardez le sujet au centre.",
  },
  bannerMobile: {
    title: "Recadrer la photo mobile",
    formats: [
      { id: "4:5", label: "4:5", aspect: 4 / 5 },
      { id: "9:16", label: "9:16 (plein écran)", aspect: 9 / 16 },
      { id: "3:4", label: "3:4", aspect: 3 / 4 },
      { id: "1:1", label: "Carré", aspect: 1 },
    ],
    maxWidth: 1080,
    type: "image/jpeg",
    hint: "Format portrait : le titre et la recherche s’affichent par-dessus, gardez le sujet en haut ou au centre.",
  },
  logo: {
    title: "Ajuster le logo",
    formats: [
      { id: "original", label: "Original", aspect: null },
      { id: "3:1", label: "Large 3:1", aspect: 3 },
      { id: "1:1", label: "Carré", aspect: 1 },
    ],
    maxWidth: 800,
    type: "keep",
    allowMargins: true,
  },
  avatar: {
    title: "Recadrer votre photo",
    formats: [{ id: "1:1", label: "Carré", aspect: 1 }],
    maxWidth: 320,
    type: "image/jpeg",
    hint: "Votre visage au centre : la photo s’affiche dans un cercle.",
  },
  favicon: {
    title: "Recadrer l’icône",
    formats: [{ id: "1:1", label: "Carré", aspect: 1 }],
    maxWidth: 256,
    type: "keep",
    allowMargins: true,
  },
} satisfies Record<string, CropOptions>;

/**
 * The photo grid loads saved photos without CORS, and browsers reuse that cached
 * copy (no CORS headers) for a CORS request, which then fails. A distinct URL
 * gives the editor its own CORS-enabled copy.
 */
const corsUrl = (url: string) =>
  /^https?:/.test(url) ? `${url}${url.includes("?") ? "&" : "?"}cors=1` : url;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // R2 sends CORS headers for GET: the canvas stays exportable.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("Image illisible.")));
    image.src = src;
  });

/** Draws the selected area, scaled to at most `maxWidth`, into a new file. */
async function render(
  src: string,
  area: Area,
  options: CropOptions,
  sourceType: string,
): Promise<Blob> {
  const image = await loadImage(src);
  const scale = Math.min(1, options.maxWidth / area.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error(t("Traitement de l’image impossible."));
  const jpeg = options.type === "image/jpeg" || sourceType === "image/jpeg";
  if (jpeg) {
    // Zoomed out beyond the picture: fill margins with white rather than black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const type = jpeg ? "image/jpeg" : "image/webp";
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(t("Traitement de l’image impossible.")))),
      type,
      jpeg ? 0.86 : 0.92,
    ),
  );
}

/**
 * Crop editor: drag to place the picture, zoom to resize it, choose the format.
 * `source` is a picked File or the URL of a saved picture; closing returns null.
 */
export function ImageCropDialog({
  source,
  options,
  onCancel,
  onConfirm,
}: {
  source: File | string | null;
  options: CropOptions;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState(1);
  const [format, setFormat] = useState(options.formats[0]!);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minZoom = options.allowMargins ? 0.5 : 1;

  // Object URL for a picked file (revoked when the dialog closes).
  useEffect(() => {
    setFormat(options.formats[0]!);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
    if (!source) return setSrc(null);
    if (typeof source === "string") return setSrc(corsUrl(source));
    const url = URL.createObjectURL(source);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [source, options]);

  const aspect = format.aspect ?? natural;
  const sourceType = typeof source === "string" ? guessType(source) : (source?.type ?? "");

  async function confirm() {
    if (!src || !area) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(await render(src, area, options, sourceType));
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : t("Recadrage impossible. Réessayez avec une autre image."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal.Backdrop
      isOpen={source !== null}
      onOpenChange={(open) => !open && !pending && onCancel()}
      isDismissable={!pending}
    >
      <Modal.Container placement="auto" scroll="inside">
        <Modal.Dialog className="sm:max-w-3xl">
          <Modal.CloseTrigger aria-label={t("Fermer")} />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent">
              <Crop className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>{t(options.title)}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              {t("Faites glisser l’image pour la placer, zoomez pour la redimensionner.")}
              {options.hint ? ` ${t(options.hint)}` : ""}
            </p>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <div
              className={cn(
                "relative h-[min(60vh,26rem)] overflow-hidden rounded-xl",
                // Dark checkerboard: logos are light (made for the dark header); shows transparency.
                options.type === "keep"
                  ? "bg-[repeating-conic-gradient(#27272a_0%_25%,#3f3f46_0%_50%)] bg-[length:20px_20px]"
                  : "bg-zinc-900",
              )}
            >
              {src && (
                <Cropper
                  image={src}
                  crop={crop}
                  zoom={zoom}
                  minZoom={minZoom}
                  maxZoom={4}
                  aspect={aspect}
                  restrictPosition={!options.allowMargins}
                  objectFit="contain"
                  showGrid
                  keyboardStep={10}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setArea(pixels)}
                  onMediaLoaded={(media) => setNatural(media.naturalWidth / media.naturalHeight)}
                  mediaProps={{ crossOrigin: "anonymous", alt: t("Image à recadrer") }}
                  style={{ cropAreaStyle: { border: "2px solid white" } }}
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span id="crop-zoom-label" className="font-medium text-foreground">
                    {t("Zoom")}
                  </span>
                  <span className="tabular-nums text-muted">{Math.round(zoom * 100)} %</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={t("Dézoomer")}
                    onPress={() => setZoom((z) => Math.max(minZoom, z - 0.1))}
                  >
                    <Minus className="size-4" aria-hidden />
                  </Button>
                  <Slider
                    aria-labelledby="crop-zoom-label"
                    minValue={minZoom}
                    maxValue={4}
                    step={0.01}
                    value={zoom}
                    onChange={(value) => setZoom(value as number)}
                    className="min-w-0 flex-1"
                  >
                    <Slider.Track>
                      <Slider.Fill />
                      <Slider.Thumb />
                    </Slider.Track>
                  </Slider>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={t("Zoomer")}
                    onPress={() => setZoom((z) => Math.min(4, z + 0.1))}
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
              >
                <RotateCcw className="size-4" aria-hidden />
                {t("Recentrer")}
              </Button>
            </div>

            {options.formats.length > 1 && (
              <div role="group" aria-label={t("Format")} className="flex flex-wrap gap-2">
                {options.formats.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === format.id}
                    onClick={() => setFormat(item)}
                    className={buttonVariants({
                      size: "sm",
                      variant: item.id === format.id ? "primary" : "secondary",
                    })}
                  >
                    {t(item.label)}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" isDisabled={pending} onPress={onCancel}>
              {t("Annuler")}
            </Button>
            <Button isPending={pending} isDisabled={!area} onPress={() => void confirm()}>
              {pending ? t("Enregistrement…") : t("Appliquer")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

const guessType = (url: string) =>
  /\.png($|\?)/i.test(url) ? "image/png" : /\.webp($|\?)/i.test(url) ? "image/webp" : "image/jpeg";
