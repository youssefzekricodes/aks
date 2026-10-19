import { useEffect, useRef, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, Button, Input, Label, TextArea, TextField, toast } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Check, ExternalLink, EyeOff, Link2, RefreshCw, RotateCcw } from "@/components/icons";
import { FacebookLogo } from "@/components/aks/SocialLogos";
import { brandInfo } from "@/features/catalog/brands";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  COUNTRY_LABELS,
  GEARBOX_LABELS,
} from "@/lib/cars";
import {
  decideFacebookPost,
  importFacebookPost,
  listFacebookInbox,
  syncFacebook,
} from "@/lib/data";
import type { InboxItem, InboxStatus } from "@/server/repository";
import {
  adminCarsQuery,
  adminCarsQueryKey,
  dateTimeFormat,
  plural,
  toOptions,
  type AdminCar,
} from "./model";
import { socialStatusQuery } from "./SocialCard";
import { EmptyState, IntegerField, PageHeader, SelectField } from "./ui";
import { FacebookPostsSkeleton } from "./skeletons";

const inboxQuery = queryOptions({
  queryKey: ["admin-facebook-inbox"],
  queryFn: () => listFacebookInbox(),
});

/** A sync on opening the page when the last one is older than this. */
const AUTO_SYNC_AFTER_MS = 15 * 60_000;
const TO_FILL = "À préciser";

const FILTERS: { id: InboxStatus; label: string }[] = [
  { id: "new", label: "À traiter" },
  { id: "imported", label: "Importées" },
  { id: "dismissed", label: "Ignorées" },
];

/**
 * Facebook → website: the showroom Page's posts, read by the sync, each with the
 * vehicle read from its text. The admin checks the details and imports it (photos
 * copied to the site), links it to a vehicle already on the site, or ignores it.
 */
