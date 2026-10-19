import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useBlocker } from "@tanstack/react-router";
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Skeleton,
  Switch,
  Tabs,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Crop as CropIcon,
  ExternalLink,
  ImageOff,
  ImageUp,
  LayoutTemplate,
  PanelTop,
  Phone as PhoneIcon,
  Plus,
  Shapes,
  Star,
  Trash2,
  type LucideIcon,
  StarFill,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { CROP_PRESETS, ImageCropDialog, type CropOptions } from "@/features/admin/ImageCropDialog";
import { prepareImage, saveSiteContent, uploadImage } from "@/lib/data";
import { useUploads, type UploadState } from "@/features/admin/hooks";
import { adminContentQuery } from "@/features/admin/model";
import {
  FilePickButton,
  IconButton,
  LoadError,
  PageHeader,
  UnsavedChangesDialog,
  UploadProgress,
} from "@/features/admin/ui";
import {
  CONTENT_BY_KEY,
  isPhoneNumber,
  type Phone,
  COLLECTION_DEFAULTS,
  COLLECTION_LABELS,
  SERVICE_ICONS,
  SERVICE_LABELS,
  validateContentValue,
  type ContentField,
  type CollectionKey,
} from "./definition";

type Item = Record<string, string | number>;

/* ------------------------------------------------------------------ rubrics */

type FieldRef = { key: string; label?: string; help?: string };
type Block = { title?: string; description?: string; fields: FieldRef[] };
type Rubric = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  blocks: Block[];
};

/**
 * What the team edits day to day. Interface labels, SEO texts and the other
 * sections keep their saved or built-in values (still in fields.json).
 */
