import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Tag } from "@/components/icons";
import { discountPercent, formatPrice } from "@/lib/cars";
import { cn } from "@/lib/utils";
import { plural, type AdminCar } from "./model";
import { t } from "./i18n";
import { IntegerField } from "./ui";

const PRESETS = [5, 10, 15, 20];

/**
 * Quick discount from the vehicle list: pick a percentage or type the new price.
 * `onSave(null)` removes the discount.
 */
export function DiscountDialog({
  car,
  isOpen,
  onOpenChange,
  onSave,
}: {
  car: AdminCar | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (discountPrice: number | null) => Promise<unknown>;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container placement="auto">
        <Modal.Dialog className="sm:max-w-md">
          {/* Remounted per vehicle so the field starts from its current discount. */}
          {car && (
            <DiscountForm
              key={car.id}
              car={car}
              onClose={() => onOpenChange(false)}
              onSave={onSave}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function DiscountForm({
  car,
  onClose,
  onSave,
}: {
  car: AdminCar;
  onClose: () => void;
  onSave: (discountPrice: number | null) => Promise<unknown>;
}) {
  const [value, setValue] = useState<number | null>(car.discount_price ?? null);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const hadDiscount = car.discount_price != null;
  const valid = value != null && value >= 0 && value < car.price;
  const percent = valid ? discountPercent({ price: car.price, discount_price: value }) : 0;

  async function submit(next: number | null, kind: "save" | "remove") {
    setPending(kind);
    try {
      await onSave(next);
      onClose();
    } catch {
      // Reported by the caller (toast); keep the dialog open to retry.
    } finally {
      setPending(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) void submit(value, "save");
      }}
    >
      <Modal.CloseTrigger aria-label={t("Fermer")} />
      <Modal.Header>
        <Modal.Icon className="bg-accent-soft text-accent">
          <Tag className="size-5" aria-hidden />
        </Modal.Icon>
        <Modal.Heading>
          {hadDiscount ? t("Modifier la remise") : t("Ajouter une remise")}
        </Modal.Heading>
        <p className="mt-1 text-sm text-muted">
          {car.brand} {car.name} · {t("prix actuel")}{" "}
          <span className="tabular font-medium text-foreground">{formatPrice(car.price)}</span>
        </p>
      </Modal.Header>
      <Modal.Body className="grid gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Remise rapide")}>
          {PRESETS.map((p) => {
            const price = Math.round((car.price * (100 - p)) / 100);
            const selected = valid && value === price;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setValue(price)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-foreground hover:bg-surface-secondary",
                )}
              >
                −{p} %
              </button>
            );
          })}
        </div>
        <IntegerField
          label={t("Nouveau prix (DT)")}
          value={value}
          onChange={setValue}
          minValue={0}
          maxValue={Math.max(0, car.price - 1)}
          description={
            valid ? (
              <>
                {t("Le site affichera")}{" "}
                <strong className="text-foreground">{formatPrice(value)}</strong> {t("et")}{" "}
                <del>{formatPrice(car.price)}</del> {t("barré (−{percent} %).", { percent })}
              </>
            ) : (
              t("Doit être inférieur au prix actuel.")
            )
          }
        />
      </Modal.Body>
      <Modal.Footer className="flex-wrap">
        {hadDiscount && (
          <Button
            variant="danger-soft"
            className="me-auto"
            isPending={pending === "remove"}
            isDisabled={pending !== null}
            onPress={() => void submit(null, "remove")}
          >
            {t("Retirer la remise")}
          </Button>
        )}
        <Button variant="tertiary" isDisabled={pending !== null} onPress={onClose}>
          {t("Annuler")}
        </Button>
        <Button
          type="submit"
          isPending={pending === "save"}
          isDisabled={!valid || pending !== null || value === car.discount_price}
        >
          {t("Enregistrer")}
        </Button>
      </Modal.Footer>
    </form>
  );
}

/** Same percentage off for several vehicles (0 removes their discount). */
export function BulkDiscountDialog({
  count,
  isOpen,
  onOpenChange,
  onApply,
}: {
  count: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApply: (percent: number) => Promise<unknown>;
}) {
  const [percent, setPercent] = useState<number | null>(10);
  const [pending, setPending] = useState<"apply" | "remove" | null>(null);

  async function submit(value: number, kind: "apply" | "remove") {
    setPending(kind);
    try {
      await onApply(value);
      onOpenChange(false);
    } catch {
      // Reported by the caller (toast).
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !pending && onOpenChange(open)}>
      <Modal.Container placement="auto">
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger aria-label={t("Fermer")} />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent">
              <Tag className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>
              {t("Remise sur {vehicles}", { vehicles: plural(count, "véhicule", "véhicules") })}
            </Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              {t(
                "Le pourcentage s’applique au prix de chaque véhicule. Les véhicules au prix masqué sont ignorés.",
              )}
            </p>
          </Modal.Header>
          <Modal.Body className="grid gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("Remise rapide")}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  aria-pressed={percent === p}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    percent === p
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-foreground hover:bg-surface-secondary",
                  )}
                >
                  −{p} %
                </button>
              ))}
            </div>
            <IntegerField
              label={t("Remise (%)")}
              value={percent}
              onChange={setPercent}
              minValue={1}
              maxValue={90}
            />
          </Modal.Body>
          <Modal.Footer className="flex-wrap">
            <Button
              variant="danger-soft"
              className="me-auto"
              isPending={pending === "remove"}
              isDisabled={pending !== null}
              onPress={() => void submit(0, "remove")}
            >
              {t("Retirer les remises")}
            </Button>
            <Button
              variant="tertiary"
              isDisabled={pending !== null}
              onPress={() => onOpenChange(false)}
            >
              {t("Annuler")}
            </Button>
            <Button
              isPending={pending === "apply"}
              isDisabled={!percent || pending !== null}
              onPress={() => percent && void submit(percent, "apply")}
            >
              {t("Appliquer −{percent} %", { percent: percent ?? 0 })}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
