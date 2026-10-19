import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Modal, toast } from "@heroui/react";
import { Trash2, ImagePlus } from "@/components/icons";
import { setAvatar } from "@/features/auth/auth.functions";
import { uploadImage } from "@/lib/data";
import { CROP_PRESETS, ImageCropDialog } from "./ImageCropDialog";
import { sessionQueryKey } from "./model";
import { AdminAvatar, FilePickButton } from "./ui";

/** "Ma photo": choose, crop (square) and save the signed-in admin's profile photo. */
export function AvatarDialog({
  email,
  url,
  isOpen,
  onOpenChange,
}: {
  email: string;
  url: string | null | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(next: string | null) {
    await setAvatar({ data: { url: next } });
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  }

  async function upload(blob: Blob) {
    setSource(null);
    setBusy(true);
    try {
      await save(await uploadImage("avatar", blob));
      toast.success("Photo de profil enregistrée.");
      onOpenChange(false);
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Envoi de la photo impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await save(null);
      toast.success("Photo de profil retirée.");
      onOpenChange(false);
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal.Backdrop
        isOpen={isOpen && !source}
        onOpenChange={(open) => !busy && onOpenChange(open)}
      >
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-sm">
            <Modal.CloseTrigger aria-label="Fermer" />
            <Modal.Header>
              <Modal.Heading>Ma photo</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                Affichée dans l’administration, à côté de votre compte.
              </p>
            </Modal.Header>
            <Modal.Body className="grid justify-items-center gap-4 py-2">
              <AdminAvatar email={email} url={url} className="size-28 text-4xl" />
              <p className="max-w-full truncate text-sm text-muted">{email}</p>
            </Modal.Body>
            <Modal.Footer className="grid grid-cols-1 gap-2 sm:flex">
              {url && (
                <Button
                  variant="danger-soft"
                  className="w-full sm:w-auto"
                  isDisabled={busy}
                  onPress={() => void remove()}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Retirer
                </Button>
              )}
              <FilePickButton
                variant="primary"
                fullWidth
                isDisabled={busy}
                accept={["image/jpeg", "image/png", "image/webp"]}
                onSelect={([file]) => file && setSource(file)}
              >
                <ImagePlus className="size-4" aria-hidden />
                {busy ? "Enregistrement…" : url ? "Changer la photo" : "Choisir une photo"}
              </FilePickButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <ImageCropDialog
        source={source}
        options={CROP_PRESETS.avatar}
        onCancel={() => setSource(null)}
        onConfirm={upload}
      />
    </>
  );
}