const RUBRICS: Rubric[] = [
  {
    id: "logo",
    label: "Logo",
    icon: Shapes,
    description: "Logo de l’en-tête et du pied de page, et icône de l’onglet du navigateur.",
    blocks: [
      {
        fields: [
          {
            key: "identity.logo",
            label: "Logo du site",
            help: "PNG ou WebP à fond transparent. Il s’affiche sur le bandeau sombre de l’en-tête : prévoyez une version claire.",
          },
          {
            key: "identity.favicon",
            label: "Icône de l’onglet (favicon)",
            help: "Image carrée, au moins 64 × 64 px.",
          },
        ],
      },
    ],
  },
  {
    id: "banner",
    label: "Bannière d’accueil",
    icon: PanelTop,
    description: "Le grand bandeau en haut de la page d’accueil.",
    blocks: [
      {
        title: "Photos",
        description:
          "Une photo pour les ordinateurs et tablettes, une autre (facultative) pour les téléphones. Sans photo mobile, la photo ordinateur est utilisée et ses bords sont coupés.",
        fields: [
          {
            key: "hero.image_1",
            label: "Ordinateur — format paysage",
            help: "Au moins 1 920 px de large. Le texte s’affiche en blanc sur la partie gauche.",
          },
          {
            key: "hero.image_mobile",
            label: "Téléphone — format portrait (facultatif)",
            help: "Au moins 1 080 px de large, au format 4:5 ou 9:16.",
          },
        ],
      },
      {
        title: "Texte",
        fields: [
          { key: "hero.text_26", label: "Titre — première ligne" },
          { key: "hero.text_27", label: "Titre — deuxième ligne (en rouge)" },
          { key: "hero.textarea_1", label: "Texte sous le titre" },
        ],
      },
    ],
  },
  {
    id: "hours",
    label: "Horaires",
    icon: Clock,
    description: "Affichés dans la bannière, le showroom et la page Contact.",
    blocks: [
      {
        description: "Une ligne par période, par exemple « Lundi – Samedi » et « Dimanche ».",
        fields: [{ key: "showroom.items" }],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: PhoneIcon,
    description:
      "Coordonnées utilisées sur tout le site : en-tête, fiche véhicule, showroom, Contact et pied de page.",
    blocks: [
      {
        title: "Téléphones",
        description:
          "Le numéro principal s’affiche dans l’en-tête et sur les boutons « Appeler ». Les numéros WhatsApp alimentent les boutons WhatsApp.",
        fields: [{ key: "contact.phones" }],
      },
      {
        title: "E-mail et adresse",
        fields: [
          { key: "identity.email", label: "Adresse e-mail" },
          { key: "showroom.text_3", label: "Adresse du showroom" },
        ],
      },
      {
        title: "Carte",
        fields: [
          {
            key: "showroom.link_1",
            label: "Lien Google Maps (bouton « Itinéraire »)",
            help: "Dans Google Maps : Partager → Copier le lien.",
          },
          {
            key: "showroom.map_1",
            label: "Carte intégrée",
            help: 'Dans Google Maps : Partager → Intégrer une carte, puis copiez seulement l’adresse entre les guillemets de src="…".',
          },
        ],
      },
      {
        title: "Avis Google",
        description:
          "Affichés dans la section « Ils nous font confiance » : la note en étoiles et un bouton pour laisser un avis. Laissez la note vide pour utiliser celle des témoignages.",
        fields: [
          {
            key: "reviews.google_rating",
            label: "Note Google",
            help: "Par exemple 4,8 (visible sur votre fiche Google).",
          },
          { key: "reviews.google_count", label: "Nombre d’avis", help: "Par exemple 37." },
          {
            key: "reviews.google_review_link",
            label: "Lien « Laisser un avis »",
            help: "Google Business Profile → « Demander des avis » → copiez le lien. Vide : le bouton ouvre votre fiche Google Maps.",
          },
        ],
      },
      {
        title: "Réseaux sociaux",
        description: "Laissez vide pour masquer l’icône.",
        fields: [
          { key: "contact.link_1", label: "Page Facebook" },
          { key: "contact.link_instagram", label: "Compte Instagram" },
        ],
      },
      {
        title: "Pied de page",
        fields: [{ key: "contact.text_12", label: "Présentation courte (sous le logo)" }],
      },
    ],
  },
  {
    id: "sections",
    label: "Sections de l’accueil",
    icon: LayoutTemplate,
    description: "Choisissez les blocs affichés sur la page d’accueil.",
    blocks: [],
  },
];

/** Home page sections, top to bottom (same order as routes/index.tsx). */
const HOME_SECTIONS: { key: string; label: string; content: string; height: number }[] = [
  {
    key: "hero",
    label: "Bannière",
    content: "Grande photo, titre et recherche rapide",
    height: 16,
  },
  { key: "brands", label: "Marques", content: "Carrousel des logos de marques", height: 6 },
  {
    key: "bodies",
    label: "Carrosseries",
    content: "Silhouettes : SUV, berline, citadine…",
    height: 6,
  },
  {
    key: "inventory",
    label: "Véhicules en vitrine",
    content: "Une sélection du stock",
    height: 14,
  },
  {
    key: "sell",
    label: "Reprise",
    content: "Bandeau « Vous voulez vendre votre voiture ? »",
    height: 5,
  },
  { key: "about", label: "À propos", content: "Présentation et années d’expérience", height: 9 },
  {
    key: "services",
    label: "Services",
    content: "Achat, reprise, échange, importation…",
    height: 9,
  },
  { key: "testimonials", label: "Avis clients", content: "Témoignages avec étoiles", height: 8 },
  { key: "showroom", label: "Showroom", content: "Adresse, horaires et carte", height: 10 },
];

const fieldFor = (ref: FieldRef): ContentField | null => {
  const field = CONTENT_BY_KEY.get(ref.key);
  return field ? { ...field, label: ref.label ?? field.label } : null;
};
const rubricFields = (rubric: Rubric): ContentField[] =>
  rubric.id === "sections"
    ? HOME_SECTIONS.map((s) => CONTENT_BY_KEY.get(`sections.${s.key}`)).filter(
        (f): f is ContentField => !!f,
      )
    : rubric.blocks.flatMap((block) =>
        block.fields.map(fieldFor).filter((f): f is ContentField => !!f),
      );
const editorFields = RUBRICS.flatMap(rubricFields);

/** Pictures opened in the crop editor before upload (others upload as picked). */
const CROP_BY_FIELD: Record<string, CropOptions> = {
  "identity.logo": CROP_PRESETS.logo,
  "identity.favicon": CROP_PRESETS.favicon,
  "hero.image_1": CROP_PRESETS.banner,
  "hero.image_mobile": CROP_PRESETS.bannerMobile,
};
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const cardClass = "rounded-2xl border border-separator bg-surface p-4 sm:p-6";
const MAX_SITE_IMAGE_BYTES = 3_000_000;

export function ContentEditor() {
  const client = useQueryClient();
  const router = useRouter();
  const content = useQuery(adminContentQuery);
  const [rubricId, setRubricId] = useState(RUBRICS[0]!.id);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const uploads = useUploads();
  const uploading = uploads.busy > 0;
  const saved = Object.fromEntries((content.data ?? []).map((row) => [row.key, row.value]));
  const entries = Object.entries(draft).map(([key, value]) => ({ key, value }));
  const valueOf = (field: ContentField) => draft[field.key] ?? saved[field.key] ?? field.value;
  const errors = editorFields
    .map((field) => validateContentValue(field, valueOf(field)))
    .filter(Boolean);
  const save = useMutation({
    mutationFn: () => saveSiteContent({ data: { entries } }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-site-content"] }),
        client.invalidateQueries({ queryKey: ["site-content"] }),
      ]);
      setDraft({});
      await router.invalidate();
      toast.success("Les modifications sont publiées sur le site.");
    },
    onError: (error: Error) => toast.danger(error.message),
  });
  // Only leaving the admin page counts: its sections share the path and keep this editor mounted.
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      entries.length > 0 && next.pathname !== current.pathname && next.pathname !== "/auth",
    enableBeforeUnload: entries.length > 0,
    withResolver: true,
  });

  function change(field: ContentField, value: string) {
    setDraft((current) => {
      const next = { ...current };
      if (value === (saved[field.key] ?? field.value)) delete next[field.key];
      else next[field.key] = value;
      return next;
    });
  }
  const rubric = RUBRICS.find((r) => r.id === rubricId) ?? RUBRICS[0]!;
  // Small screens: the tab row scrolls; keep the selected tab visible.
  useEffect(() => {
    document
      .querySelector(`[role="tab"][data-key="${rubricId}"], [role="tab"][aria-selected="true"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [rubricId]);
  const busy = save.isPending;

  // Picked or saved picture being cropped before upload.
  const [cropping, setCropping] = useState<{ field: ContentField; source: File | string } | null>(
    null,
  );

  /** A picked file: checked, then opened in the crop editor (fields with a preset). */
  function pick(field: ContentField, file: File) {
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.danger(`« ${file.name} » : JPG, PNG ou WebP uniquement.`);
      return;
    }
    if (CROP_BY_FIELD[field.key]) setCropping({ field, source: file });
    else void upload(field, file);
  }

  async function upload(field: ContentField, file: Blob) {
    const url = await uploads.run(field.key, async (report) => {
      const blob = file instanceof File ? await prepareImage(file) : file;
      if (blob.size > MAX_SITE_IMAGE_BYTES)
        throw new Error("Image trop lourde : 3 Mo maximum après redimensionnement.");
      return uploadImage("site", blob, { scope: field.key, onProgress: report });
    });
    if (url) {
      change(field, url);
      toast.success("Image enregistrée. Publiez les modifications pour l’afficher sur le site.");
    }
  }

  const input = (field: ContentField) =>
    field.key === "showroom.items" ? (
      <HoursInput
        key={field.key}
        field={field}
        value={valueOf(field)}
        onChange={(value) => change(field, value)}
      />
    ) : field.key === "contact.phones" ? (
      <PhonesInput
        key={field.key}
        field={field}
        value={valueOf(field)}
        onChange={(value) => change(field, value)}
      />
    ) : (
      <ContentInput
        key={field.key}
        field={field}
        value={valueOf(field)}
        onChange={(value) => change(field, value)}
        upload={uploads.states[field.key]}
        onUpload={(file) => pick(field, file)}
        {...(CROP_BY_FIELD[field.key]
          ? { onRecrop: () => setCropping({ field, source: valueOf(field) }) }
          : {})}
        isDisabled={busy}
        bare
      />
    );

  if (content.isPending)
    return (
      <div role="status" aria-label="Chargement du contenu" className="grid gap-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  if (content.isError)
    return (
      <div className="grid gap-6">
        <PageHeader title="Contenu du site" />
        <LoadError message="Impossible de charger le contenu." onRetry={() => content.refetch()} />
      </div>
    );
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Contenu du site"
        description="Logo, bannière, horaires et coordonnées. Modifiez, puis publiez : le site est mis à jour immédiatement."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            <ExternalLink className="size-4" aria-hidden />
            Voir le site
          </a>
        }
      />
      <Tabs
        selectedKey={rubric.id}
        onSelectionChange={(key) => setRubricId(String(key))}
        className="grid gap-6"
      >
        <Tabs.ListContainer className="overflow-x-auto">
          <Tabs.List aria-label="Rubriques de contenu" className="w-max min-w-full">
            {RUBRICS.map((item) => {
              const dirty = rubricFields(item).some((field) => draft[field.key] !== undefined);
              const Icon = item.icon;
              return (
                <Tabs.Tab key={item.id} id={item.id} className="gap-2 whitespace-nowrap">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                  {dirty && (
                    <span className="size-2 shrink-0 rounded-full bg-warning">
                      <span className="sr-only"> — modifications non publiées</span>
                    </span>
                  )}
                  <Tabs.Indicator />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
        {RUBRICS.map((item) => (
          <Tabs.Panel key={item.id} id={item.id} className="min-w-0">
            <fieldset disabled={busy} className="grid min-w-0 content-start gap-4">
              <p className="text-sm text-muted">{item.description}</p>
              {item.id === "sections" ? (
                <SectionsInput
                  valueOf={(key) => {
                    const field = CONTENT_BY_KEY.get(`sections.${key}`);
                    return field ? valueOf(field) : "true";
                  }}
                  onChange={(key, on) => {
                    const field = CONTENT_BY_KEY.get(`sections.${key}`);
                    if (field) change(field, String(on));
                  }}
                  isDisabled={busy}
                />
              ) : (
                item.blocks.map((block) => (
                  <section key={block.title ?? "main"} className={`${cardClass} grid gap-5`}>
                    {(block.title || block.description) && (
                      <div>
                        {block.title && (
                          <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                        )}
                        {block.description && (
                          <p className={cn("text-sm text-muted", block.title && "mt-1")}>
                            {block.description}
                          </p>
                        )}
                      </div>
                    )}
                    {block.fields.map((ref) => {
                      const field = fieldFor(ref);
                      if (!field) return null;
                      return (
                        <div key={field.key} className="grid gap-1.5">
                          {input(field)}
                          {ref.help && <p className="text-xs text-muted">{ref.help}</p>}
                        </div>
                      );
                    })}
                  </section>
                ))
              )}
            </fieldset>
          </Tabs.Panel>
        ))}
      </Tabs>
      {/* Phones: stays clear of the home bar. */}
      <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-separator bg-surface p-3 shadow-lg sm:p-4 lg:bottom-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p
            aria-live="polite"
            className="flex items-center gap-2 text-xs text-foreground sm:text-sm"
          >
            {entries.length > 0 && <span className="size-2 rounded-full bg-warning" aria-hidden />}
            {entries.length
              ? `${entries.length} modification(s) non publiée(s)`
              : "Toutes les modifications sont publiées."}
            {uploading && " · Envoi d’image en cours…"}
          </p>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="tertiary"
              className="w-full sm:w-auto"
              isDisabled={!entries.length || busy || uploading}
              onPress={() => setDraft({})}
            >
              Annuler<span className="max-sm:hidden"> les modifications</span>
            </Button>
            <Button
              className="w-full sm:w-auto"
              isDisabled={!entries.length || uploading || errors.length > 0}
              isPending={save.isPending}
              onPress={() => save.mutate()}
            >
              {save.isPending ? (
                "Publication…"
              ) : (
                <>
                  Publier<span className="max-sm:hidden"> les modifications</span>
                </>
              )}
            </Button>
          </div>
        </div>
        {errors.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errors[0]}
          </p>
        )}
      </div>
      <ImageCropDialog
        source={cropping?.source ?? null}
        options={cropping ? CROP_BY_FIELD[cropping.field.key]! : CROP_PRESETS.banner}
        onCancel={() => setCropping(null)}
        onConfirm={async (blob) => {
          const field = cropping!.field;
          setCropping(null);
          await upload(field, blob);
        }}
      />
      <UnsavedChangesDialog
        isOpen={blocker.status === "blocked"}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      >
        <p>
          {entries.length > 1
            ? `${entries.length} modifications du contenu ne sont pas publiées.`
            : "Une modification du contenu n’est pas publiée."}{" "}
          Elles seront perdues si vous quittez cette page.
        </p>
      </UnsavedChangesDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ home sections */

/** Miniature of the home page with `active` highlighted and hidden sections hatched. */
function PageWireframe({ active, hidden }: { active: string; hidden: Set<string> }) {
  return (
    <div
      aria-hidden
      className="flex w-14 shrink-0 flex-col gap-[3px] rounded-md border border-separator bg-background p-1"
    >
      <span className="h-[4px] rounded-[2px] bg-foreground/70" />
      {HOME_SECTIONS.map((section) => (
        <span
          key={section.key}
          style={{ height: section.height }}
          className={cn(
            "rounded-[2px]",
            section.key === active
              ? hidden.has(section.key)
                ? "border border-dashed border-accent bg-transparent"
                : "bg-accent"
              : hidden.has(section.key)
                ? "border border-dashed border-border bg-transparent"
                : "bg-surface-secondary",
          )}
        />
      ))}
      <span className="h-[5px] rounded-[2px] bg-foreground/70" />
    </div>
  );
}

function SectionsInput({
  valueOf,
  onChange,
  isDisabled,
}: {
  valueOf: (key: string) => string;
  onChange: (key: string, on: boolean) => void;
  isDisabled: boolean;
}) {
  const hidden = new Set(HOME_SECTIONS.filter((s) => valueOf(s.key) !== "true").map((s) => s.key));
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {HOME_SECTIONS.map((section, index) => {
        const visible = !hidden.has(section.key);
        return (
          <li
            key={section.key}
            className={cn(
              cardClass,
              "flex items-start gap-4 p-4 sm:p-4",
              !visible && "bg-background",
            )}
          >
            <PageWireframe active={section.key} hidden={hidden} />
            <div className="grid min-w-0 flex-1 gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  <span className="tabular-nums text-muted">{index + 1}. </span>
                  {section.label}
                </p>
                <p className="mt-0.5 text-xs text-muted">{section.content}</p>
              </div>
              <Switch
                isSelected={visible}
                onChange={(on) => onChange(section.key, on)}
                isDisabled={isDisabled}
                aria-label={`Afficher la section ${section.label} sur la page d’accueil`}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <span className="text-sm">{visible ? "Affichée" : "Masquée"}</span>
                </Switch.Content>
              </Switch>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ hours */

type HoursRow = { day: string; time: string };

/** Opening hours: one row per day range, e.g. "Lundi – Samedi" / "09:00 – 19:00". */
function HoursInput({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
}) {
  let rows: HoursRow[];
  try {
    rows = JSON.parse(value) as HoursRow[];
  } catch {
    rows = [];
  }
  const update = (next: HoursRow[]) => onChange(JSON.stringify(next));
  const error = validateContentValue(field, value);
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div
          key={index}
          role="group"
          aria-label={`Horaires ${index + 1}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <TextField
            value={row.day}
            onChange={(day) => update(rows.map((r, i) => (i === index ? { ...r, day } : r)))}
            className="col-span-2 sm:col-span-1"
            fullWidth
          >
            <Label>Jour(s)</Label>
            <Input placeholder="Ex. Lundi – Samedi" />
          </TextField>
          <TextField
            value={row.time}
            onChange={(time) => update(rows.map((r, i) => (i === index ? { ...r, time } : r)))}
            fullWidth
          >
            <Label>Horaires</Label>
            <Input placeholder="Ex. 09:00 – 19:00 ou Fermé" />
          </TextField>
          <IconButton
            label={`Supprimer « ${row.day || `ligne ${index + 1}`} »`}
            icon={Trash2}
            variant="danger-soft"
            onPress={() => update(rows.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={rows.length >= 7}
          onPress={() => update([...rows, { day: "", time: "" }])}
        >
          <Plus className="size-4" aria-hidden />
          Ajouter une ligne
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ phones */

type PhoneRow = Phone;

/** Phone list: label, number, WhatsApp switch, and exactly one primary number. */
function PhonesInput({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
}) {
  let rows: PhoneRow[];
  try {
    rows = JSON.parse(value) as PhoneRow[];
  } catch {
    rows = [];
  }
  const update = (next: PhoneRow[]) => {
    // Always exactly one primary number while the list is not empty.
    if (next.length && !next.some((row) => row.primary)) next[0] = { ...next[0]!, primary: true };
    onChange(JSON.stringify(next));
  };
  const set = (index: number, patch: Partial<PhoneRow>) =>
    update(
      rows.map((row, i) =>
        i === index ? { ...row, ...patch } : patch.primary ? { ...row, primary: false } : row,
      ),
    );
  const error = validateContentValue(field, value);
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div
          key={index}
          role="group"
          aria-label={`Numéro ${index + 1}`}
          className="grid gap-3 rounded-xl border border-separator bg-background p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end"
        >
          <TextField
            value={row.label}
            onChange={(label) => set(index, { label })}
            maxLength={60}
            fullWidth
          >
            <Label>Libellé</Label>
            <Input placeholder="Ex. Showroom, Commercial…" />
          </TextField>
          <TextField
            value={row.number}
            onChange={(number) => set(index, { number })}
            isInvalid={row.number !== "" && !isPhoneNumber(row.number)}
            isRequired
            fullWidth
          >
            <Label>Numéro</Label>
            <Input type="tel" inputMode="tel" placeholder="+216 52 144 869" />
            <FieldError>Numéro non valide.</FieldError>
          </TextField>
          <IconButton
            label={`Supprimer le numéro ${row.number || index + 1}`}
            icon={Trash2}
            variant="danger-soft"
            isDisabled={rows.length <= 1}
            onPress={() => update(rows.filter((_, i) => i !== index))}
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-3">
            <Switch isSelected={row.whatsapp} onChange={(whatsapp) => set(index, { whatsapp })}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span className="text-sm">Disponible sur WhatsApp</span>
              </Switch.Content>
            </Switch>
            {row.primary ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <StarFill className="size-4" aria-hidden />
                Numéro principal
              </span>
            ) : (
              <Button size="sm" variant="ghost" onPress={() => set(index, { primary: true })}>
                <Star className="size-4" aria-hidden />
                Définir comme principal
              </Button>
            )}
          </div>
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={rows.length >= 6}
          onPress={() =>
            update([
              ...rows,
              { label: "", number: "", whatsapp: false, primary: rows.length === 0 },
            ])
          }
        >
          <Plus className="size-4" aria-hidden />
          Ajouter un numéro
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

const HELP: Partial<Record<ContentField["type"], string>> = {
  map: "Collez l’URL d’intégration Google Maps ou OpenStreetMap, sans code HTML.",
  link: "Lien web, ancre (#contact), chemin (/recherche), téléphone (tel:) ou e-mail (mailto:).",
  image: "Adresse d’une image (https://… ou /chemin), ou importez un fichier ci-dessous.",
};

function ContentInput({
  field,
  value,
  onChange,
  upload,
  onUpload,
  isDisabled,
  bare = false,
  onRecrop,
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
  upload: UploadState | undefined;
  onUpload: (file: File) => void;
  isDisabled: boolean;
  /** Opens the crop editor on the current picture. */
  onRecrop?: (() => void) | undefined;
  /** Inside a section card: no card of its own and no generic help text. */
  bare?: boolean;
}) {
  const error = validateContentValue(field, value);
  if (field.type === "collection")
    return <CollectionInput field={field} value={value} onChange={onChange} bare={bare} />;
  if (field.type === "boolean")
    return (
      <div className={`${cardClass} grid gap-3`}>
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <Switch
          isSelected={value === "true"}
          onChange={(on) => onChange(String(on))}
          isDisabled={isDisabled}
          aria-label={`${field.label} — visible sur la page d’accueil`}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className="text-sm">Visible sur la page d’accueil</span>
          </Switch.Content>
        </Switch>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );

  // Simple mode: images are replaced by upload only (no address field).
  if (bare && field.type === "image")
    return (
      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <ImageControls
          field={field}
          value={value}
          error={error}
          upload={upload}
          onUpload={onUpload}
          onClear={() => onChange("")}
          onRecrop={onRecrop}
          isDisabled={isDisabled}
        />
      </div>
    );
  const help = bare ? undefined : HELP[field.type];
  return (
    <div className={bare ? "grid gap-4" : `${cardClass} grid gap-4`}>
      <TextField
        value={value}
        onChange={onChange}
        isInvalid={!!error}
        isDisabled={isDisabled}
        fullWidth
      >
        <Label>{field.label}</Label>
        {field.type === "textarea" ? <TextArea rows={4} /> : <Input type="text" />}
        {help && <Description>{help}</Description>}
        <FieldError>{error}</FieldError>
      </TextField>
      {field.type === "image" && (
        <ImageControls
          field={field}
          value={value}
          error={error}
          upload={upload}
          onUpload={onUpload}
          onClear={() => onChange("")}
          onRecrop={onRecrop}
          isDisabled={isDisabled}
        />
      )}
    </div>
  );
}

function ImageControls({
  field,
  value,
  error,
  upload,
  onUpload,
  onClear,
  onRecrop,
  isDisabled,
}: {
  field: ContentField;
  value: string;
  error: string | null | undefined;
  upload: UploadState | undefined;
  onUpload: (file: File) => void;
  onClear: () => void;
  onRecrop?: (() => void) | undefined;
  isDisabled: boolean;
}) {
  const working = upload?.status === "working";
  return (
    <div className="flex flex-wrap items-start gap-4">
      {value && !error ? (
        <img
          src={value}
          alt={`Aperçu — ${field.label}`}
          className={cn(
            "max-h-40 max-w-full rounded-xl border border-separator object-contain",
            // The logo is light (made for the dark header): preview it on dark.
            field.key === "identity.logo"
              ? "bg-[oklch(0.17_0.004_286)] px-6 py-4"
              : "bg-surface-secondary",
          )}
        />
      ) : (
        <div className="flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-background text-muted">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-xs">{value ? "Aperçu indisponible" : "Aucune image"}</span>
        </div>
      )}
      <div className="grid min-w-0 flex-1 basis-56 content-start gap-2">
        <div className="flex flex-wrap gap-2">
          <FilePickButton
            size="sm"
            isDisabled={isDisabled || working}
            onSelect={(files) => files[0] && onUpload(files[0])}
          >
            <ImageUp className="size-4" aria-hidden />
            {working ? "Envoi…" : value ? "Remplacer l’image" : "Importer une image"}
          </FilePickButton>
          {value && !error && onRecrop && (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isDisabled || working}
              onPress={onRecrop}
            >
              <CropIcon className="size-4" aria-hidden />
              Recadrer
            </Button>
          )}
          {value && (
            <Button size="sm" variant="ghost" isDisabled={isDisabled || working} onPress={onClear}>
              Retirer l’image
            </Button>
          )}
        </div>
        <span className="text-xs text-muted">
          JPG, PNG ou WebP · 3 Mo maximum après redimensionnement
        </span>
        {upload?.status === "working" && (
          <div className="max-w-xs">
            <UploadProgress state={upload} label={`Envoi de l’image — ${field.label}`} />
          </div>
        )}
        {upload?.status === "error" && (
          <p role="alert" className="text-sm text-danger">
            {upload.message}
          </p>
        )}
      </div>
    </div>
  );
}

function CollectionInput({
  field,
  value,
  onChange,
  bare = false,
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
  bare?: boolean;
}) {
  const template = COLLECTION_DEFAULTS[field.key as CollectionKey][0]! as Item;
  let rows: Item[];
  try {
    rows = JSON.parse(value) as Item[];
  } catch {
    rows = [];
  }
  const update = (next: Item[]) => onChange(JSON.stringify(next));
  const move = (index: number, by: number) => {
    const next = [...rows];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    update(next);
  };
  const add = () =>
    update([
      ...rows,
      Object.fromEntries(
        Object.entries(template).map(([key, example]) => [
          key,
          typeof example === "number"
            ? key === "stars"
              ? 5
              : 0
            : key === "icon"
              ? "ShieldCheck"
              : "",
        ]),
      ),
    ]);
  return (
    <section className={bare ? "grid gap-4" : `${cardClass} grid gap-4`}>
      {!bare && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
          <p className="mt-1 text-sm text-muted">
            Ajoutez, supprimez ou déplacez les éléments. Une liste vide n’affiche aucun élément.
          </p>
        </div>
      )}
      {rows.map((row, index) => (
        <div
          key={index}
          role="group"
          aria-labelledby={`${field.key}-item-${index}`}
          className="grid gap-4 rounded-xl border border-separator bg-background p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 id={`${field.key}-item-${index}`} className="text-sm font-medium text-foreground">
              Élément {index + 1}
            </h4>
            <div className="flex gap-1">
              <IconButton
                label={`Monter l’élément ${index + 1}`}
                icon={ArrowUp}
                isDisabled={index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                label={`Descendre l’élément ${index + 1}`}
                icon={ArrowDown}
                isDisabled={index === rows.length - 1}
                onPress={() => move(index, 1)}
              />
              <IconButton
                label={`Supprimer l’élément ${index + 1}`}
                icon={Trash2}
                variant="danger-soft"
                onPress={() => update(rows.filter((_, i) => i !== index))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(template).map(([key, example]) => {
              const label = COLLECTION_LABELS[key] ?? key;
              const current = row[key];
              const change = (next: string | number) =>
                update(rows.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
              if (key === "icon")
                return (
                  <Select
                    key={key}
                    value={String(current ?? "")}
                    onChange={(next) => {
                      if (typeof next === "string") change(next);
                    }}
                    fullWidth
                  >
                    <Label>{label}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {SERVICE_ICONS.map((icon) => (
                          <ListBox.Item
                            key={icon}
                            id={icon}
                            textValue={SERVICE_LABELS[icon] ?? icon}
                          >
                            {SERVICE_LABELS[icon] ?? icon}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                );
              if (key === "stars")
                return (
                  <StarRating
                    key={key}
                    label={label}
                    value={typeof current === "number" ? current : Number(current) || 5}
                    onChange={change}
                  />
                );
              if (typeof example === "number")
                return (
                  <NumberField
                    key={key}
                    value={typeof current === "number" ? current : Number(current) || 0}
                    onChange={(next) => change(next === undefined || Number.isNaN(next) ? 0 : next)}
                    minValue={key === "stars" ? 1 : 0}
                    maxValue={key === "stars" ? 5 : 100_000_000}
                    formatOptions={{ maximumFractionDigits: 0 }}
                    fullWidth
                  >
                    <Label>{label}</Label>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>
                );
              return (
                <TextField
                  key={key}
                  value={String(current ?? "")}
                  onChange={change}
                  fullWidth
                  className={key === "text" ? "sm:col-span-2" : ""}
                >
                  <Label>{label}</Label>
                  {key === "text" ? <TextArea rows={3} /> : <Input />}
                </TextField>
              );
            })}
          </div>
        </div>
      ))}
      <div>
        <Button variant="secondary" size="sm" isDisabled={rows.length >= 30} onPress={add}>
          <Plus className="size-4" aria-hidden />
          Ajouter un élément
        </Button>
      </div>
    </section>
  );
}

const clamp = (stars: number) => Math.min(5, Math.max(1, stars));

/** 1–5 stars as a radio group (arrow keys move, Tab leaves). */
function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <span id={id} className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex items-center gap-1"
        onKeyDown={(e) => {
          const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          const next = clamp(value + step);
          onChange(next);
          e.currentTarget.querySelectorAll("button")[next - 1]?.focus();
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            tabIndex={star === value ? 0 : -1}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Star
              aria-hidden
              className={`size-6 ${star <= value ? "fill-accent text-accent" : "text-border"}`}
            />
          </button>
        ))}
        <span className="ms-2 text-sm tabular-nums text-muted">{value}/5</span>
      </div>
    </div>
  );
}
