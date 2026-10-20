import { useMemo, useState } from "react";
import { Button, Input, Label, Modal, TextArea, TextField, toast } from "@heroui/react";
import { Check, ClipboardList, ImagePlus } from "@/components/icons";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  carImage,
  COUNTRY_LABELS,
  GEARBOX_LABELS,
} from "@/lib/cars";
import { completeCars } from "@/lib/data";
import { fieldsToFill, plural, toOptions, type AdminCar } from "./model";
import { ConfirmDialog, IntegerField, SelectField } from "./ui";
import { t } from "./i18n";

type Fields = {
  name?: string;
  model?: string;
  year?: number;
  price?: number;
  price_on_request?: boolean;
  km_value?: number;
  fuel?: string;
  gearbox?: string;
  body?: string;
  country?: string;
  fiscal_power?: number | null;
  description?: string;
};

/** Choice fields that can be filled for every vehicle at once. */
const CHOICES = {
  Carburant: { key: "fuel", options: toOptions(CAR_FUELS) },
  "Boîte de vitesses": { key: "gearbox", options: toOptions(CAR_GEARBOXES, GEARBOX_LABELS) },
  Carrosserie: { key: "body", options: toOptions(CAR_BODIES) },
  Origine: { key: "country", options: toOptions(CAR_COUNTRIES, COUNTRY_LABELS) },
} as const;
type Choice = keyof typeof CHOICES;
const PLACEHOLDER = { id: "", label: "À choisir" };
/** Option labels stay French in the lists (values are stored); translated where shown. */
const shown = (options: readonly { id: string; label: string }[]) =>
  options.map((option) => ({ ...option, label: t(option.label) }));

/**
 * Every vehicle with missing details, showing only the fields to fill. Changes
 * are kept locally and saved together; a value can also be applied to all at once.
 */
