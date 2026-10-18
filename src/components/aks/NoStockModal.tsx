import { useNavigate } from "@tanstack/react-router";
import { Button, Modal } from "@heroui/react";
import { useSiteText } from "@/lib/site-content";
import { BodyIcon } from "./BodyIcon";
import { BrandLogo } from "./BrandLogo";

export type NoStockItem = { kind: "body" | "brand"; label: string };

/** Shown when a visitor picks a body type or brand that has no vehicle in stock. */
export function NoStockModal({ item, onClose }: { item: NoStockItem | null; onClose: () => void }) {
  const text = useSiteText();
  const navigate = useNavigate();

  const goToContact = () => {
    onClose();
    navigate({ to: "/contact" });
  };

  return (
    <Modal isOpen={item !== null} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="flex-col items-center gap-3 text-center">
              {item?.kind === "body" && <BodyIcon body={item.label} className="h-12" />}
              {item?.kind === "brand" && (
                <BrandLogo brand={item.label} wordmark={false} size={44} />
              )}
              <Modal.Heading>{item?.label}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="text-center text-muted">
              {item?.kind === "brand"
                ? text(
                    "brands.no_stock",
                    "Aucun véhicule de cette marque n’est actuellement disponible.",
                  )
                : text(
                    "bodies.no_stock",
                    "Aucun véhicule n’est actuellement disponible dans cette catégorie.",
                  )}
            </Modal.Body>
            <Modal.Footer className="flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="primary" onPress={goToContact}>
                {text("bodies.no_stock_contact", "Nous contacter")}
              </Button>
              <Button variant="secondary" slot="close">
                Fermer
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
