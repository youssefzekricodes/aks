import { useState } from "react";
import { Button, ProgressCircle, toast } from "@heroui/react";
import { DropZone, isFileDropItem } from "react-aria-components";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Crop,
  ImagePlus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { uploadImage } from "@/lib/data";
import { CROP_PRESETS, ImageCropDialog } from "./ImageCropDialog";
import type { PhotoUpload, usePhotoQueue } from "./hooks";
import { IMAGE_TYPES, MAX_PHOTOS, plural } from "./model";
import { FilePickButton, IconButton, StatusChip } from "./ui";

type Queue = ReturnType<typeof usePhotoQueue>;

/**
 * Vehicle photos: saved photos (URLs) first, then files being sent. Each file
 * becomes a tile immediately, with its own progress and error state.
 */
export function PhotoManager({
  images,
  onImagesChange,
  queue,
  originals,
  isDisabled,
}: {
  images: string[];
  onImagesChange: (update: (images: string[]) => string[]) => void;
  queue: Queue;
  /** Original files by photo URL (this session), used as the re-cropping source. */
  originals: Map<string, File>;
  isDisabled: boolean;
}) {
  const [cropping, setCropping] = useState<string | null>(null);

  /** Uploads the re-cropped photo and puts it in place of the old one. */
  async function replace(oldUrl: string, blob: Blob) {
    const url = await uploadImage("vehicle", blob);
    const original = originals.get(oldUrl);
    if (original) originals.set(url, original);
    onImagesChange((current) => current.map((u) => (u === oldUrl ? url : u)));
    toast.success("Photo recadrée. Enregistrez le véhicule pour l’appliquer sur le site.");
  }
  const used = images.length + queue.items.length;
  const remaining = Math.max(0, MAX_PHOTOS - used);
  const full = remaining === 0;

  function addFiles(files: File[]) {
    if (!files.length) return;
    if (full) {
      toast.danger(`Limite de ${MAX_PHOTOS} photos atteinte.`);
      return;
    }
    if (files.length > remaining)
      toast.warning(
        `Seules ${plural(remaining, "photo a été ajoutée", "photos ont été ajoutées")} : ${MAX_PHOTOS} photos maximum par véhicule.`,
      );
    queue.add(files.slice(0, remaining));
  }

  const move = (index: number, by: number) =>
    onImagesChange((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by]!, next[index]!];
      return next;
    });

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted" aria-live="polite">
        {images.length} / {MAX_PHOTOS} photos
        {queue.active > 0 && ` · ${plural(queue.active, "envoi en cours", "envois en cours")}`}
        {queue.failed > 0 && (
          <span className="text-danger"> · {plural(queue.failed, "échec", "échecs")}</span>
        )}
      </p>

      {used > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((url, index) => (
            <li
              key={url}
              className="overflow-hidden rounded-xl border border-separator bg-background"
            >
              <div className="relative">
                <img
                  src={url}
                  alt={`Photo ${index + 1}${index === 0 ? " (couverture)" : ""}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2">
                    <StatusChip tone="accent">Couverture</StatusChip>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex gap-1">
                  <IconButton
                    label={`Déplacer la photo ${index + 1} vers la gauche`}
                    icon={ArrowLeft}
                    isDisabled={index === 0 || isDisabled}
                    onPress={() => move(index, -1)}
                  />
                  <IconButton
                    label={`Déplacer la photo ${index + 1} vers la droite`}
                    icon={ArrowRight}
                    isDisabled={index === images.length - 1 || isDisabled}
                    onPress={() => move(index, 1)}
                  />
                </div>
                <div className="flex gap-1">
                  <IconButton
                    label={`Recadrer la photo ${index + 1}`}
                    icon={Crop}
                    isDisabled={isDisabled}
                    onPress={() => setCropping(url)}
                  />
                  <IconButton
                    label={`Retirer la photo ${index + 1}`}
                    icon={Trash2}
                    variant="danger-soft"
                    isDisabled={isDisabled}
                    onPress={() => onImagesChange((current) => current.filter((u) => u !== url))}
                  />
                </div>
              </div>
            </li>
          ))}
          {queue.items.map((item) => (
            <PendingTile
              key={item.id}
              item={item}
              onRetry={() => queue.retry(item.id)}
              onRemove={() => queue.remove(item.id)}
            />
          ))}
        </ul>
      )}

      <DropZone
        isDisabled={full || isDisabled}
        aria-label="Déposer des photos du véhicule"
        getDropOperation={(types) =>
          IMAGE_TYPES.some((type) => types.has(type)) ? "copy" : "cancel"
        }
        onDrop={async (event) => {
          const files = await Promise.all(
            event.items.filter(isFileDropItem).map((item) => item.getFile()),
          );
          addFiles(files);
        }}
        className={({ isDropTarget, isDisabled: disabled }) =>
          `flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus ${
            isDropTarget ? "border-accent bg-accent-soft" : "border-border bg-background"
          } ${disabled ? "opacity-60" : ""}`
        }
      >
        <ImagePlus className="size-6 text-muted" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          {full ? `Limite de ${MAX_PHOTOS} photos atteinte` : "Glissez vos photos ici"}
        </p>
        {!full && (
          <FilePickButton
            multiple
            size="sm"
            isDisabled={isDisabled}
            onSelect={addFiles}
            accept={IMAGE_TYPES}
          >
            Choisir des photos
          </FilePickButton>
        )}
        <p className="text-xs text-muted">
          JPG, PNG ou WebP · 15 Mo maximum par fichier · recadrage automatique au format 4:3
        </p>
      </DropZone>
      <ImageCropDialog
        source={cropping ? (originals.get(cropping) ?? cropping) : null}
        options={CROP_PRESETS.vehicle}
        onCancel={() => setCropping(null)}
        onConfirm={async (blob) => {
          await replace(cropping!, blob);
          setCropping(null);
        }}
      />
    </div>
  );
}

function PendingTile({
  item,
  onRetry,
  onRemove,
}: {
  item: PhotoUpload;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const percent = item.progress === null ? null : Math.round(item.progress * 100);
  const label =
    item.status === "queued"
      ? "En attente…"
      : item.status === "working"
        ? percent === null
          ? "Préparation…"
          : `Envoi ${percent} %`
        : "Échec de l’envoi";
  return (
    <li
      className={`overflow-hidden rounded-xl border bg-background ${
        item.status === "error" ? "border-danger" : "border-separator"
      }`}
    >
      <div className="relative">
        <img
          src={item.preview}
          alt={`Photo en cours d’envoi : ${item.name}`}
          className="aspect-[4/3] w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 p-2 text-center">
          {item.status === "error" ? (
            <>
              <AlertCircle className="size-6 text-danger" aria-hidden />
              <p className="line-clamp-3 text-xs font-medium text-danger" role="alert">
                {item.error}
              </p>
            </>
          ) : (
            <>
              <ProgressCircle
                size="md"
                aria-label={`${item.name} : ${label}`}
                {...(percent === null || item.status === "queued"
                  ? { isIndeterminate: true }
                  : { value: percent })}
              >
                <ProgressCircle.Track>
                  <ProgressCircle.TrackCircle />
                  <ProgressCircle.FillCircle />
                </ProgressCircle.Track>
              </ProgressCircle>
              <p className="text-xs font-medium text-foreground">{label}</p>
            </>
          )}
        </div>
      </div>
      {item.status === "error" ? (
        <div className="grid grid-cols-2 gap-1 p-2">
          <Button size="sm" variant="secondary" fullWidth onPress={onRetry}>
            <RotateCw className="size-4" aria-hidden />
            Réessayer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            fullWidth
            onPress={onRemove}
            aria-label={`Retirer ${item.name}`}
          >
            Retirer
          </Button>
        </div>
      ) : (
        <p className="truncate p-2 text-xs leading-8 text-muted" title={item.name}>
          {item.name}
        </p>
      )}
    </li>
  );
}
