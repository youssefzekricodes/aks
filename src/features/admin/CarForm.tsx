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

export function CarForm({
  value,
  isDirty,
  onChange,
  onCancel,
  breadcrumbs,
  backLabel = "Retour à la liste",
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
      ? `Enregistrement possible une fois les photos envoyées (${plural(photos.active, "envoi", "envois")} en cours).`
      : photos.failed > 0
        ? "Réessayez ou retirez les photos en échec avant d’enregistrer."
        : isDirty
          ? "Modifications non enregistrées."
          : "Aucune modification.";

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
        title={isNew ? "Nouveau véhicule" : `Modifier ${value.brand} ${value.model || value.name}`}
        description="Les champs marqués d’un astérisque sont obligatoires."
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
                Voir sur le site
              </a>
            )}
            <Button variant="tertiary" onPress={requestLeave}>
              <ArrowLeft className="size-4" aria-hidden />
              {backLabel}
            </Button>
          </>
        }
      />

      <SectionCard title="Identification">
        <div className="grid gap-4 sm:grid-cols-2">
          <BrandField value={value.brand} onChange={(brand) => setIdentity({ brand })} />
          <TextField
            value={value.model ?? ""}
            onChange={(model) => setIdentity({ model })}
            isRequired
            maxLength={200}
          >
            <Label>Modèle</Label>
            <Input placeholder="Ex. Classe C" />
            <FieldError />
          </TextField>
          <TextField
            value={value.version ?? ""}
            onChange={(version) => setIdentity({ version })}
            maxLength={200}
          >
            <Label>Version / finition</Label>
            <Input placeholder="Ex. 220d AMG Line" />
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
                : "Lettres minuscules, chiffres et tirets uniquement."
            }
          >
            <Label>Identifiant d’URL</Label>
            <Input />
            <Description>
              Adresse de la fiche : /vehicule/{value.slug || "…"}. Rempli automatiquement.
            </Description>
            <FieldError />
          </TextField>
        </div>
      </SectionCard>

      <SectionCard title="Prix">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <IntegerField
            label="Prix (DT)"
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
                Remise active :{" "}
                <span className="tabular font-medium text-foreground">
                  {formatPrice(value.discount_price ?? 0)}
                </span>{" "}
                (−{discountPercent(value)} %).
              </p>
            ) : (
              <p>Aucune remise.</p>
            )}
            <p>Ajoutez ou modifiez la remise depuis la liste des véhicules (menu « … »).</p>
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
              Masquer le prix (le site affiche « Contactez-nous » à la place)
            </SwitchField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Caractéristiques">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegerField
            label="Année"
            value={value.year}
            onChange={(year) => set("year", year ?? new Date().getFullYear())}
            minValue={1900}
            maxValue={2100}
            grouping={false}
            wheel={{ from: 1950, to: new Date().getFullYear() + 1 }}
            isRequired
          />
          <IntegerField
            label="Kilométrage (km)"
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
            label="État"
            value={value.state}
            options={toOptions(CAR_STATES)}
            onChange={(state) => set("state", state)}
          />
          <SelectField
            label="Carrosserie"
            value={value.body}
            options={toOptions(CAR_BODIES)}
            onChange={(body) => set("body", body)}
          />
          <SelectField
            label="Énergie"
            value={value.fuel}
            options={toOptions(CAR_FUELS)}
            onChange={(fuel) => set("fuel", fuel)}
          />
          <SelectField
            label="Boîte de vitesses"
            value={value.gearbox}
            options={toOptions(CAR_GEARBOXES, GEARBOX_LABELS)}
            onChange={(gearbox) => set("gearbox", gearbox)}
          />
          <SelectField
            label="Transmission"
            value={value.transmission || NO_TRANSMISSION}
            options={[
              { id: NO_TRANSMISSION, label: "Non précisée" },
              ...toOptions(CAR_TRANSMISSIONS),
            ]}
            onChange={(t) => set("transmission", t === NO_TRANSMISSION ? "" : t)}
          />
          <SelectField
            label="Origine"
            value={value.country}
            options={toOptions(CAR_COUNTRIES, COUNTRY_LABELS)}
            onChange={(country) => set("country", country)}
          />
          <IntegerField
            label="Portes"
            value={value.doors}
            onChange={(doors) => set("doors", doors)}
            minValue={0}
            maxValue={9}
            description="Facultatif"
          />
          <IntegerField
            label="Places"
            value={value.seats}
            onChange={(seats) => set("seats", seats)}
            minValue={0}
            maxValue={60}
            description="Facultatif"
          />
          <IntegerField
            label="Puissance fiscale (CV)"
            value={value.fiscal_power}
            onChange={(cv) => set("fiscal_power", cv)}
            minValue={0}
            maxValue={100}
            description="Facultatif"
          />
        </div>
      </SectionCard>

      <SectionCard title="Description">
        <TextField
          value={value.description}
          onChange={(description) => set("description", description)}
          maxLength={20000}
        >
          <Label>Texte affiché sur la fiche du véhicule</Label>
          <TextArea rows={6} />
        </TextField>
      </SectionCard>

      <SectionCard
        title="Photos"
        description="La première photo sert de couverture dans les listes. Utilisez les flèches pour changer l’ordre."
      >
        <PhotoManager
          images={value.images}
          onImagesChange={(update) => onChange((car) => ({ ...car, images: update(car.images) }))}
          queue={photos}
          originals={originals.current}
          isDisabled={saving}
        />
      </SectionCard>

      <SectionCard title="Publication">
        <div className="grid gap-4">
          <SwitchField isSelected={value.published} onChange={(on) => set("published", on)}>
            Publier sur le site
          </SwitchField>
          <SwitchField isSelected={value.sold === true} onChange={(on) => set("sold", on)}>
            Vendu (retiré des listes ; sa page affiche « Vendu » avec des véhicules similaires)
          </SwitchField>
          <p className="text-sm text-muted">
            L’ordre d’affichage se règle depuis la liste des véhicules (flèches ou « Afficher en
            premier »). Un nouveau véhicule apparaît en premier.
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
            Annuler
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            isPending={saving}
            isDisabled={saveBlocked}
            aria-describedby="car-form-status"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
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
          Les modifications de ce véhicule ne sont pas enregistrées
          {photos.items.length > 0 &&
            ` et ${plural(photos.items.length, "photo n’est pas encore envoyée", "photos ne sont pas encore envoyées")}`}
          . Elles seront perdues.
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
        <Label>Marque</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Choisir ou saisir une marque" />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <Description>Une marque absente de la liste peut être saisie librement.</Description>
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
        Marque<span className="text-danger"> *</span>
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        onClick={() => setOpen(true)}
        className={sheetFieldClass}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-muted"}`}>
          {value || "Choisir une marque"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      <span className="text-xs text-muted">
        Une marque absente de la liste peut être saisie librement.
      </span>
      <BottomSheet isOpen={open} onOpenChange={setOpen} title="Marque">
        <div className="grid gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher ou saisir une marque"
            aria-label="Rechercher une marque"
            enterKeyHint="done"
            className="h-11 w-full rounded-full bg-surface-secondary px-4 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          <div
            role="listbox"
            aria-label="Marques"
            data-sheet-scroll
            className="grid max-h-[55dvh] gap-0.5 overflow-y-auto overscroll-contain"
          >
            {q && !exact && (
              <SheetOption icon={Plus} onPress={() => choose(query.trim())}>
                Utiliser « {query.trim()} »
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
