import { useId, useState } from "react";
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
  SearchField,
  Select,
  Skeleton,
  Switch,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImageOff,
  ImageUp,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { listSiteContent, prepareImage, saveSiteContent, uploadImage } from "@/lib/data";
import { useUploads, type UploadState } from "@/features/admin/hooks";
import {
  FilePickButton,
  IconButton,
  LoadError,
  PageHeader,
  UnsavedChangesDialog,
  UploadProgress,
} from "@/features/admin/ui";
import {
  CONTENT_FIELDS,
  CONTENT_GROUPS,
  COLLECTION_DEFAULTS,
  COLLECTION_LABELS,
  SERVICE_ICONS,
  SERVICE_LABELS,
  validateContentValue,
  type ContentField,
  type CollectionKey,
} from "./definition";

type Item = Record<string, string | number>;

const hiddenGroups = new Set(["navbar", "card", "vehicle", "search"]);
const editorFields = CONTENT_FIELDS.filter(
  (field) => !hiddenGroups.has(field.group) && field.key !== "contact.items",
);
const editorGroups = Object.entries(CONTENT_GROUPS).filter(([key]) => !hiddenGroups.has(key));

const cardClass = "rounded-2xl border border-separator bg-surface p-4 sm:p-6";
const MAX_SITE_IMAGE_BYTES = 3_000_000;

export function ContentEditor() {
  const client = useQueryClient();
  const router = useRouter();
  const content = useQuery({ queryKey: ["admin-site-content"], queryFn: () => listSiteContent() });
  const [group, setGroup] = useState("identity");
  const [search, setSearch] = useState("");
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
  const visible = editorFields.filter((field) =>
    search.trim()
      ? `${CONTENT_GROUPS[field.group]} ${field.label} ${field.type === "image" ? "" : valueOf(field)}`
          .toLocaleLowerCase("fr")
          .includes(search.toLocaleLowerCase("fr").trim())
      : field.group === group,
  );
  const busy = save.isPending;

  async function upload(field: ContentField, file: File) {
    const url = await uploads.run(field.key, async (report) => {
      const blob = await prepareImage(file);
      if (blob.size > MAX_SITE_IMAGE_BYTES)
        throw new Error("Image trop lourde : 3 Mo maximum après redimensionnement.");
      return uploadImage("site", blob, { scope: field.key, onProgress: report });
    });
    if (url) {
      change(field, url);
      toast.success("Image importée. Publiez les modifications pour l’afficher sur le site.");
    }
  }

  if (content.isPending)
    return (
      <div role="status" aria-label="Chargement du contenu" className="grid gap-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
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
        description="Modifiez chaque rubrique, puis publiez vos changements. Les véhicules et leurs photos se gèrent dans la section Véhicules."
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
      <SearchField value={search} onChange={setSearch} aria-label="Rechercher un contenu" fullWidth>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Rechercher un texte ou une rubrique…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Rubriques de contenu" className="min-w-0">
          <ul className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
            {editorGroups.map(([key, label]) => {
              const active = group === key && !search;
              const dirty = editorFields.some(
                (field) => field.group === key && draft[field.key] !== undefined,
              );
              return (
                <li key={key} className="shrink-0">
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    fullWidth
                    {...(active ? { "aria-current": "page" as const } : {})}
                    className="justify-between gap-2 text-start"
                    onPress={() => {
                      setGroup(key);
                      setSearch("");
                    }}
                  >
                    <span className="truncate">{label}</span>
                    {dirty && (
                      <span className="size-2 shrink-0 rounded-full bg-warning">
                        <span className="sr-only">Modifications non publiées</span>
                      </span>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
        <fieldset disabled={busy} className="grid min-w-0 content-start gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {search ? `${visible.length} résultat(s)` : CONTENT_GROUPS[group]}
            </h2>
            {!search && (
              <Button
                variant="tertiary"
                size="sm"
                isDisabled={busy}
                onPress={() => visible.forEach((field) => change(field, field.value))}
              >
                Rétablir les valeurs initiales de cette rubrique
              </Button>
            )}
          </div>
          {visible.map((field) => (
            <ContentInput
              key={field.key}
              field={field}
              value={valueOf(field)}
              onChange={(value) => change(field, value)}
              upload={uploads.states[field.key]}
              onUpload={(file) => void upload(field, file)}
              isDisabled={busy}
            />
          ))}
          {!visible.length && (
            <p className={`${cardClass} text-center text-sm text-muted`}>Aucun contenu trouvé.</p>
          )}
        </fieldset>
      </div>
      <div className="sticky bottom-4 z-20 rounded-2xl border border-separator bg-surface p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p aria-live="polite" className="flex items-center gap-2 text-sm text-foreground">
            {entries.length > 0 && <span className="size-2 rounded-full bg-warning" aria-hidden />}
            {entries.length
              ? `${entries.length} modification(s) non publiée(s)`
              : "Toutes les modifications sont publiées."}
            {uploading && " · Envoi d’image en cours…"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="tertiary"
              isDisabled={!entries.length || busy || uploading}
              onPress={() => setDraft({})}
            >
              Annuler les modifications
            </Button>
            <Button
              isDisabled={!entries.length || uploading || errors.length > 0}
              isPending={save.isPending}
              onPress={() => save.mutate()}
            >
              {save.isPending ? "Publication…" : "Publier les modifications"}
            </Button>
          </div>
        </div>
        {errors.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {errors[0]}
          </p>
        )}
      </div>
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
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
  upload: UploadState | undefined;
  onUpload: (file: File) => void;
  isDisabled: boolean;
}) {
  const error = validateContentValue(field, value);
  if (field.type === "collection")
    return <CollectionInput field={field} value={value} onChange={onChange} />;
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

  const help = HELP[field.type];
  return (
    <div className={`${cardClass} grid gap-4`}>
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
  isDisabled,
}: {
  field: ContentField;
  value: string;
  error: string | null | undefined;
  upload: UploadState | undefined;
  onUpload: (file: File) => void;
  onClear: () => void;
  isDisabled: boolean;
}) {
  const working = upload?.status === "working";
  return (
    <div className="flex flex-wrap items-start gap-4">
      {value && !error ? (
        <img
          src={value}
          alt={`Aperçu — ${field.label}`}
          className="max-h-40 max-w-full rounded-xl border border-separator bg-surface-secondary object-contain"
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
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
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
    <section className={`${cardClass} grid gap-4`}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
        <p className="mt-1 text-sm text-muted">
          Ajoutez, supprimez ou déplacez les éléments. Une liste vide n’affiche aucun élément.
        </p>
      </div>
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