export function FacebookImportPage() {
  const queryClient = useQueryClient();
  const inbox = useQuery(inboxQuery);
  const social = useQuery(socialStatusQuery);
  const cars = useQuery(adminCarsQuery);
  const [filter, setFilter] = useState<InboxStatus>("new");

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inboxQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: socialStatusQuery.queryKey }),
    ]);
  const sync = useMutation({
    mutationFn: () => syncFacebook(),
    onSuccess: async () => {
      await refresh();
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const connected = Boolean(social.data?.facebook);
  const lastSyncedAt = social.data?.lastSyncedAt ?? null;

  // Fresh posts when the page opens (once), if the last sync is old.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current || !connected || !inbox.data?.installed) return;
    const age = lastSyncedAt ? Date.now() - new Date(lastSyncedAt).getTime() : Infinity;
    if (age < AUTO_SYNC_AFTER_MS) return;
    autoSynced.current = true;
    sync.mutate();
  }, [connected, lastSyncedAt, inbox.data?.installed, sync]);

  const items = inbox.data?.items ?? [];
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, items.filter((item) => item.status === f.id).length]),
  ) as Record<InboxStatus, number>;
  const shown = items.filter((item) => item.status === filter);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Import Facebook"
        description="Les publications de votre Page Facebook : vérifiez les informations lues dans chaque annonce puis importez le véhicule sur le site, avec ses photos."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {lastSyncedAt && (
              <span className="text-sm text-muted">
                Dernière synchronisation : {dateTimeFormat.format(new Date(lastSyncedAt))}
              </span>
            )}
            <Button
              isPending={sync.isPending}
              isDisabled={!connected || inbox.data?.installed === false}
              onPress={() => sync.mutate()}
            >
              {!sync.isPending && <RefreshCw className="size-4" aria-hidden />}
              Synchroniser maintenant
            </Button>
          </div>
        }
      />

      {social.data && !connected && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Page Facebook non connectée</Alert.Title>
            <Alert.Description>
              Connectez la Page du showroom dans{" "}
              <Link to="/admin/connecteurs" className="font-medium underline">
                Connecteurs
              </Link>{" "}
              pour lire ses publications.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {inbox.data?.installed === false && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Import Facebook pas encore installé</Alert.Title>
            <Alert.Description>
              Exécutez la migration 20261019220000_facebook_inbox.sql dans Supabase (SQL Editor),
              puis redéployez la fonction social-publish.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les publications">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? "rounded-full border border-foreground bg-foreground px-3 py-1 text-sm font-medium text-background"
                : "rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-surface-secondary"
            }
          >
            {f.label} <span className="tabular opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {inbox.isPending ? (
        <FacebookPostsSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={
            filter === "new" ? "Aucune nouvelle publication à traiter." : "Rien dans cette liste."
          }
          description={
            filter === "new"
              ? "Les nouvelles annonces de votre Page apparaîtront ici après la synchronisation."
              : undefined
          }
        />
      ) : (
        <ul className="grid gap-4">
          {shown.map((item) => (
            <li key={item.postId}>
              {item.status === "new" ? (
                <PostCard item={item} cars={cars.data ?? []} onDone={refresh} />
              ) : (
                <DecidedRow item={item} cars={cars.data ?? []} onDone={refresh} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Draft = {
  brand: string;
  model: string;
  version: string;
  year: number | null;
  km: number | null;
  fuel: string;
  gearbox: string;
  body: string;
  country: string;
  fiscalPower: number | null;
  price: number | null;
  description: string;
  photos: string[];
};

function draftOf(item: InboxItem): Draft {
  const p = item.parsed;
  const lines = [
    p.firstRegistration
      ? `Première mise en circulation : ${p.firstRegistration.split("-").reverse().join("/")}.`
      : "",
    p.options ? `Équipements : ${p.options.replace(/tout options/i, "toutes options")}.` : "",
  ].filter(Boolean);
  return {
    brand: p.brand,
    model: p.model,
    version: p.version,
    year: p.year,
    km: p.km,
    fuel: p.fuel ?? "",
    gearbox: p.gearbox ?? "",
    body: p.body ?? "",
    country: TO_FILL,
    fiscalPower: p.fiscalPower,
    price: p.price,
    description: lines.join("\n"),
    photos: item.photos,
  };
}

/** Vehicles already on the site that look like this post (same brand, model and year). */
function lookAlikes(draft: Draft, cars: AdminCar[]) {
  const brand = brandInfo(draft.brand).slug;
  const model = draft.model.toLowerCase().replace(/\s+/g, "");
  if (!brand || !model) return [];
  return cars.filter(
    (car) =>
      brandInfo(car.brand).slug === brand &&
      (car.model ?? car.name).toLowerCase().replace(/\s+/g, "").startsWith(model.slice(0, 4)) &&
      (!draft.year || car.year === draft.year),
  );
}

function PostCard({
  item,
  cars,
  onDone,
}: {
  item: InboxItem;
  cars: AdminCar[];
  onDone: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => draftOf(item));
  const [expanded, setExpanded] = useState(item.parsed.isListing);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const similar = lookAlikes(draft, cars);

  const missing = [
    !draft.brand.trim() && "marque",
    !draft.model.trim() && "modèle",
    !draft.year && "année",
    !draft.fuel && "carburant",
    !draft.gearbox && "boîte",
    !draft.body && "carrosserie",
  ].filter(Boolean);

  const importPost = useMutation({
    mutationFn: (publish: boolean) =>
      importFacebookPost({
        data: {
          postId: item.postId,
          brand: draft.brand.trim(),
          model: draft.model.trim(),
          version: draft.version.trim(),
          year: draft.year!,
          km_value: draft.km ?? 0,
          fuel: draft.fuel,
          gearbox: draft.gearbox,
          body: draft.body,
          country: draft.country,
          fiscal_power: draft.fiscalPower,
          price: draft.price ?? 0,
          description: draft.description,
          photos: draft.photos,
          publish,
        },
      }),
    onSuccess: async (result, publish) => {
      toast.success(
        `${draft.brand} ${draft.model} importé${publish ? " et publié" : " en brouillon"} (${plural(result.photos, "photo", "photos")}).`,
      );
      await Promise.all([
        onDone(),
        queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
      ]);
    },
    onError: (e: Error) => toast.danger(e.message),
  });
  const decide = useMutation({
    mutationFn: (input: { status: InboxStatus; carId?: string }) =>
      decideFacebookPost({ data: { postId: item.postId, ...input } }),
    onSuccess: () => onDone(),
    onError: (e: Error) => toast.danger(e.message),
  });
  const busy = importPost.isPending || decide.isPending;

  return (
    <article className="grid gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="grid content-start gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <FacebookLogo className="size-4" />
          {dateTimeFormat.format(new Date(item.postedAt))}
          {item.permalink && (
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-auto inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              Voir sur Facebook <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <PhotoPicker
          photos={item.photos}
          chosen={draft.photos}
          onChange={(photos) => set("photos", photos)}
        />
        <details className="rounded-lg bg-surface-secondary px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Texte de l’annonce
          </summary>
          <p className="mt-2 whitespace-pre-line text-muted">{item.message || "(sans texte)"}</p>
        </details>
      </div>

      {!expanded ? (
        <div className="grid content-start gap-3">
          <p className="font-medium text-foreground">
            Cette publication ne ressemble pas à une annonce.
          </p>
          <p className="text-sm text-muted">
            {item.message ? item.message.slice(0, 160) : "Publication sans texte."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              isDisabled={busy}
              onPress={() => decide.mutate({ status: "dismissed" })}
            >
              <EyeOff className="size-4" aria-hidden />
              Ignorer
            </Button>
            <Button variant="ghost" onPress={() => setExpanded(true)}>
              Importer quand même
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid content-start gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            {[draft.brand, draft.model, draft.version].filter(Boolean).join(" ") || "Véhicule"}
          </h3>
          {similar.length > 0 && (
            <div className="grid gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
              <p className="font-medium text-foreground">Déjà sur le site ?</p>
              {similar.slice(0, 3).map((car) => (
                <div key={car.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">
                    {car.brand} {car.name} · {car.year}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={busy}
                    onPress={() => decide.mutate({ status: "imported", carId: car.id })}
                  >
                    <Link2 className="size-4" aria-hidden />
                    C’est ce véhicule
                  </Button>
                  <button
                    type="button"
                    className="text-muted underline"
                    onClick={() =>
                      void navigate({ to: "/admin/vehicules/$carId", params: { carId: car.id } })
                    }
                  >
                    Ouvrir
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField value={draft.brand} onChange={(v) => set("brand", v)} isRequired>
              <Label>Marque</Label>
              <Input />
            </TextField>
            <TextField value={draft.model} onChange={(v) => set("model", v)} isRequired>
              <Label>Modèle</Label>
              <Input />
            </TextField>
            <TextField value={draft.version} onChange={(v) => set("version", v)}>
              <Label>Version</Label>
              <Input />
            </TextField>
            <IntegerField
              label="Année"
              value={draft.year}
              onChange={(v) => set("year", v)}
              minValue={1950}
              maxValue={2100}
              grouping={false}
            />
            <IntegerField
              label="Kilométrage (km)"
              value={draft.km}
              onChange={(v) => set("km", v)}
              minValue={0}
              maxValue={100_000_000}
              {...(draft.km != null && draft.km > 600_000
                ? { description: "Valeur inhabituelle : vérifiez." }
                : {})}
            />
            <IntegerField
              label="Puissance fiscale (CV)"
              value={draft.fiscalPower}
              onChange={(v) => set("fiscalPower", v)}
              minValue={0}
              maxValue={100}
            />
            <SelectField
              label="Carburant"
              value={draft.fuel}
              options={[{ id: "", label: "À choisir" }, ...toOptions(CAR_FUELS)]}
              onChange={(v) => set("fuel", v)}
            />
            <SelectField
              label="Boîte"
              value={draft.gearbox}
              options={[
                { id: "", label: "À choisir" },
                ...toOptions(CAR_GEARBOXES, GEARBOX_LABELS),
              ]}
              onChange={(v) => set("gearbox", v)}
            />
            <SelectField
              label="Carrosserie"
              value={draft.body}
              options={[{ id: "", label: "À choisir" }, ...toOptions(CAR_BODIES)]}
              onChange={(v) => set("body", v)}
            />
            <SelectField
              label="Origine"
              value={draft.country}
              options={[
                { id: TO_FILL, label: TO_FILL },
                ...toOptions(CAR_COUNTRIES, COUNTRY_LABELS),
              ]}
              onChange={(v) => set("country", v)}
            />
            <IntegerField
              label="Prix (DT)"
              value={draft.price}
              onChange={(v) => set("price", v)}
              minValue={0}
              maxValue={1_000_000_000}
              description="Vide : « Contactez-nous »."
            />
          </div>
          <TextField value={draft.description} onChange={(v) => set("description", v)}>
            <Label>Description</Label>
            <TextArea rows={3} />
          </TextField>
          {missing.length > 0 && (
            <p className="text-sm text-warning">
              À compléter avant l’import : {missing.join(", ")}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              isPending={importPost.isPending && importPost.variables === true}
              isDisabled={busy || missing.length > 0}
              onPress={() => importPost.mutate(true)}
            >
              <Check className="size-4" aria-hidden />
              Importer et publier
            </Button>
            <Button
              variant="secondary"
              isPending={importPost.isPending && importPost.variables === false}
              isDisabled={busy || missing.length > 0}
              onPress={() => importPost.mutate(false)}
            >
              Importer en brouillon
            </Button>
            <Button
              variant="ghost"
              className="ms-auto"
              isDisabled={busy}
              onPress={() => decide.mutate({ status: "dismissed" })}
            >
              <EyeOff className="size-4" aria-hidden />
              Ignorer
            </Button>
          </div>
          {importPost.isPending && (
            <p className="text-sm text-muted" aria-live="polite">
              Copie de {plural(draft.photos.length, "photo", "photos")} vers le site…
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/** The post's photos; click one to leave it out (the first kept is the cover). */
function PhotoPicker({
  photos,
  chosen,
  onChange,
}: {
  photos: string[];
  chosen: string[];
  onChange: (photos: string[]) => void;
}) {
  if (!photos.length)
    return <p className="text-sm text-muted">Aucune photo dans cette publication.</p>;
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">
        {chosen.length} / {photos.length} photos · cliquez pour en retirer une
      </p>
      <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {photos.map((url, index) => {
          const kept = chosen.includes(url);
          return (
            <li key={url}>
              <button
                type="button"
                aria-pressed={kept}
                aria-label={`${kept ? "Retirer" : "Garder"} la photo ${index + 1}`}
                onClick={() =>
                  onChange(
                    kept
                      ? chosen.filter((u) => u !== url)
                      : photos.filter((u) => u === url || chosen.includes(u)),
                  )
                }
                className={`relative block w-full overflow-hidden rounded-md border-2 transition ${
                  kept ? "border-transparent" : "border-dashed border-border opacity-35 grayscale"
                }`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-square w-full object-cover"
                />
                {kept && chosen[0] === url && (
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[0.65rem] font-semibold text-white">
                    Couverture
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Imported or ignored post: what happened, and a way back. */
function DecidedRow({
  item,
  cars,
  onDone,
}: {
  item: InboxItem;
  cars: AdminCar[];
  onDone: () => Promise<unknown>;
}) {
  const car = item.carId ? cars.find((c) => c.id === item.carId) : undefined;
  const restore = useMutation({
    mutationFn: () => decideFacebookPost({ data: { postId: item.postId, status: "new" } }),
    onSuccess: () => onDone(),
    onError: (e: Error) => toast.danger(e.message),
  });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
      {item.photos[0] ? (
        <img
          src={item.photos[0]}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-secondary">
          <FacebookLogo className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {item.parsed.title || item.message.slice(0, 60) || "Publication"}
        </p>
        <p className="text-sm text-muted">{dateTimeFormat.format(new Date(item.postedAt))}</p>
      </div>
      {item.status === "imported" && car && (
        <Link
          to="/admin/vehicules/$carId"
          params={{ carId: car.id }}
          className={buttonVariants({ size: "sm", variant: "secondary" })}
        >
          {car.brand} {car.name}
        </Link>
      )}
      {item.status === "dismissed" && (
        <Button
          size="sm"
          variant="ghost"
          isPending={restore.isPending}
          onPress={() => restore.mutate()}
        >
          <RotateCcw className="size-4" aria-hidden />
          Remettre à traiter
        </Button>
      )}
    </div>
  );
}