export function CompleteDetailsDialog({
  cars,
  isOpen,
  onOpenChange,
  onSaved,
  onEditCar,
}: {
  cars: AdminCar[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaved: () => unknown;
  /** Photos are added in the full vehicle form. */
  onEditCar: (car: AdminCar) => void;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={false}>
      <Modal.Container placement="auto" scroll="inside" size="cover">
        <Modal.Dialog className="sm:max-w-5xl">
          {isOpen && (
            <CompleteDetails
              cars={cars}
              onClose={() => onOpenChange(false)}
              onSaved={onSaved}
              onEditCar={(car) => {
                onOpenChange(false);
                onEditCar(car);
              }}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function CompleteDetails({
  cars,
  onClose,
  onSaved,
  onEditCar,
}: {
  cars: AdminCar[];
  onClose: () => void;
  onSaved: () => unknown;
  onEditCar: (car: AdminCar) => void;
}) {
  // Fields missing when the window opened: they stay visible while being filled.
  const [targets] = useState(() =>
    cars
      .map((car) => ({ id: car.id, missing: fieldsToFill(car) }))
      .filter((target) => target.missing.length > 0),
  );
  const byId = useMemo(() => new Map(cars.map((car) => [car.id, car])), [cars]);
  const [drafts, setDrafts] = useState<Record<string, Fields>>({});
  const [filter, setFilter] = useState("");
  const [bulkField, setBulkField] = useState<Choice>("Boîte de vitesses");
  const [bulkValue, setBulkValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const merged = (id: string) => ({ ...byId.get(id)!, ...drafts[id] }) as AdminCar;
  const edit = (id: string, fields: Fields) =>
    setDrafts((all) => ({ ...all, [id]: { ...all[id], ...fields } }));

  const rows = targets.filter(
    (target) => byId.has(target.id) && (!filter || target.missing.includes(filter)),
  );
  const changed = Object.keys(drafts).filter((id) => Object.keys(drafts[id] ?? {}).length > 0);
  const stillMissing = (id: string) => fieldsToFill(merged(id));
  const fieldCounts = Object.fromEntries(
    [...new Set(targets.flatMap((target) => target.missing))].map((label) => [
      label,
      targets.filter((target) => target.missing.includes(label)).length,
    ]),
  );
  const bulkTargets = targets.filter(
    (target) => byId.has(target.id) && stillMissing(target.id).includes(bulkField),
  );

  function applyToAll() {
    const key = CHOICES[bulkField].key;
    setDrafts((all) => {
      const next = { ...all };
      for (const target of bulkTargets) next[target.id] = { ...next[target.id], [key]: bulkValue };
      return next;
    });
    toast.success(
      t("{field} rempli pour {vehicles}.", {
        field: t(bulkField),
        vehicles: plural(bulkTargets.length, "véhicule", "véhicules"),
      }),
    );
  }

  async function save() {
    setSaving(true);
    try {
      const result = await completeCars({
        data: { updates: changed.map((id) => ({ id, fields: drafts[id]! })) },
      });
      const failed = new Set(result.failed.map((f) => f.id));
      setDrafts((all) => Object.fromEntries(Object.entries(all).filter(([id]) => failed.has(id))));
      await onSaved();
      if (result.failed.length)
        toast.danger(
          t("{ignored} : {error}", {
            ignored: plural(
              result.failed.length,
              "véhicule non enregistré",
              "véhicules non enregistrés",
            ),
            error: result.failed[0]!.error,
          }),
        );
      else
        toast.success(
          t("{vehicles}.", {
            vehicles: plural(result.done, "véhicule mis à jour", "véhicules mis à jour"),
          }),
        );
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : t("Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  const close = () => (changed.length ? setConfirmClose(true) : onClose());

  return (
    <>
      <Modal.CloseTrigger aria-label={t("Fermer")} onPress={close} />
      <Modal.Header>
        <Modal.Icon className="bg-danger-soft text-danger">
          <ClipboardList className="size-5" aria-hidden />
        </Modal.Icon>
        <Modal.Heading>{t("Compléter les informations manquantes")}</Modal.Heading>
        <p className="mt-1 text-sm text-muted">
          {t(
            "{vehicles} besoin d’attention. Seuls les champs à remplir sont affichés ; enregistrez quand vous voulez.",
            { vehicles: plural(targets.length, "véhicule a", "véhicules ont") },
          )}
        </p>
      </Modal.Header>

      <Modal.Body className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {/* Same value for every vehicle missing it (e.g. gearbox, origin). */}
        <section className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-surface-secondary p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <SelectField
            label={t("Remplir d’un coup")}
            value={bulkField}
            options={(Object.keys(CHOICES) as Choice[]).map((id) => ({ id, label: t(id) }))}
            onChange={(value) => {
              setBulkField(value as Choice);
              setBulkValue("");
            }}
          />
          <SelectField
            label={t("Valeur")}
            value={bulkValue}
            options={shown([PLACEHOLDER, ...CHOICES[bulkField].options])}
            onChange={setBulkValue}
          />
          <Button
            variant="secondary"
            isDisabled={!bulkValue || bulkTargets.length === 0}
            onPress={applyToAll}
          >
            {t("Appliquer à {vehicles}", {
              vehicles: plural(bulkTargets.length, "véhicule", "véhicules"),
            })}
          </Button>
        </section>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("Filtrer par champ manquant")}
        >
          {[["", targets.length] as const, ...Object.entries(fieldCounts)].map(([label, count]) => (
            <button
              key={label}
              type="button"
              aria-pressed={filter === label}
              onClick={() => setFilter(label)}
              className={
                filter === label
                  ? "rounded-full border border-foreground bg-foreground px-3 py-1 text-sm font-medium text-background"
                  : "rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-surface-secondary"
              }
            >
              {label ? t(label) : t("Tous")} <span className="tabular opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {rows.map(({ id, missing }) => {
            const car = merged(id);
            const left = stillMissing(id);
            const fields = filter ? missing.filter((m) => m === filter) : missing;
            return (
              <li key={id} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={carImage(car)}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-16 shrink-0 rounded-lg bg-surface-secondary object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {car.brand} {car.name}
                    </p>
                    <p className="text-sm text-muted">
                      {left.length ? (
                        t("Manque : {fields}", {
                          fields: left.map((field) => t(field)).join(", "),
                        })
                      ) : (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="size-4" aria-hidden /> {t("Complet")}
                          {drafts[id] && Object.keys(drafts[id]!).length
                            ? ` (${t("à enregistrer")})`
                            : ""}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((field) => (
                    <FieldEditor
                      key={field}
                      field={field}
                      car={car}
                      onChange={(fields) => edit(id, fields)}
                      onPhotos={() =>
                        changed.length
                          ? toast.warning(t("Enregistrez d’abord vos modifications."))
                          : onEditCar(byId.get(id)!)
                      }
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Modal.Body>

      <Modal.Footer>
        <span className="me-auto text-sm text-muted" aria-live="polite">
          {changed.length
            ? plural(changed.length, "véhicule modifié", "véhicules modifiés")
            : t("Aucune modification")}
        </span>
        <Button variant="tertiary" isDisabled={saving} onPress={close}>
          {t("Fermer")}
        </Button>
        <Button isPending={saving} isDisabled={!changed.length} onPress={save}>
          {t("Enregistrer")}
        </Button>
      </Modal.Footer>

      <ConfirmDialog
        isOpen={confirmClose}
        onOpenChange={setConfirmClose}
        title={t("Fermer sans enregistrer ?")}
        confirmLabel={t("Fermer sans enregistrer")}
        tone="warning"
        onConfirm={onClose}
      >
        <p>
          {t("Les informations saisies pour {vehicles} seront perdues.", {
            vehicles: plural(changed.length, "véhicule", "véhicules"),
          })}
        </p>
      </ConfirmDialog>
    </>
  );
}

function FieldEditor({
  field,
  car,
  onChange,
  onPhotos,
}: {
  field: string;
  car: AdminCar;
  onChange: (fields: Fields) => void;
  onPhotos: () => void;
}) {
  if (field in CHOICES) {
    const { key, options } = CHOICES[field as Choice];
    const value = car[key] as string;
    const known = options.some((o) => o.id === value);
    return (
      <SelectField
        label={t(field)}
        value={known ? value : ""}
        options={shown(known ? options : [PLACEHOLDER, ...options])}
        onChange={(next) => next && onChange({ [key]: next })}
      />
    );
  }
  switch (field) {
    case "Modèle":
      return (
        <TextField
          value={car.name === "Modèle à préciser" ? "" : (car.model ?? "")}
          onChange={(model) =>
            onChange({
              model,
              name:
                [model.trim(), car.version?.trim()].filter(Boolean).join(" ") ||
                "Modèle à préciser",
            })
          }
          maxLength={200}
        >
          <Label>{t("Modèle")}</Label>
          <Input placeholder={t("ex. Sportage")} />
        </TextField>
      );
    case "Année":
      return (
        <IntegerField
          label={t("Année")}
          value={car.year > 1900 ? car.year : null}
          onChange={(year) => year && onChange({ year })}
          minValue={1901}
          maxValue={2100}
          grouping={false}
        />
      );
    case "Prix":
      return (
        <IntegerField
          label={t("Prix (DT)")}
          value={car.price || null}
          // A price entered here is shown on the site instead of "Contactez-nous".
          onChange={(price) =>
            onChange(
              price ? { price, price_on_request: false } : { price: 0, price_on_request: true },
            )
          }
          minValue={0}
          maxValue={1_000_000_000}
          description={t("Affiché sur le site. Laissez vide pour « Contactez-nous ».")}
        />
      );
    case "Kilométrage":
      return (
        <IntegerField
          label={t("Kilométrage (km)")}
          value={car.km_value || null}
          onChange={(km) => onChange({ km_value: km ?? 0 })}
          minValue={0}
          maxValue={100_000_000}
        />
      );
    case "Puissance fiscale":
      return (
        <IntegerField
          label={t("Puissance fiscale (CV)")}
          value={car.fiscal_power ?? null}
          onChange={(fiscal_power) => onChange({ fiscal_power })}
          minValue={0}
          maxValue={100}
        />
      );
    case "Description":
      return (
        <TextField
          value={car.description}
          onChange={(description) => onChange({ description })}
          maxLength={20000}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Label>{t("Description")}</Label>
          <TextArea rows={2} />
        </TextField>
      );
    case "Photos":
      return (
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-foreground">{t("Photos")}</span>
          <Button variant="secondary" onPress={onPhotos}>
            <ImagePlus className="size-4" aria-hidden />
            {t("Ajouter des photos")}
          </Button>
        </div>
      );
    default:
      return null;
  }
}
