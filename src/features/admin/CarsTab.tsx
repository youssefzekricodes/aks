import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Label, SearchField, Spinner, Table, toast } from "@heroui/react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  BadgeCheck,
  Car as CarIcon,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { carImage, discountPercent, formatKm, formatPrice, salePrice } from "@/lib/cars";
import {
  deleteCar,
  reorderCars,
  saveCar,
  setCarPublished,
  setCarSold,
  type CarInput,
} from "@/lib/data";
import { CarForm } from "./CarForm";
import { buildSocialCaption, SOCIAL_PLATFORMS } from "@/features/catalog/social";
import { usePhones } from "@/lib/site-content";
import { announceShare, socialStatusQuery } from "./SocialCard";
import { useDialogTarget } from "./hooks";
import {
  adminCarsQuery,
  adminCarsQueryKey,
  dateFormat,
  emptyCar,
  normalize,
  plural,
  toDraft,
  toPayload,
  type AdminCar,
} from "./model";
import {
  ConfirmDialog,
  EmptyState,
  IconButton,
  LoadError,
  PageHeader,
  RowMenu,
  SelectField,
  StatusChip,
  TableSkeleton,
  Toolbar,
} from "./ui";

type Status = "all" | "published" | "draft" | "sold";
const STATUS_OPTIONS = [
  { id: "all", label: "Tous" },
  { id: "published", label: "En vente" },
  { id: "draft", label: "Brouillons" },
  { id: "sold", label: "Vendus" },
];
const matchesStatus = (car: AdminCar, status: Status) =>
  status === "all" ||
  (status === "sold" ? car.sold === true : !car.sold && car.published === (status === "published"));

type Sort = "order" | "updated" | "price-asc" | "price-desc" | "year" | "name";
const SORT_OPTIONS = [
  { id: "order", label: "Ordre d’affichage" },
  { id: "updated", label: "Dernière mise à jour" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "year", label: "Année (récente d’abord)" },
  { id: "name", label: "Marque et modèle (A–Z)" },
];

const COLUMNS = ["Ordre", "Photo", "Véhicule", "Prix", "Statut", "Mise à jour", ""];
const titleOf = (car: Pick<AdminCar, "brand" | "name">) => `${car.brand} ${car.name}`.trim();

function sortCars(cars: AdminCar[], sort: Sort) {
  if (sort === "order") return cars;
  const sorted = [...cars];
  const price = (car: AdminCar) => (car.price_on_request ? null : salePrice(car));
  sorted.sort((a, b) => {
    switch (sort) {
      case "updated":
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      case "price-asc":
      case "price-desc": {
        const pa = price(a);
        const pb = price(b);
        // Hidden prices always come last.
        if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
        return sort === "price-asc" ? pa - pb : pb - pa;
      }
      case "year":
        return b.year - a.year;
      case "name":
        return titleOf(a).localeCompare(titleOf(b), "fr");
    }
  });
  return sorted;
}

type Editing = { draft: CarInput; original: string };

