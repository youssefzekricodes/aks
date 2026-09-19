import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useBlocker } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { listSiteContent, saveSiteContent, readFileAsDataUrl } from "@/lib/data";
import {
  CONTENT_FIELDS,
  CONTENT_GROUPS,
  COLLECTION_DEFAULTS,
  COLLECTION_LABELS,
  SERVICE_ICONS,
  validateContentValue,
  type ContentField,
  type CollectionKey,
} from "./definition";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal";
type Item = Record<string, string | number>;

const hiddenGroups = new Set(["navbar", "card", "vehicle", "search"]);
const editorFields = CONTENT_FIELDS.filter(
  (field) => !hiddenGroups.has(field.group) && field.key !== "contact.items",
);
const editorGroups = Object.entries(CONTENT_GROUPS).filter(([key]) => !hiddenGroups.has(key));

export function ContentEditor() {
  const client = useQueryClient();
  const router = useRouter();
  const content = useQuery({ queryKey: ["admin-site-content"], queryFn: () => listSiteContent() });
  const [group, setGroup] = useState("identity");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
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
    onError: (error: Error) => toast.error(error.message),
  });
  useBlocker({
    shouldBlockFn: ({ next }) =>
      entries.length > 0 &&
      next.pathname !== "/auth" &&
      !window.confirm(
        "Des modifications ne sont pas publiées. Quitter cette page et les abandonner ?",
      ),
    enableBeforeUnload: entries.length > 0,
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

  if (content.isPending) return <p role="status">Chargement du contenu…</p>;
  if (content.isError)
    return (
      <div role="alert">
        <p>Impossible de charger le contenu.</p>
        <button onClick={() => content.refetch()} className="mt-3 underline">
          Réessayer
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Gérer le contenu du site</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Modifiez chaque rubrique, puis publiez vos changements. Les véhicules et leurs photos se
            gèrent dans l’onglet Véhicules.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          Voir le site
        </a>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          aria-label="Rechercher un contenu"
          placeholder="Rechercher un texte ou une rubrique…"
          className={`${inputClass} pl-10`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
        <nav
          aria-label="Rubriques de contenu"
          className="flex gap-2 overflow-x-auto md:block md:space-y-1"
        >
          {editorGroups.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setGroup(key);
                setSearch("");
              }}
              aria-current={group === key && !search ? "page" : undefined}
              className={`block shrink-0 rounded-lg px-3 py-2.5 text-left text-sm md:w-full ${group === key && !search ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              {label}
              {editorFields.some(
                (field) => field.group === key && draft[field.key] !== undefined,
              ) && <span aria-label="Modifications non publiées"> •</span>}
            </button>
          ))}
        </nav>
        <fieldset disabled={save.isPending || uploading} className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">
              {search ? `${visible.length} résultat(s)` : CONTENT_GROUPS[group]}
            </h3>
            {!search && (
              <button
                type="button"
                onClick={() => visible.forEach((field) => change(field, field.value))}
                className="text-xs text-muted-foreground underline"
              >
                Rétablir les valeurs initiales de cette rubrique
              </button>
            )}
          </div>
          {visible.map((field) => (
            <ContentInput
              key={field.key}
              field={field}
              value={valueOf(field)}
              onChange={(value) => change(field, value)}
              onUploading={setUploading}
            />
          ))}
          {!visible.length && (
            <p className="text-sm text-muted-foreground">Aucun contenu trouvé.</p>
          )}
        </fieldset>
      </div>
      <div className="sticky bottom-3 z-20 rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm">
            {entries.length
              ? `${entries.length} modification(s) non publiée(s)`
              : "Toutes les modifications sont publiées."}
            {uploading && " Chargement de l’image…"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!entries.length || save.isPending || uploading}
              onClick={() => setDraft({})}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              Annuler les modifications
            </button>
            <button
              type="button"
              disabled={!entries.length || save.isPending || uploading || errors.length > 0}
              onClick={() => save.mutate()}
              className="btn-3d btn-3d-primary px-5 py-2 text-sm disabled:opacity-40"
            >
              {save.isPending ? "Publication…" : "Publier les modifications"}
            </button>
          </div>
        </div>
        {errors.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errors[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function ContentInput({
  field,
  value,
  onChange,
  onUploading,
}: {
  field: ContentField;
  value: string;
  onChange: (value: string) => void;
  onUploading: (busy: boolean) => void;
}) {
  const id = `content-${field.key}`;
  const error = validateContentValue(field, value);
  if (field.type === "collection")
    return <CollectionInput field={field} value={value} onChange={onChange} />;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <label htmlFor={id} className="block text-sm font-semibold">
        {field.label}
      </label>
      {field.type === "boolean" ? (
        <label className="flex items-center gap-3 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === "true"}
            onChange={(event) => onChange(String(event.target.checked))}
          />
          Visible sur la page d’accueil
        </label>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          type="text"
        />
      )}
      {field.type === "image" && (
        <div className="space-y-3">
          {value && !error && (
            <img
              src={value}
              alt={`Aperçu — ${field.label}`}
              className="max-h-44 max-w-full rounded-lg border border-border object-contain"
            />
          )}
          <label className="block text-xs text-muted-foreground">
            Choisir une image JPG, PNG ou WebP (2 Mo maximum)
            <input
              aria-label={`Importer — ${field.label}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                onUploading(true);
                try {
                  onChange(await readFileAsDataUrl(file));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Import impossible.");
                } finally {
                  onUploading(false);
                }
              }}
            />
          </label>
        </div>
      )}
      {field.type === "map" && (
        <p className="text-xs text-muted-foreground">
          Collez l’URL d’intégration Google Maps ou OpenStreetMap, sans code HTML.
        </p>
      )}
      {field.type === "link" && (
        <p className="text-xs text-muted-foreground">
          Lien web, ancre (#contact), chemin (/recherche), téléphone (tel:) ou e-mail (mailto:).
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
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
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h4 className="font-semibold">{field.label}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Ajoutez, supprimez ou déplacez les éléments. Une liste vide n’affiche aucun élément.
        </p>
      </div>
      {rows.map((row, index) => (
        <fieldset key={index} className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-2 text-sm font-medium">Élément {index + 1}</legend>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Monter l’élément ${index + 1}`}
              className="rounded border p-2 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={index === rows.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Descendre l’élément ${index + 1}`}
              className="rounded border p-2 disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => update(rows.filter((_, i) => i !== index))}
              aria-label={`Supprimer l’élément ${index + 1}`}
              className="rounded border p-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {Object.entries(template).map(([key, example]) => {
            const change = (next: string | number) =>
              update(rows.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
            return (
              <label key={key} className="block space-y-1 text-sm">
                <span>{COLLECTION_LABELS[key] ?? key}</span>
                {key === "icon" ? (
                  <select
                    value={row[key]}
                    onChange={(event) => change(event.target.value)}
                    className={inputClass}
                  >
                    {SERVICE_ICONS.map((icon, i) => (
                      <option key={icon} value={icon}>
                        {["Financement", "Reprise", "Atelier", "Importation", "Garantie"][i]}
                      </option>
                    ))}
                  </select>
                ) : key === "text" ? (
                  <textarea
                    value={row[key]}
                    onChange={(event) => change(event.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type={typeof example === "number" ? "number" : "text"}
                    min={key === "stars" ? 1 : 0}
                    max={key === "stars" ? 5 : 100000000}
                    step={1}
                    value={row[key]}
                    onChange={(event) =>
                      change(
                        typeof example === "number"
                          ? Number(event.target.value)
                          : event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                )}
              </label>
            );
          })}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={rows.length >= 30}
        onClick={() =>
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
          ])
        }
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        Ajouter un élément
      </button>
    </section>
  );
}
