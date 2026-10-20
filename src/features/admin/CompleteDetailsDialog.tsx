import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Description,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ImagePlus,
  Wand2,
} from "@/components/icons";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  carImage,
  COUNTRY_LABELS,
  formatKm,
  GEARBOX_LABELS,
} from "@/lib/cars";
import { completeCars } from "@/lib/data";
import { fieldsToFill, plural, toOptions, type AdminCar } from "./model";
import { BottomSheet, ConfirmDialog, IntegerField, SelectField, useIsPhone } from "./ui";
import { formatNumber, t } from "./i18n";

/*
 * "Compléter les fiches": the vehicles with missing details, one at a time. Only
 * the missing fields are asked, each with a short explanation; "Enregistrer et
 * continuer" saves that vehicle and shows the next, "Passer" leaves it for later.
 * Nothing is lost when closing (every vehicle is saved as you go). A value common
 * to many vehicles (gearbox, origin…) can be given to all of them at once.
 * Phone: a sheet from the bottom; computer: a window.
 */

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

/** What each field is, in a few words, for people filling it in. */
const HELP: Record<string, string> = {
  Modèle: "Le nom du modèle, par exemple Sportage ou 3008.",
  Année: "Année de première mise en circulation.",
  Prix: "Affiché sur le site. Laissez vide pour afficher « Contactez-nous ».",
  Kilométrage: "Le kilométrage au compteur.",
  Carburant: "Essence, diesel, hybride…",
  "Boîte de vitesses": "Manuelle ou automatique.",
  Carrosserie: "Le type de véhicule : SUV, berline, citadine…",
  Origine: "Le pays d’où vient le véhicule.",
  "Puissance fiscale": "Indiquée sur la carte grise, en chevaux (CV).",
  Description: "Quelques phrases pour présenter le véhicule aux clients.",
  Photos: "Un véhicule sans photo n’attire pas les clients.",
};

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
  const phone = useIsPhone();
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const close = () => (dirty ? setConfirmClose(true) : onOpenChange(false));
  const wizard = isOpen && (
    <Wizard
      cars={cars}
      onDirtyChange={setDirty}
      onClose={() => onOpenChange(false)}
      onSaved={onSaved}
      onEditCar={(car) => {
        onOpenChange(false);
        onEditCar(car);
      }}
    />
  );
  const confirm = (
    <ConfirmDialog
      isOpen={confirmClose}
      onOpenChange={setConfirmClose}
      title={t("Quitter sans enregistrer ce véhicule ?")}
      confirmLabel={t("Quitter")}
      cancelLabel={t("Continuer")}
      tone="warning"
      onConfirm={() => onOpenChange(false)}
    >
      <p>
        {t(
          "Les informations saisies pour ce véhicule seront perdues. Les véhicules déjà enregistrés le restent.",
        )}
      </p>
    </ConfirmDialog>
  );

  if (phone)
    return (
      <>
        <BottomSheet
          isOpen={isOpen}
          onOpenChange={(open) => !open && close()}
          title={t("Compléter les fiches")}
          avoidKeyboard
          tall
        >
          <div className="px-2 pb-1">{wizard}</div>
        </BottomSheet>
        {confirm}
      </>
    );
  return (
    <>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && close()}>
        <Modal.Container placement="auto" scroll="inside">
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.CloseTrigger aria-label={t("Fermer")} />
            <Modal.Header>
              <Modal.Heading>{t("Compléter les fiches")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="pb-1">{wizard}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {confirm}
    </>
  );
}

