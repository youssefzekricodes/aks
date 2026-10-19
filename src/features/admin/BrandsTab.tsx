import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Label, Modal, SearchField, Switch, Table, toast } from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Star,
  StarFill,
  Tags,
  Trash2,
  Upload,
} from "@/components/icons";
import { BRANDS, brandBySlug, brandInfo, type BrandInfo } from "@/features/catalog/brands";
import type { BrandDisplay } from "@/features/catalog/search";
import { BrandLogo } from "@/components/aks/BrandLogo";
import { brandLogosQuery, brandSettingsQuery } from "@/lib/queries";
import {
  deleteBrandLogo,
  prepareImage,
  saveBrandLogo,
  saveBrandSettings,
  uploadImage,
} from "@/lib/data";
import { useDialogTarget, useUploads, type UploadState } from "./hooks";
import { BrandCardsSkeleton, fadeIn } from "./skeletons";
import { LOGO_TYPES, adminCarsQuery, plural } from "./model";
import {
  ConfirmDialog,
  EmptyState,
  FilePickButton,
  IconButton,
  LoadError,
  PageHeader,
  SelectField,
  StatusChip,
  TableSkeleton,
  Toolbar,
  UploadProgress,
} from "./ui";

const MAX_LOGO_BYTES = 400_000;
const COLUMNS = ["Logo", "Marque", "Véhicules", "Visible", "Favori", "Logo", ""];
const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "favorites", label: "Favorites" },
  { id: "visible", label: "Visibles" },
  { id: "hidden", label: "Masquées" },
  { id: "stock", label: "En stock" },
];

type Row = BrandInfo & { cars: number; hidden: boolean; favoriteRank: number | null };