export function CarsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("order");
  const [publishing, setPublishing] = useState<ReadonlySet<string>>(new Set());
  const deletion = useDialogTarget<AdminCar>();

  const cars = useQuery(adminCarsQuery);
  const { primary } = usePhones();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
    ]);

  const save = useMutation({
    mutationFn: (data: CarInput) =>
      saveCar({
        data: toPayload(
          // Networks chosen but no text written: post the suggested one.
          data.social_targets?.length && !data.social_caption?.trim()
            ? {
                ...data,
                social_caption: buildSocialCaption(data, {
                  url: `${window.location.origin}/vehicule/${data.slug}`,
                  phone: primary?.number,
                }),
              }
            : data,
        ),
      }),
    onSuccess: (result) => {
      toast.success("Véhicule enregistré.");
      announceShare(result.social);
      setEditing(null);
      return invalidate();
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const publish = useMutation({
    mutationFn: (data: { id: string; published: boolean }) => setCarPublished({ data }),
    onMutate: async ({ id, published }) => {
      setPublishing((current) => new Set(current).add(id));
      await queryClient.cancelQueries({ queryKey: adminCarsQueryKey });
      const previous = queryClient.getQueryData<AdminCar[]>(adminCarsQueryKey);
      queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) =>
        list?.map((car) => (car.id === id ? { ...car, published } : car)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(adminCarsQueryKey, context.previous);
      toast.danger(e.message);
    },
    onSuccess: (result, { published }) => {
      toast.success(published ? "Véhicule publié sur le site." : "Véhicule retiré du site.");
      announceShare(result.social);
    },
    onSettled: (_data, _error, { id }) => {
      setPublishing((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCar({ data: { id } }),
    onSuccess: () => {
      toast.success("Véhicule supprimé.");
      return invalidate();
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  /** Optimistic change of some cars in the cached list, rolled back on error. */
  const patchList = async (patch: (list: AdminCar[]) => AdminCar[]) => {
    await queryClient.cancelQueries({ queryKey: adminCarsQueryKey });
    const previous = queryClient.getQueryData<AdminCar[]>(adminCarsQueryKey);
    queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) => list && patch(list));
    return { previous };
  };
  const rollback = (e: Error, context?: { previous?: AdminCar[] | undefined }) => {
    if (context?.previous) queryClient.setQueryData(adminCarsQueryKey, context.previous);
    toast.danger(e.message);
  };

  const sell = useMutation({
    mutationFn: (data: { id: string; sold: boolean }) => setCarSold({ data }),
    onMutate: ({ id, sold }) =>
      patchList((list) => list.map((car) => (car.id === id ? { ...car, sold } : car))),
    onError: (e: Error, _vars, context) => rollback(e, context),
    onSuccess: (_, { sold }) =>
      toast.success(
        sold
          ? "Véhicule marqué comme vendu : il n’apparaît plus sur le site."
          : "Véhicule remis en vente.",
      ),
    onSettled: () => invalidate(),
  });

  /** Saves the display order of the whole list (first = shown first on the site). */
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderCars({ data: { ids } }),
    onMutate: (ids) =>
      patchList((list) => {
        const rank = new Map(ids.map((id, index) => [id, index]));
        return list
          .map((car) => ({ ...car, sort_order: rank.get(car.id) ?? car.sort_order }))
          .sort((a, b) => a.sort_order - b.sort_order);
      }),
    onError: (e: Error, _vars, context) => rollback(e, context),
    onSettled: () => invalidate(),
  });
  const move = (car: AdminCar, to: "up" | "down" | "first" | "last") => {
    const ids = (cars.data ?? []).map((c) => c.id).filter((id) => id !== car.id);
    const index = (cars.data ?? []).findIndex((c) => c.id === car.id);
    const target =
      to === "first" ? 0 : to === "last" ? ids.length : to === "up" ? index - 1 : index + 1;
    ids.splice(Math.max(0, Math.min(ids.length, target)), 0, car.id);
    reorder.mutate(ids);
  };

  // Known early so a new vehicle is pre-set to post on the connected networks.
  const social = useQuery(socialStatusQuery);
  const open = (car: CarInput) => {
    const connected = SOCIAL_PLATFORMS.filter((p) => social.data?.[p]);
    const draft = toDraft(car.id ? car : { ...car, social_targets: connected });
    setEditing({ draft, original: JSON.stringify(draft) });
  };

  if (editing) {
    return (
      <CarForm
        value={editing.draft}
        isDirty={JSON.stringify(editing.draft) !== editing.original}
        onChange={(update) =>
          setEditing((current) => current && { ...current, draft: update(current.draft) })
        }
        onCancel={() => setEditing(null)}
        onSave={() => save.mutate(editing.draft)}
        saving={save.isPending}
      />
    );
  }

  const all = cars.data ?? [];
  const query = normalize(search.trim());
  const filtered = all.filter(
    (car) =>
      matchesStatus(car, status) &&
      (!query ||
        normalize(`${car.brand} ${car.name} ${car.model ?? ""} ${car.version ?? ""}`).includes(
          query,
        )),
  );
  const visible = sortCars(filtered, sort);
  const published = all.filter((car) => car.published && !car.sold).length;
  const sold = all.filter((car) => car.sold).length;
  const filtersActive = query !== "" || status !== "all";
  // Arrows reorder the full list, so they only make sense in display order without filters.
  const canReorder = sort === "order" && !filtersActive;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Véhicules"
        description={
          cars.data
            ? `${plural(all.length, "véhicule", "véhicules")} · ${plural(published, "en vente", "en vente")} · ${plural(sold, "vendu", "vendus")}`
            : "Gérez le stock affiché sur le site."
        }
        actions={
          <Button onPress={() => open(emptyCar)}>
            <Plus className="size-4" aria-hidden />
            Ajouter un véhicule
          </Button>
        }
      />

      <Toolbar label="Filtrer les véhicules">
        <SearchField
          value={search}
          onChange={setSearch}
          className="min-w-0 flex-1 basis-64"
          fullWidth
        >
          <Label>Rechercher</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Marque, modèle ou version…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <SelectField
          label="Statut"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setStatus(value as Status)}
          className="w-full sm:w-44"
        />
        <SelectField
          label="Trier par"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => setSort(value as Sort)}
          className="w-full sm:w-60"
        />
      </Toolbar>

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <TableSkeleton label="Véhicules" columns={COLUMNS} minWidth="min-w-[860px]" />
      ) : (
        <>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Véhicules" className="min-w-[860px]">
                <Table.Header>
                  <Table.Column className="w-24">
                    <span className="sr-only">Ordre d’affichage</span>
                  </Table.Column>
                  <Table.Column className="w-24">Photo</Table.Column>
                  <Table.Column isRowHeader>Véhicule</Table.Column>
                  <Table.Column>Prix</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column>Mise à jour</Table.Column>
                  <Table.Column className="w-14">
                    <span className="sr-only">Actions</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() =>
                    all.length ? (
                      <EmptyState
                        icon={CarIcon}
                        title="Aucun véhicule ne correspond."
                        description="Modifiez la recherche ou le filtre de statut."
                        action={
                          filtersActive && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onPress={() => {
                                setSearch("");
                                setStatus("all");
                              }}
                            >
                              Réinitialiser les filtres
                            </Button>
                          )
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={CarIcon}
                        title="Aucun véhicule pour le moment."
                        description="Ajoutez votre premier véhicule pour l’afficher sur le site."
                        action={
                          <Button size="sm" onPress={() => open(emptyCar)}>
                            <Plus className="size-4" aria-hidden />
                            Ajouter un véhicule
                          </Button>
                        }
                      />
                    )
                  }
                >
                  {visible.map((car, index) => (
                    <CarRow
                      key={car.id}
                      car={car}
                      order={
                        canReorder
                          ? {
                              first: index === 0,
                              last: index === visible.length - 1,
                              busy: reorder.isPending,
                              onMove: (to) => move(car, to),
                            }
                          : undefined
                      }
                      onToggleSold={() => sell.mutate({ id: car.id, sold: !car.sold })}
                      publishing={publishing.has(car.id)}
                      onEdit={() => open(car)}
                      onTogglePublished={() =>
                        publish.mutate({ id: car.id, published: !car.published })
                      }
                      onDelete={() => deletion.open(car)}
                    />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          {!canReorder && visible.length > 1 && (
            <p className="text-sm text-muted">
              Pour changer l’ordre d’affichage sur le site, choisissez « Ordre d’affichage » et
              retirez les filtres.
            </p>
          )}
          {visible.length > 0 && filtersActive && (
            <p className="text-sm text-muted" aria-live="polite">
              {plural(visible.length, "véhicule affiché", "véhicules affichés")} sur {all.length}
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deletion.isOpen}
        onOpenChange={deletion.onOpenChange}
        title="Supprimer ce véhicule ?"
        confirmLabel="Supprimer"
        onConfirm={() => deletion.target && remove.mutateAsync(deletion.target.id)}
      >
        <p>
          <strong>{deletion.target ? titleOf(deletion.target) : ""}</strong> et ses photos seront
          définitivement supprimés. Cette action est irréversible.
        </p>
      </ConfirmDialog>
    </div>
  );
}

type MoveTo = "up" | "down" | "first" | "last";

function CarRow({
  car,
  order,
  publishing,
  onEdit,
  onTogglePublished,
  onToggleSold,
  onDelete,
}: {
  car: AdminCar;
  /** Present when the list can be reordered. */
  order?:
    { first: boolean; last: boolean; busy: boolean; onMove: (to: MoveTo) => void } | undefined;
  publishing: boolean;
  onEdit: () => void;
  onTogglePublished: () => void;
  onToggleSold: () => void;
  onDelete: () => void;
}) {
  const title = titleOf(car);
  const percent = discountPercent(car);
  return (
    <Table.Row id={car.id} className={car.sold ? "opacity-70" : ""}>
      <Table.Cell>
        {order ? (
          <div className="flex items-center gap-0.5">
            <IconButton
              label={`Monter ${title}`}
              icon={ArrowUp}
              isDisabled={order.first || order.busy}
              onPress={() => order.onMove("up")}
            />
            <IconButton
              label={`Descendre ${title}`}
              icon={ArrowDown}
              isDisabled={order.last || order.busy}
              onPress={() => order.onMove("down")}
            />
          </div>
        ) : (
          <span className="block w-16" aria-hidden />
        )}
      </Table.Cell>
      <Table.Cell>
        <img
          src={carImage(car)}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-16 rounded-lg border border-separator bg-surface-secondary object-cover"
        />
      </Table.Cell>
      <Table.Cell>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-sm text-start font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          {title}
        </button>
        <p className="text-sm text-muted">
          {car.year} · {formatKm(car.km_value)}
        </p>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm">
        {car.price_on_request ? (
          <span className="text-muted">Prix masqué</span>
        ) : percent ? (
          <span className="grid">
            <span className="font-medium text-accent">
              {formatPrice(salePrice(car))}{" "}
              <span className="text-xs font-semibold">−{percent} %</span>
            </span>
            <del className="text-xs text-muted">{formatPrice(car.price)}</del>
          </span>
        ) : (
          formatPrice(car.price)
        )}
      </Table.Cell>
      <Table.Cell>
        <span className="inline-flex items-center gap-2">
          {car.sold ? (
            <StatusChip tone="warning">Vendu</StatusChip>
          ) : (
            <StatusChip tone={car.published ? "success" : "default"}>
              {car.published ? "En vente" : "Brouillon"}
            </StatusChip>
          )}
          {publishing && <Spinner size="sm" aria-label="Mise à jour du statut" />}
        </span>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm text-muted">
        {car.updated_at ? dateFormat.format(new Date(car.updated_at)) : "—"}
      </Table.Cell>
      <Table.Cell className="text-end">
        <RowMenu
          label={`Actions pour ${title}`}
          actions={[
            { id: "edit", label: "Modifier", icon: Pencil, onAction: onEdit },
            car.published && {
              id: "view",
              label: "Voir sur le site",
              icon: ExternalLink,
              href: `/vehicule/${car.slug}`,
              external: true,
            },
            {
              id: "sold",
              label: car.sold ? "Remettre en vente" : "Marquer comme vendu",
              icon: car.sold ? RotateCcw : BadgeCheck,
              onAction: onToggleSold,
            },
            order &&
              !order.first && {
                id: "first",
                label: "Afficher en premier",
                icon: ArrowUpToLine,
                onAction: () => order.onMove("first"),
              },
            order &&
              !order.last && {
                id: "last",
                label: "Afficher en dernier",
                icon: ArrowDownToLine,
                onAction: () => order.onMove("last"),
              },
            {
              id: "publish",
              label: car.published ? "Dépublier" : "Publier",
              icon: car.published ? EyeOff : Eye,
              onAction: onTogglePublished,
            },
            { id: "delete", label: "Supprimer", icon: Trash2, onAction: onDelete, danger: true },
          ]}
        />
      </Table.Cell>
    </Table.Row>
  );
}