function Wizard({
  cars,
  onDirtyChange,
  onClose,
  onSaved,
  onEditCar,
}: {
  cars: AdminCar[];
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onSaved: () => unknown;
  onEditCar: (car: AdminCar) => void;
}) {
  // The vehicles to complete, as they were when the window opened.
  const [queue] = useState(() =>
    cars.filter((car) => fieldsToFill(car).length > 0).map((car) => car.id),
  );
  const byId = useMemo(() => new Map(cars.map((car) => [car.id, car])), [cars]);
  /** Values already saved from here (shown at once, before the list reloads). */
  const [saved, setSaved] = useState<Record<string, Fields>>({});
  const [draft, setDraft] = useState<Fields>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const carOf = (id: string) => ({ ...byId.get(id)!, ...saved[id] }) as AdminCar;
  const id = queue[index];
  const finished = index >= queue.length;
  const dirty = Object.keys(draft).length > 0;

  const setDraftAndDirty = (next: Fields) => {
    setDraft(next);
    onDirtyChange(Object.keys(next).length > 0);
  };
  const go = (next: number) => {
    setDraftAndDirty({});
    setIndex(next);
  };

  async function save(carId: string, fields: Fields) {
    const result = await completeCars({ data: { updates: [{ id: carId, fields }] } });
    if (result.failed.length) throw new Error(result.failed[0]!.error);
    setSaved((all) => ({ ...all, [carId]: { ...all[carId], ...fields } }));
    void onSaved();
  }

  async function saveAndNext() {
    if (!id) return;
    if (!dirty) {
      setSkipped((list) => [...list.filter((x) => x !== id), id]);
      go(index + 1);
      return;
    }
    setSaving(true);
    try {
      await save(id, draft);
      setDone((list) => [...list.filter((x) => x !== id), id]);
      setSkipped((list) => list.filter((x) => x !== id));
      go(index + 1);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : t("Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  if (!queue.length || finished) {
    const left = queue.filter((carId) => fieldsToFill(carOf(carId)).length > 0);
    return (
      <div className="grid justify-items-center gap-3 px-2 py-8 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <p className="text-lg font-semibold text-foreground">
          {left.length ? t("C’est fait pour le moment") : t("Toutes les fiches sont complètes")}
        </p>
        <p className="max-w-sm text-sm text-muted">
          {done.length
            ? t("{vehicles}.", {
                vehicles: plural(done.length, "véhicule complété", "véhicules complétés"),
              })
            : null}{" "}
          {left.length
            ? t("{vehicles} : vous pourrez y revenir plus tard.", {
                vehicles: plural(
                  left.length,
                  "fiche reste incomplète",
                  "fiches restent incomplètes",
                ),
              })
            : null}
        </p>
        <div className="mt-2 grid w-full max-w-xs justify-items-stretch gap-2">
          {skipped.length > 0 && left.length > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onPress={() => go(queue.indexOf(left[0]!))}
            >
              {t("Revoir les véhicules passés")}
            </Button>
          )}
          <Button className="w-full" onPress={onClose}>
            {t("Fermer")}
          </Button>
        </div>
      </div>
    );
  }

  const base = carOf(id!);
  const car = { ...base, ...draft } as AdminCar;
  const missingAtStart = fieldsToFill(byId.get(id!)!);
  const stillMissing = fieldsToFill(car);
  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* Where we are. */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-foreground">
            {t("Véhicule {n} sur {total}", {
              n: formatNumber(index + 1),
              total: formatNumber(queue.length),
            })}
          </span>
          <button
            type="button"
            onClick={() => setBulkOpen((open) => !open)}
            aria-expanded={bulkOpen}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Wand2 className="size-4" aria-hidden />
            {t("Remplir pour tous")}
            <ChevronDown
              className={`size-4 transition-transform ${bulkOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-surface-secondary" aria-hidden>
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </span>
      </div>

      {bulkOpen && (
        <BulkFill
          queue={queue}
          carOf={carOf}
          onApply={async (choice, value, ids) => {
            const key = CHOICES[choice].key;
            const result = await completeCars({
              data: { updates: ids.map((carId) => ({ id: carId, fields: { [key]: value } })) },
            });
            const ok = ids.filter((carId) => !result.failed.some((f) => f.id === carId));
            setSaved((all) => {
              const next = { ...all };
              for (const carId of ok) next[carId] = { ...next[carId], [key]: value };
              return next;
            });
            void onSaved();
            toast.success(
              t("{field} rempli pour {vehicles}.", {
                field: t(choice),
                vehicles: plural(ok.length, "véhicule", "véhicules"),
              }),
            );
            setBulkOpen(false);
          }}
        />
      )}

      {/* The vehicle. */}
      <div key={id} className="flex items-center gap-4 animate-in fade-in-0 duration-200">
        <img
          src={carImage(car)}
          alt=""
          className="aspect-[4/3] w-28 shrink-0 rounded-2xl bg-surface-secondary object-cover sm:w-32"
        />
        <div className="grid min-w-0 gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{car.brand}</p>
          <p className="text-lg font-semibold leading-tight text-foreground">
            {car.name === "Modèle à préciser" ? t("Modèle à préciser") : car.name}
          </p>
          <p className="text-sm text-muted">
            {[
              car.year > 1900 ? String(car.year) : null,
              car.km_value ? formatKm(car.km_value) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* What is missing, ticked off as it is filled. */}
      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">
          {stillMissing.length
            ? t("Il manque {count} :", { count: formatNumber(stillMissing.length) })
            : t("Tout est rempli pour ce véhicule.")}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {missingAtStart.map((field) => {
            const ok = !stillMissing.includes(field);
            return (
              <li
                key={field}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                {ok && <Check className="size-3.5" aria-hidden />}
                {t(field)}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {missingAtStart
          .filter((field) => !(saved[id!] && !fieldsToFill(base).includes(field)))
          .map((field) => (
            <FieldEditor
              key={`${id}-${field}`}
              field={field}
              car={car}
              onChange={(fields) => setDraftAndDirty({ ...draft, ...fields })}
              onPhotos={async () => {
                // The vehicle form opens: what was typed here is saved first.
                if (dirty)
                  try {
                    await save(id!, draft);
                  } catch (error) {
                    toast.danger(
                      error instanceof Error ? error.message : t("Enregistrement impossible."),
                    );
                    return;
                  }
                onEditCar(carOf(id!));
              }}
            />
          ))}
      </div>

      {/* Actions: always visible at the bottom on phones. */}
      <div className="sticky -bottom-2 z-10 -mx-2 flex gap-2 border-t border-separator bg-surface px-2 pb-3 pt-3 sm:static sm:mx-0 sm:justify-end sm:border-0 sm:px-0 sm:pb-1">
        {index > 0 ? (
          <Button
            isIconOnly
            variant="secondary"
            aria-label={t("Véhicule précédent")}
            isDisabled={saving}
            onPress={() => go(index - 1)}
            className="size-12 sm:hidden"
          >
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden />
          </Button>
        ) : null}
        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none">
          {index > 0 && (
            <Button
              variant="tertiary"
              isDisabled={saving}
              onPress={() => go(index - 1)}
              className="max-sm:hidden"
            >
              {t("Précédent")}
            </Button>
          )}
          <Button
            variant="secondary"
            isDisabled={saving}
            className="h-12 w-full sm:h-10 sm:w-auto"
            onPress={() => {
              setSkipped((list) => [...list.filter((x) => x !== id), id!]);
              go(index + 1);
            }}
          >
            {t("Passer")}
          </Button>
          <Button
            isPending={saving}
            className="h-12 w-full sm:h-10 sm:w-auto"
            onPress={() => void saveAndNext()}
          >
            {dirty ? t("Enregistrer") : t("Suivant")}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One value (gearbox, origin…) for every vehicle that is missing it, saved at once. */
function BulkFill({
  queue,
  carOf,
  onApply,
}: {
  queue: string[];
  carOf: (id: string) => AdminCar;
  onApply: (choice: Choice, value: string, ids: string[]) => Promise<void>;
}) {
  const [choice, setChoice] = useState<Choice>("Boîte de vitesses");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = queue.filter((id) => fieldsToFill(carOf(id)).includes(choice));
  return (
    <section className="grid gap-3 rounded-2xl bg-surface-secondary p-4 animate-in fade-in-0 duration-200">
      <p className="text-sm text-muted">
        {t(
          "Donnez la même valeur à tous les véhicules qui ne l’ont pas encore. Elle est enregistrée tout de suite.",
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t("Information")}
          value={choice}
          options={(Object.keys(CHOICES) as Choice[]).map((id) => ({ id, label: t(id) }))}
          onChange={(next) => {
            setChoice(next as Choice);
            setValue("");
          }}
        />
        <SelectField
          label={t("Valeur")}
          value={value}
          options={shown([PLACEHOLDER, ...CHOICES[choice].options])}
          onChange={setValue}
        />
      </div>
      <Button
        isDisabled={!value || !ids.length}
        isPending={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await onApply(choice, value, ids);
          } catch (error) {
            toast.danger(error instanceof Error ? error.message : t("Enregistrement impossible."));
          } finally {
            setBusy(false);
          }
        }}
      >
        {ids.length
          ? t("Appliquer à {vehicles}", {
              vehicles: plural(ids.length, "véhicule", "véhicules"),
            })
          : t("Aucun véhicule concerné")}
      </Button>
    </section>
  );
}

/** A select with its one-line explanation under it. */
function WithHelp({ help, children }: { help: string | undefined; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {children}
      {help && <p className="text-xs text-muted">{t(help)}</p>}
    </div>
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
  const help = HELP[field];
  if (field in CHOICES) {
    const { key, options } = CHOICES[field as Choice];
    const value = car[key] as string;
    const known = options.some((o) => o.id === value);
    return (
      <WithHelp help={help}>
        <SelectField
          label={t(field)}
          value={known ? value : ""}
          options={shown(known ? options : [PLACEHOLDER, ...options])}
          onChange={(next) => next && onChange({ [key]: next })}
        />
      </WithHelp>
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
          {help && <Description>{t(help)}</Description>}
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
          wheel={{ from: 1950, to: new Date().getFullYear() + 1 }}
          description={help ? t(help) : undefined}
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
          description={help ? t(help) : undefined}
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
          description={help ? t(help) : undefined}
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
          description={help ? t(help) : undefined}
        />
      );
    case "Description":
      return (
        <TextField
          value={car.description}
          onChange={(description) => onChange({ description })}
          maxLength={20000}
          className="sm:col-span-2"
        >
          <Label>{t("Description")}</Label>
          <TextArea rows={4} />
          {help && <Description>{t(help)}</Description>}
        </TextField>
      );
    case "Photos":
      return (
        <WithHelp help={help}>
          <span className="text-sm font-medium text-foreground">{t("Photos")}</span>
          <Button variant="secondary" onPress={onPhotos} className="justify-self-start">
            <ImagePlus className="size-4" aria-hidden />
            {t("Ajouter des photos")}
          </Button>
        </WithHelp>
      );
    default:
      return null;
  }
}