export function BrandsTab() {
  const queryClient = useQueryClient();
  const cars = useQuery(adminCarsQuery);
  const logos = useQuery(brandLogosQuery);
  const settings = useQuery(brandSettingsQuery);
  const uploads = useUploads();
  const removal = useDialogTarget<Row>();
  const [editing, setEditing] = useState<string | null>(null);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const refresh = () => queryClient.invalidateQueries({ queryKey: brandLogosQuery.queryKey });

  const remove = useMutation({
    mutationFn: (slug: string) => deleteBrandLogo({ data: { slug } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Logo retiré.");
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  // Optimistic: the switch / star reacts at once and rolls back on error.
  const save = useMutation({
    mutationFn: (changes: BrandDisplay[]) => saveBrandSettings({ data: changes }),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: brandSettingsQuery.queryKey });
      const previous = queryClient.getQueryData(brandSettingsQuery.queryKey);
      queryClient.setQueryData(brandSettingsQuery.queryKey, (current = []) => {
        const next = new Map(current.map((s) => [s.slug, s]));
        changes.forEach((c) => next.set(c.slug, c));
        return [...next.values()];
      });
      return { previous };
    },
    onError: (e: Error, _changes, context) => {
      queryClient.setQueryData(brandSettingsQuery.queryKey, context?.previous);
      toast.danger(e.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: brandSettingsQuery.queryKey }),
  });

  async function upload(brand: Row, file: File) {
    const url = await uploads.run(brand.slug, async (report) => {
      const blob = await prepareImage(file, { logo: true, maxSide: 600 });
      if (blob.size > MAX_LOGO_BYTES)
        throw new Error(
          "Logo trop lourd : 400 Ko maximum. Réduisez sa taille ou exportez en WebP.",
        );
      const publicUrl = await uploadImage("brand", blob, { scope: brand.slug, onProgress: report });
      await saveBrandLogo({ data: { slug: brand.slug, url: publicUrl } });
      return publicUrl;
    });
    if (url) {
      await refresh();
      toast.success(`Logo de ${brand.name} enregistré.`);
    }
  }

  const uploaded = new Set((logos.data ?? []).map((logo) => logo.slug));
  const stored = new Map((settings.data ?? []).map((s) => [s.slug, s]));
  // Every brand of the site, plus brands only used by vehicles or with an upload.
  const brands = new Map<string, Row>();
  const addBrand = (info: BrandInfo) => {
    if (!info.slug || brands.has(info.slug)) return;
    const setting = stored.get(info.slug);
    brands.set(info.slug, {
      ...info,
      cars: 0,
      hidden: setting?.hidden ?? false,
      favoriteRank: setting?.favoriteRank ?? null,
    });
  };
  BRANDS.forEach(addBrand);
  for (const car of cars.data ?? []) {
    const info = brandInfo(car.brand);
    addBrand(info);
    const row = brands.get(info.slug);
    if (row) row.cars += 1;
  }
  uploaded.forEach((slug) => addBrand(brandBySlug(slug) ?? { name: slug, slug, country: "" }));
  stored.forEach((_, slug) => addBrand(brandBySlug(slug) ?? { name: slug, slug, country: "" }));

  const all = [...brands.values()];
  const favorites = all
    .filter((b) => b.favoriteRank !== null)
    .sort((a, b) => a.favoriteRank! - b.favoriteRank!);
  const display = (b: Row): BrandDisplay => ({
    slug: b.slug,
    hidden: b.hidden,
    favoriteRank: b.favoriteRank,
  });
  /** Saves the favourites in this order, ranks 1…n (plus any other changed brand). */
  const saveFavorites = (ordered: Row[], extra: BrandDisplay[] = []) =>
    save.mutate([
      ...ordered.map((b, index) => ({ ...display(b), favoriteRank: index + 1 })),
      ...extra,
    ]);

  const toggleFavorite = (brand: Row) =>
    brand.favoriteRank === null
      ? saveFavorites([...favorites, brand])
      : saveFavorites(
          favorites.filter((b) => b.slug !== brand.slug),
          [{ ...display(brand), favoriteRank: null }],
        );
  const moveFavorite = (brand: Row, by: -1 | 1) => {
    const next = [...favorites];
    const index = next.findIndex((b) => b.slug === brand.slug);
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    saveFavorites(next);
  };

  const query = search.trim().toLowerCase();
  const rows = [
    ...favorites,
    ...all
      .filter((b) => b.favoriteRank === null)
      .sort((a, b) => b.cars - a.cars || a.name.localeCompare(b.name, "fr")),
  ].filter(
    (b) =>
      (!query || b.name.toLowerCase().includes(query)) &&
      (filter === "all" ||
        (filter === "favorites" && b.favoriteRank !== null) ||
        (filter === "visible" && !b.hidden) ||
        (filter === "hidden" && b.hidden) ||
        (filter === "stock" && b.cars > 0)),
  );
  const hiddenCount = all.filter((b) => b.hidden).length;

  /** Same data and actions for a table row (computer) and a card (phone). */
  const brandProps = (brand: Row): BrandItemProps => {
    const position = favorites.findIndex((b) => b.slug === brand.slug);
    return {
      brand,
      hasUpload: uploaded.has(brand.slug),
      upload: uploads.states[brand.slug],
      onToggleHidden: (visible) => save.mutate([{ ...display(brand), hidden: !visible }]),
      onToggleFavorite: () => toggleFavorite(brand),
      onOpen: () =>
        void navigate({ to: "/admin/vehicules/marque/$brand", params: { brand: brand.slug } }),
      onEdit: () => setEditing(brand.slug),
      ...(position >= 0
        ? {
            favorite: {
              position: position + 1,
              first: position === 0,
              last: position === favorites.length - 1,
              onMove: (by: -1 | 1) => moveFavorite(brand, by),
            },
          }
        : {}),
    };
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Marques"
        description={`${plural(all.length, "marque", "marques")} · ${plural(favorites.length, "favorite", "favorites")} · ${plural(hiddenCount, "masquée", "masquées")}. Les favorites ouvrent le carrousel de l’accueil, dans l’ordre choisi ; les marques masquées n’apparaissent ni dans le carrousel ni sur la page Marques.`}
      />

      <Toolbar label="Filtrer les marques">
        <SearchField
          value={search}
          onChange={setSearch}
          className="min-w-0 flex-1 basis-64"
          fullWidth
        >
          <Label>Rechercher</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Nom de la marque…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <SelectField
          label="Afficher"
          value={filter}
          options={FILTERS}
          onChange={setFilter}
          className="w-full sm:w-44"
        />
        <p className="max-w-md pb-2 text-xs text-muted">
          Logo conseillé : PNG ou WebP à fond transparent, proche du carré, 400 Ko maximum.
        </p>
      </Toolbar>

      {cars.isError || logos.isError || settings.isError ? (
        <LoadError
          message="Impossible de charger les marques."
          onRetry={() => {
            void cars.refetch();
            void logos.refetch();
            void settings.refetch();
          }}
        />
      ) : cars.isPending || logos.isPending || settings.isPending ? (
        <>
          <BrandCardsSkeleton />
          <div className="hidden md:block">
            <TableSkeleton label="Marques" columns={COLUMNS} minWidth="min-w-[880px]" />
          </div>
        </>
      ) : (
        <>
          {/* Phones: one card per brand. */}
          <ul aria-label="Marques" className={`grid gap-3 md:hidden ${fadeIn}`}>
            {rows.map((brand) => (
              <BrandCard key={brand.slug} {...brandProps(brand)} />
            ))}
            {rows.length === 0 && (
              <li>
                <EmptyState
                  icon={Tags}
                  title="Aucune marque ne correspond."
                  description="Modifiez la recherche ou le filtre."
                />
              </li>
            )}
          </ul>
          <Table className="hidden md:block">
            <Table.ScrollContainer>
              <Table.Content aria-label="Marques" className="min-w-[880px]">
                <Table.Header>
                  <Table.Column className="w-28">Logo</Table.Column>
                  <Table.Column isRowHeader>Marque</Table.Column>
                  <Table.Column>Véhicules</Table.Column>
                  <Table.Column>Visible</Table.Column>
                  <Table.Column className="w-40">Favori</Table.Column>
                  <Table.Column>Source du logo</Table.Column>
                  <Table.Column className="w-32 text-end">
                    <span className="sr-only">Actions</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState
                      icon={Tags}
                      title="Aucune marque ne correspond."
                      description="Modifiez la recherche ou le filtre."
                    />
                  )}
                >
                  {rows.map((brand) => (
                    <BrandRow key={brand.slug} {...brandProps(brand)} />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </>
      )}

      <BrandEditDialog
        brand={rows.find((b) => b.slug === editing) ?? null}
        hasUpload={editing ? uploaded.has(editing) : false}
        upload={editing ? uploads.states[editing] : undefined}
        removing={remove.isPending}
        onClose={() => setEditing(null)}
        onUpload={(brand, file) => void upload(brand, file)}
        onRemove={(brand) => {
          setEditing(null);
          removal.open(brand);
        }}
      />

      <ConfirmDialog
        isOpen={removal.isOpen}
        onOpenChange={removal.onOpenChange}
        title={`Retirer le logo de ${removal.target?.name ?? "cette marque"} ?`}
        confirmLabel="Retirer le logo"
        onConfirm={() => removal.target && remove.mutateAsync(removal.target.slug)}
      >
        <p>
          {removal.target?.logo
            ? "Le logo intégré sera de nouveau affiché sur le site."
            : "Le nom de la marque sera affiché à la place du logo."}
        </p>
      </ConfirmDialog>
    </div>
  );
}

type BrandItemProps = {
  brand: Row;
  hasUpload: boolean;
  upload: UploadState | undefined;
  onToggleHidden: (visible: boolean) => void;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onEdit: () => void;
  favorite?: { position: number; first: boolean; last: boolean; onMove: (by: -1 | 1) => void };
};

function BrandRow({
  brand,
  hasUpload,
  upload,
  onToggleHidden,
  onToggleFavorite,
  onOpen,
  onEdit,
  favorite,
}: BrandItemProps) {
  const working = upload?.status === "working";
  return (
    <Table.Row
      id={brand.slug}
      onAction={onOpen}
      className={`cursor-pointer ${brand.hidden ? "opacity-60" : ""}`}
    >
      <Table.Cell>
        <div className="flex h-12 w-20 items-center justify-center rounded-lg border border-separator bg-background p-2 text-foreground">
          <BrandLogo brand={brand.name} size={28} />
        </div>
      </Table.Cell>
      <Table.Cell>
        <span className="font-medium text-foreground">{brand.name}</span>
      </Table.Cell>
      <Table.Cell className="text-sm tabular-nums text-muted">{brand.cars || "—"}</Table.Cell>
      <Table.Cell>
        <div {...isolate} className="w-fit">
          <Switch
            isSelected={!brand.hidden}
            onChange={onToggleHidden}
            aria-label={`Afficher ${brand.name} sur le site`}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <span className="text-sm text-muted">{brand.hidden ? "Masquée" : "Visible"}</span>
            </Switch.Content>
          </Switch>
        </div>
      </Table.Cell>
      <Table.Cell>
        <div {...isolate} className="flex w-fit items-center gap-1">
          <IconButton
            label={
              favorite
                ? `Retirer ${brand.name} des favorites`
                : `Ajouter ${brand.name} aux favorites`
            }
            icon={favorite ? StarFill : Star}
            onPress={onToggleFavorite}
            className={favorite ? "text-warning" : "text-muted"}
          />
          {favorite && (
            <>
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted">
                {favorite.position}
              </span>
              <IconButton
                label={`Monter ${brand.name}`}
                icon={ArrowUp}
                isDisabled={favorite.first}
                onPress={() => favorite.onMove(-1)}
              />
              <IconButton
                label={`Descendre ${brand.name}`}
                icon={ArrowDown}
                isDisabled={favorite.last}
                onPress={() => favorite.onMove(1)}
              />
            </>
          )}
        </div>
      </Table.Cell>
      <Table.Cell>
        {hasUpload ? (
          <StatusChip tone="accent">Personnalisé</StatusChip>
        ) : brand.logo ? (
          <StatusChip tone="success">Intégré</StatusChip>
        ) : (
          <StatusChip tone="default">Aucun</StatusChip>
        )}
      </Table.Cell>
      <Table.Cell className="text-end">
        <div {...isolate} className="inline-flex">
          <Button size="sm" variant="secondary" isPending={working} onPress={onEdit}>
            <Pencil className="size-4" aria-hidden />
            Modifier
            <span className="sr-only"> {brand.name}</span>
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

/** Phone card: tap opens the brand's vehicles; visibility, favourite and logo inline. */
function BrandCard({
  brand,
  hasUpload,
  upload,
  onToggleHidden,
  onToggleFavorite,
  onOpen,
  onEdit,
  favorite,
}: BrandItemProps) {
  return (
    <li>
      <div
        onClick={onOpen}
        className={`grid cursor-pointer gap-3 rounded-2xl border border-separator bg-surface p-3 transition-colors active:bg-surface-secondary ${
          brand.hidden ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-separator bg-background p-2 text-foreground">
            <BrandLogo brand={brand.name} size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{brand.name}</p>
            <p className="text-xs text-muted">
              {brand.cars ? plural(brand.cars, "véhicule", "véhicules") : "Aucun véhicule"} ·{" "}
              {hasUpload ? "logo personnalisé" : brand.logo ? "logo intégré" : "sans logo"}
            </p>
          </div>
          <div {...isolate}>
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label={`Modifier le logo de ${brand.name}`}
              isPending={upload?.status === "working"}
              onPress={onEdit}
              className="size-10"
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div
          {...isolate}
          className="flex items-center justify-between gap-2 border-t border-separator pt-2"
        >
          <Switch
            isSelected={!brand.hidden}
            onChange={onToggleHidden}
            aria-label={`Afficher ${brand.name} sur le site`}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <span className="text-sm text-muted">{brand.hidden ? "Masquée" : "Visible"}</span>
            </Switch.Content>
          </Switch>
          <div className="flex items-center gap-1">
            {favorite && (
              <>
                <IconButton
                  label={`Monter ${brand.name}`}
                  icon={ArrowUp}
                  isDisabled={favorite.first}
                  onPress={() => favorite.onMove(-1)}
                  className="size-10"
                />
                <IconButton
                  label={`Descendre ${brand.name}`}
                  icon={ArrowDown}
                  isDisabled={favorite.last}
                  onPress={() => favorite.onMove(1)}
                  className="size-10"
                />
                <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted">
                  {favorite.position}
                </span>
              </>
            )}
            <IconButton
              label={
                favorite
                  ? `Retirer ${brand.name} des favorites`
                  : `Ajouter ${brand.name} aux favorites`
              }
              icon={favorite ? StarFill : Star}
              onPress={onToggleFavorite}
              className={`size-10 ${favorite ? "text-warning" : "text-muted"}`}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

/** Keeps clicks on controls inside a row from opening the brand page. */
const stop = (event: SyntheticEvent) => event.stopPropagation();
const isolate = { onPointerDown: stop, onClick: stop, onKeyDown: stop };

/** Logo of a brand: preview, replace with a file, or go back to the built-in one. */
function BrandEditDialog({
  brand,
  hasUpload,
  upload,
  removing,
  onClose,
  onUpload,
  onRemove,
}: {
  brand: Row | null;
  hasUpload: boolean;
  upload: UploadState | undefined;
  removing: boolean;
  onClose: () => void;
  onUpload: (brand: Row, file: File) => void;
  onRemove: (brand: Row) => void;
}) {
  const working = upload?.status === "working";
  return (
    <Modal.Backdrop isOpen={brand !== null} onOpenChange={(open) => !open && !working && onClose()}>
      <Modal.Container placement="auto">
        <Modal.Dialog className="sm:max-w-md">
          {brand && (
            <>
              <Modal.CloseTrigger aria-label="Fermer" />
              <Modal.Header>
                <Modal.Heading>Modifier {brand.name}</Modal.Heading>
                <p className="mt-1 text-sm text-muted">
                  Logo affiché sur le site : PNG ou WebP à fond transparent, proche du carré, 400 Ko
                  maximum.
                </p>
              </Modal.Header>
              <Modal.Body className="grid gap-4">
                {/* Logos appear on light pages and on the dark header band: check both. */}
                <div className="grid grid-cols-2 gap-3">
                  <figure className="grid gap-1.5">
                    <div className="grid h-28 place-items-center rounded-xl border border-separator bg-white p-4 text-zinc-900">
                      <BrandLogo brand={brand.name} size={56} />
                    </div>
                    <figcaption className="text-xs text-muted">Fond clair</figcaption>
                  </figure>
                  <figure className="grid gap-1.5">
                    <div className="grid h-28 place-items-center rounded-xl border border-separator bg-[oklch(0.17_0.004_286)] p-4 text-white">
                      <BrandLogo brand={brand.name} size={56} />
                    </div>
                    <figcaption className="text-xs text-muted">Fond sombre</figcaption>
                  </figure>
                </div>
                <p className="text-sm text-muted">
                  {hasUpload
                    ? "Logo personnalisé (envoyé depuis l’administration)."
                    : brand.logo
                      ? "Logo intégré au site."
                      : "Aucun logo : le nom de la marque est affiché."}
                </p>
                {working && (
                  <UploadProgress state={upload} label={`Envoi du logo de ${brand.name}`} />
                )}
                {upload?.status === "error" && (
                  <p role="alert" className="text-sm text-danger">
                    {upload.message}
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer className="flex-wrap">
                {hasUpload && (
                  <Button
                    variant="danger-soft"
                    className="me-auto"
                    isDisabled={working || removing}
                    onPress={() => onRemove(brand)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Retirer ce logo
                  </Button>
                )}
                <FilePickButton
                  accept={LOGO_TYPES}
                  isDisabled={working || removing}
                  onSelect={(files) => files[0] && onUpload(brand, files[0])}
                >
                  <Upload className="size-4" aria-hidden />
                  {working ? "Envoi…" : "Changer le logo"}
                </FilePickButton>
                <Button variant="tertiary" isDisabled={working} onPress={onClose}>
                  Fermer
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
