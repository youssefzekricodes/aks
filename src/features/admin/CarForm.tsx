import { useRef, useState, type ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  Button,
  ComboBox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  TextArea,
  TextField,
} from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { ArrowLeft, ChevronDown, ExternalLink, Plus } from "@/components/icons";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  CAR_STATES,
  CAR_TRANSMISSIONS,
  COUNTRY_LABELS,
  GEARBOX_LABELS,
  discountPercent,
  formatKm,
  formatPrice,
  slugify,
} from "@/lib/cars";
import { BRANDS } from "@/features/catalog/brands";
import type { CarInput } from "@/lib/data";
import { usePhotoQueue } from "./hooks";
import { autoSlug, plural, toOptions } from "./model";
import { t } from "./i18n";
import { PhotoManager } from "./PhotoManager";
import { SocialCard } from "./SocialCard";
import {
  BottomSheet,
  IntegerField,
  PageHeader,
  SheetOption,
  sheetFieldClass,
  useIsPhone,
  SectionCard,
  SelectField,
  SwitchField,
  UnsavedChangesDialog,
} from "./ui";

const NO_TRANSMISSION = "__none";
/** Option labels stay French in the lists (values are stored); translated where shown. */
const shown = (options: { id: string; label: string }[]) =>
  options.map((option) => ({ ...option, label: t(option.label) }));

