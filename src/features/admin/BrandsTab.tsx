import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Label, SearchField, Switch, Table, toast } from "@heroui/react";
import { ArrowDown, ArrowUp, Star, Tags, Trash2, Upload } from "lucide-react";
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
        <TableSkeleton label="Marques" columns={COLUMNS} minWidth="min-w-[880px]" />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Marques" className="min-w-[880px]">
              <Table.Header>
                <Table.Column className="w-28">Logo</Table.Column>
                <Table.Column isRowHeader>Marque</Table.Column>
                <Table.Column>Véhicules</Table.Column>
                <Table.Column>Visible</Table.Column>
                <Table.Column className="w-40">Favori</Table.Column>
                <Table.Column>Source du logo</Table.Column>
                <Table.Column className="w-64 text-end">Actions</Table.Column>
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
                {rows.map((brand) => {
                  const position = favorites.findIndex((b) => b.slug === brand.slug);
                  return (
                    <BrandRow
                      key={brand.slug}
                      brand={brand}
                      hasUpload={uploaded.has(brand.slug)}
                      upload={uploads.states[brand.slug]}
                      removing={remove.isPending && remove.variables === brand.slug}
                      onUpload={(file) => void upload(brand, file)}
                      onRemove={() => removal.open(brand)}
                      onToggleHidden={(visible) =>
                        save.mutate([{ ...display(brand), hidden: !visible }])
                      }
                      onToggleFavorite={() => toggleFavorite(brand)}
                      {...(position >= 0
                        ? {
                            favorite: {
                              position: position + 1,
                              first: position === 0,
                              last: position === favorites.length - 1,
                              onMove: (by: -1 | 1) => moveFavorite(brand, by),
                            },
                          }
                        : {})}
                    />
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

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

function BrandRow({
  brand,
  hasUpload,
  upload,
  removing,
  onUpload,
  onRemove,
  onToggleHidden,
  onToggleFavorite,
  favorite,
}: {
  brand: Row;
  hasUpload: boolean;
  upload: UploadState | undefined;
  removing: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onToggleHidden: (visible: boolean) => void;
  onToggleFavorite: () => void;
  favorite?: { position: number; first: boolean; last: boolean; onMove: (by: -1 | 1) => void };
}) {
  const working = upload?.status === "working";
  return (
    <Table.Row id={brand.slug} className={brand.hidden ? "opacity-60" : ""}>
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
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center gap-1">
          <IconButton
            label={
              favorite
                ? `Retirer ${brand.name} des favorites`
                : `Ajouter ${brand.name} aux favorites`
            }
            icon={Star}
            onPress={onToggleFavorite}
            className={favorite ? "text-warning [&_svg]:fill-current" : "text-muted"}
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
          <StatusChip tone="accent">Importé</StatusChip>
        ) : brand.logo ? (
          <StatusChip tone="success">Intégré</StatusChip>
        ) : (
          <StatusChip tone="default">Aucun</StatusChip>
        )}
      </Table.Cell>
      <Table.Cell>
        <div className="ms-auto grid max-w-64 justify-items-end gap-2">
          <div className="flex items-center gap-1">
            <FilePickButton
              size="sm"
              accept={LOGO_TYPES}
              isDisabled={working || removing}
              onSelect={(files) => files[0] && onUpload(files[0])}
            >
              <Upload className="size-4" aria-hidden />
              {working ? "Envoi…" : hasUpload ? "Remplacer" : "Importer"}
              <span className="sr-only"> le logo de {brand.name}</span>
            </FilePickButton>
            {hasUpload && (
              <IconButton
                label={`Retirer le logo de ${brand.name}`}
                icon={Trash2}
                variant="danger-soft"
                isDisabled={working || removing}
                onPress={onRemove}
              />
            )}
          </div>
          {upload?.status === "working" && (
            <UploadProgress state={upload} label={`Envoi du logo de ${brand.name}`} />
          )}
          {upload?.status === "error" && (
            <p role="alert" className="text-end text-xs text-danger">
              {upload.message}
            </p>
          )}
        </div>
      </Table.Cell>
    </Table.Row>
  );
}