export function CarForm({
  value,
  isDirty,
  onChange,
  onCancel,
  breadcrumbs,
  backLabel = t("Retour à la liste"),
  onSave,
  saving,
}: {
  value: CarInput;
  isDirty: boolean;
  /** Functional update: photo uploads finish after later edits. */
  onChange: (update: (car: CarInput) => CarInput) => void;
  onCancel: () => void;
  /** Shown above the title (where the form was opened from). */
  breadcrumbs?: ReactNode;
  backLabel?: string;
  onSave: () => void;
  saving: boolean;
}) {
  // The URL identifier follows brand/model/version until it is edited by hand.
  const [slugFollows, setSlugFollows] = useState(!value.slug);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Original files of photos sent in this session: re-cropping starts from them.
  const originals = useRef(new Map<string, File>());
  const photos = usePhotoQueue((url, original) => {
    originals.current.set(url, original);
    onChange((car) => ({ ...car, images: [...car.images, url] }));
  });
  const isNew = !value.id;
  const unsaved = isDirty || photos.items.length > 0;

  // Leaving the admin page (sections share the path and keep this form mounted).
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      unsaved && next.pathname !== current.pathname && next.pathname !== "/auth",
    enableBeforeUnload: unsaved,
    withResolver: true,
  });

  const set = <K extends keyof CarInput>(key: K, v: CarInput[K]) =>
    onChange((car) => ({ ...car, [key]: v }));

  const setIdentity = (patch: Partial<Pick<CarInput, "brand" | "model" | "version">>) =>
    onChange((car) => {
      const next = { ...car, ...patch };
      return slugFollows ? { ...next, slug: autoSlug(next) } : next;
    });

  const requestLeave = () => (unsaved ? setLeaveOpen(true) : onCancel());

  const saveBlocked = photos.active > 0 || photos.failed > 0;
  const status =
    photos.active > 0
      ? t("Enregistrement possible une fois les photos envoyées ({uploads} en cours).", {
          uploads: plural(photos.active, "envoi", "envois"),
        })
      : photos.failed > 0
        ? t("Réessayez ou retirez les photos en échec avant d’enregistrer.")
        : isDirty
          ? t("Modifications non enregistrées.")
          : t("Aucune modification.");

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="grid gap-6"
    >
      {breadcrumbs}
      <PageHeader
        title={
          isNew
            ? t("Nouveau véhicule")
            : t("Modifier {name}", { name: `${value.brand} ${value.model || value.name}` })
        }
        description={t("Les champs marqués d’un astérisque sont obligatoires.")}
        actions={
          <>
            {!isNew && value.published && (
              <a
                href={`/vehicule/${value.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "ghost" })}
              >
                <ExternalLink className="size-4" aria-hidden />
                {t("Voir sur le site")}
              </a>
            )}
            <Button variant="tertiary" onPress={requestLeave}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
              {backLabel}
            </Button>
          </>
        }
      />

      <SectionCard title={t("Identification")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <BrandField value={value.brand} onChange={(brand) => setIdentity({ brand })} />
          <TextField
            value={value.model ?? ""}
            onChange={(model) => setIdentity({ model })}
            isRequired
            maxLength={200}
          >
            <Label>{t("Modèle")}</Label>
            <Input placeholder={t("Ex. Classe C")} />
            <FieldError />
          </TextField>
          <TextField
            value={value.version ?? ""}
            onChange={(version) => setIdentity({ version })}
            maxLength={200}
          >
            <Label>{t("Version / finition")}</Label>
            <Input placeholder={t("Ex. 220d AMG Line")} />
          </TextField>
          <TextField
            value={value.slug}
            onChange={(slug) => {
              setSlugFollows(slug === "");
              onChange((car) => ({
                ...car,
                slug: slug === "" ? autoSlug(car) : slug.toLowerCase(),
              }));
            }}
            onBlur={() => onChange((car) => ({ ...car, slug: slugify(car.slug) }))}
            isRequired
            maxLength={200}
            validate={(slug) =>
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugify(slug))
                ? null
                : t("Lettres minuscules, chiffres et tirets uniquement.")
            }
          >
            <Label>{t("Identifiant d’URL")}</Label>
            <Input />
            <Description>
              {t("Adresse de la fiche : {path}. Rempli automatiquement.", {
                path: `/vehicule/${value.slug || "…"}`,
              })}
            </Description>
            <FieldError />
          </TextField>
        </div>
      </SectionCard>

      <SectionCard title={t("Prix")}>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <IntegerField
            label={t("Prix (DT)")}
            value={value.price}
            onChange={(price) =>
              onChange((car) => ({
                ...car,
                price: price ?? 0,
                // A discount must stay below the price: drop it if the price goes under.
                discount_price:
                  car.discount_price != null && car.discount_price >= (price ?? 0)
                    ? null
                    : car.discount_price,
              }))
            }
            minValue={0}
            maxValue={1_000_000_000}
            isDisabled={value.price_on_request === true}
            isRequired={!value.price_on_request}
          />
          <div className="grid gap-1 self-center text-sm text-muted">
            {discountPercent(value) ? (
              <p>
                {t("Remise active :")}{" "}
                <span className="tabular font-medium text-foreground">
                  {formatPrice(value.discount_price ?? 0)}
                </span>{" "}
                {t("(−{percent} %).", { percent: discountPercent(value) })}
              </p>
            ) : (
              <p>{t("Aucune remise.")}</p>
            )}
            <p>{t("Ajoutez ou modifiez la remise depuis la liste des véhicules (menu « … »).")}</p>
          </div>
          <div className="sm:col-span-2">
            <SwitchField
              isSelected={value.price_on_request === true}
              onChange={(on) =>
                onChange((car) => ({
                  ...car,
                  price_on_request: on,
                  price: on ? 0 : car.price,
                  discount_price: on ? null : car.discount_price,
                }))
              }
            >
              {t("Masquer le prix (le site affiche « Contactez-nous » à la place)")}
            </SwitchField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("Caractéristiques")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegerField
            label={t("Année")}
            value={value.year}
            onChange={(year) => set("year", year ?? new Date().getFullYear())}
            minValue={1900}
            maxValue={2100}
            grouping={false}
            wheel={{ from: 1950, to: new Date().getFullYear() + 1 }}
            isRequired
          />
          <IntegerField
            label={t("Kilométrage (km)")}
            value={value.km_value}
            onChange={(km) => {
              const km_value = km ?? 0;
              onChange((car) => ({ ...car, km_value, km: formatKm(km_value) }));
            }}
            minValue={0}
            maxValue={100_000_000}
            isRequired
          />
          <SelectField
            label={t("État")}
            value={value.state}
            options={shown(toOptions(CAR_STATES))}
            onChange={(state) => set("state", state)}
          />
          <SelectField
            label={t("Carrosserie")}
            value={value.body}
            options={shown(toOptions(CAR_BODIES))}
            onChange={(body) => set("body", body)}
          />
          <SelectField
            label={t("Énergie")}
            value={value.fuel}
            options={shown(toOptions(CAR_FUELS))}
            onChange={(fuel) => set("fuel", fuel)}
          />
          <SelectField
            label={t("Boîte de vitesses")}
            value={value.gearbox}
            options={shown(toOptions(CAR_GEARBOXES, GEARBOX_LABELS))}
            onChange={(gearbox) => set("gearbox", gearbox)}
          />
          <SelectField
            label={t("Transmission")}
            value={value.transmission || NO_TRANSMISSION}
            options={shown([
              { id: NO_TRANSMISSION, label: "Non précisée" },
              ...toOptions(CAR_TRANSMISSIONS),
            ])}
            onChange={(transmission) =>
              set("transmission", transmission === NO_TRANSMISSION ? "" : transmission)
            }
          />
          <SelectField
            label={t("Origine")}
            value={value.country}
            options={shown(toOptions(CAR_COUNTRIES, COUNTRY_LABELS))}
            onChange={(country) => set("country", country)}
          />
          <IntegerField
            label={t("Portes")}
            value={value.doors}
            onChange={(doors) => set("doors", doors)}
            minValue={0}
            maxValue={9}
            description={t("Facultatif")}
          />
          <IntegerField
            label={t("Places")}
            value={value.seats}
            onChange={(seats) => set("seats", seats)}
            minValue={0}
            maxValue={60}
            description={t("Facultatif")}
          />
          <IntegerField
            label={t("Puissance fiscale (CV)")}
            value={value.fiscal_power}
            onChange={(cv) => set("fiscal_power", cv)}
            minValue={0}
            maxValue={100}
            description={t("Facultatif")}
          />
        </div>
      </SectionCard>

      <SectionCard title={t("Description")}>
        <TextField
          value={value.description}
          onChange={(description) => set("description", description)}
          maxLength={20000}
        >
          <Label>{t("Texte affiché sur la fiche du véhicule")}</Label>
          <TextArea rows={6} />
        </TextField>
      </SectionCard>

      <SectionCard
        title={t("Photos")}
        description={t(
          "La première photo sert de couverture dans les listes. Utilisez les flèches pour changer l’ordre.",
        )}
      >
        <PhotoManager
          images={value.images}
          onImagesChange={(update) => onChange((car) => ({ ...car, images: update(car.images) }))}
          queue={photos}
          originals={originals.current}
          isDisabled={saving}
        />
      </SectionCard>

      <SectionCard title={t("Publication")}>
        <div className="grid gap-4">
          <SwitchField isSelected={value.published} onChange={(on) => set("published", on)}>
            {t("Publier sur le site")}
          </SwitchField>
          <SwitchField isSelected={value.sold === true} onChange={(on) => set("sold", on)}>
            {t(
              "Vendu (retiré des listes ; sa page affiche « Vendu » avec des véhicules similaires)",
            )}
          </SwitchField>
          <p className="text-sm text-muted">
            {t(
              "L’ordre d’affichage se règle depuis la liste des véhicules (flèches ou « Afficher en premier »). Un nouveau véhicule apparaît en premier.",
            )}
          </p>
        </div>
      </SectionCard>

      <SocialCard value={value} onChange={onChange} />

      <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-separator bg-surface p-3 shadow-lg sm:bottom-4 sm:p-4">
        <p
          id="car-form-status"
          aria-live="polite"
          className={`text-xs sm:text-sm ${saveBlocked ? "text-danger" : "text-muted"}`}
        >
          {status}
        </p>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button
            variant="tertiary"
            className="w-full sm:w-auto"
            onPress={requestLeave}
            isDisabled={saving}
          >
            {t("Annuler")}
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            isPending={saving}
            isDisabled={saveBlocked}
            aria-describedby="car-form-status"
          >
            {saving ? t("Enregistrement…") : t("Enregistrer")}
          </Button>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={leaveOpen || blocker.status === "blocked"}
        onStay={() => {
          setLeaveOpen(false);
          blocker.reset?.();
        }}
        onLeave={() => {
          setLeaveOpen(false);
          if (blocker.status === "blocked") blocker.proceed();
          else onCancel();
        }}
      >
        <p>
          {photos.items.length > 0
            ? t(
                "Les modifications de ce véhicule ne sont pas enregistrées et {photos}. Elles seront perdues.",
                {
                  photos: plural(
                    photos.items.length,
                    "photo n’est pas encore envoyée",
                    "photos ne sont pas encore envoyées",
                  ),
                },
              )
            : t("Les modifications de ce véhicule ne sont pas enregistrées. Elles seront perdues.")}
        </p>
      </UnsavedChangesDialog>
    </Form>
  );
}

/**
 * Brand: list with free typing. Computers: combo box. Phones: a sheet with a
 * search box and the list (any other name can be used as typed).
 */
function BrandField({ value, onChange }: { value: string; onChange: (brand: string) => void }) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  if (!phone)
    return (
      <ComboBox allowsCustomValue inputValue={value} onInputChange={onChange} isRequired fullWidth>
        <Label>{t("Marque")}</Label>
        <ComboBox.InputGroup>
          <Input placeholder={t("Choisir ou saisir une marque")} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <Description>{t("Une marque absente de la liste peut être saisie librement.")}</Description>
        <FieldError />
        <ComboBox.Popover>
          <ListBox>
            {BRANDS.map((brand) => (
              <ListBox.Item key={brand.slug} id={brand.slug} textValue={brand.name}>
                {brand.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    );
  const q = query.trim().toLowerCase();
  const matches = BRANDS.filter((brand) => brand.name.toLowerCase().includes(q));
  const exact = BRANDS.some((brand) => brand.name.toLowerCase() === q);
  const choose = (brand: string) => {
    onChange(brand);
    setOpen(false);
    setQuery("");
  };
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-sm font-medium text-foreground">
        {t("Marque")}
        <span className="text-danger"> *</span>
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        onClick={() => setOpen(true)}
        className={sheetFieldClass}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-muted"}`}>
          {value || t("Choisir une marque")}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      <span className="text-xs text-muted">
        {t("Une marque absente de la liste peut être saisie librement.")}
      </span>
      <BottomSheet isOpen={open} onOpenChange={setOpen} title={t("Marque")}>
        <div className="grid gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Rechercher ou saisir une marque")}
            aria-label={t("Rechercher une marque")}
            enterKeyHint="done"
            className="h-11 w-full rounded-full bg-surface-secondary px-4 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          <div
            role="listbox"
            aria-label={t("Marques")}
            data-sheet-scroll
            className="grid max-h-[55dvh] gap-0.5 overflow-y-auto overscroll-contain"
          >
            {q && !exact && (
              <SheetOption icon={Plus} onPress={() => choose(query.trim())}>
                {t("Utiliser « {name} »", { name: query.trim() })}
              </SheetOption>
            )}
            {matches.map((brand) => (
              <SheetOption
                key={brand.slug}
                selected={brand.name.toLowerCase() === value.toLowerCase()}
                onPress={() => choose(brand.name)}
              >
                {brand.name}
              </SheetOption>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
