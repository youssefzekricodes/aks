import { useState, type ReactNode, type SyntheticEvent } from "react";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Label, SearchField, Spinner, Table, toast, Tooltip } from "@heroui/react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BadgeCheck,
  ClipboardList,
  X,
  Car as CarIcon,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import { carImage, discountPercent, formatKm, formatPrice, salePrice } from "@/lib/cars";
import {
  bulkCars,
  deleteCar,
  reorderCars,
  saveCar,
  setCarDiscount,
  setCarPublished,
  setCarSold,
  type CarInput,
} from "@/lib/data";
import { CarForm } from "./CarForm";
import type { BulkAction } from "@/server/repository";
import { CompleteDetailsDialog } from "./CompleteDetailsDialog";
import { BulkDiscountDialog, DiscountDialog } from "./DiscountDialog";
import { buildSocialCaption, SOCIAL_PLATFORMS } from "@/features/catalog/social";
import { usePhones } from "@/lib/site-content";
import { announceShare, socialStatusQuery } from "./SocialCard";
import { useDialogTarget } from "./hooks";
import {
  adminCarsQuery,
  adminCarsQueryKey,
  dateFormat,
  emptyCar,
  missingFields,
  normalize,
  plural,
  toDraft,
  toPayload,
  type AdminCar,
} from "./model";
import { DragHandle, frenchAnnouncements, frenchInstructions, useSortSensors } from "./sortable";
import {
  ConfirmDialog,
  EmptyState,
  ListPagination,
  LoadError,
  PageHeader,
  RowMenu,
  SelectField,
  StatusChip,
  TableSkeleton,
  Toolbar,
} from "./ui";

type Status = "all" | "published" | "draft" | "sold" | "incomplete";
const STATUS_OPTIONS = [
  { id: "all", label: "Tous" },
  { id: "published", label: "En vente" },
  { id: "draft", label: "Brouillons" },
  { id: "sold", label: "Vendus" },
  { id: "incomplete", label: "À compléter" },
];
function matchesStatus(car: AdminCar, status: Status) {
  if (status === "all") return true;
  if (status === "incomplete") return missingFields(car).length > 0;
  if (status === "sold") return car.sold === true;
  return !car.sold && car.published === (status === "published");
}

type Sort = "order" | "updated" | "price-asc" | "price-desc" | "year" | "name";
const SORT_OPTIONS = [
  { id: "order", label: "Ordre d’affichage" },
  { id: "updated", label: "Dernière mise à jour" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "year", label: "Année (récente d’abord)" },
  { id: "name", label: "Marque et modèle (A–Z)" },
];

const PAGE_SIZE = 25;
const COLUMNS = ["", "Ordre", "Photo", "Véhicule", "Prix", "Statut", "Mise à jour", ""];
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
  const discount = useDialogTarget<AdminCar>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<"discount" | "delete" | null>(null);
  const [completing, setCompleting] = useState(false);
  const [page, setPage] = useState(1);
  const sensors = useSortSensors();

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

  const discountMutation = useMutation({
    mutationFn: (data: { id: string; discountPrice: number | null }) => setCarDiscount({ data }),
    onMutate: ({ id, discountPrice }) =>
      patchList((list) =>
        list.map((car) => (car.id === id ? { ...car, discount_price: discountPrice } : car)),
      ),
    onError: (e: Error, _vars, context) => rollback(e, context),
    onSuccess: (_, { discountPrice }) =>
      toast.success(discountPrice == null ? "Remise retirée." : "Remise enregistrée."),
    onSettled: () => invalidate(),
  });

  type BulkInput = { ids: string[]; action: BulkAction; percent?: number };
  const bulk = useMutation({
    mutationFn: (data: BulkInput) => bulkCars({ data }),
    onSuccess: (result, { action, percent }) => {
      const n = plural(result.done, "véhicule", "véhicules");
      const message: Record<BulkAction, string> = {
        publish: `${n} publié(s).`,
        unpublish: `${n} dépublié(s).`,
        sold: `${n} marqué(s) comme vendu(s).`,
        unsold: `${n} remis en vente.`,
        delete: `${n} supprimé(s).`,
        discount: percent
          ? `Remise de ${percent} % appliquée à ${n}.`
          : `Remise retirée pour ${n}.`,
      };
      if (result.done) toast.success(message[action]);
      if (result.failed.length)
        toast.danger(
          `${plural(result.failed.length, "véhicule ignoré", "véhicules ignorés")} : ${result.failed[0]!.error}`,
        );
      setSelected(new Set(result.failed.map((f) => f.id)));
    },
    onError: (e: Error) => toast.danger(e.message),
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
  /** New full order; applied to the cache at once so the dropped row doesn't jump back. */
  const applyOrder = (ids: string[]) => {
    const rank = new Map(ids.map((id, index) => [id, index]));
    queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) =>
      list
        ?.map((car) => ({ ...car, sort_order: rank.get(car.id) ?? car.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order),
    );
    reorder.mutate(ids);
  };
  const move = (car: AdminCar, to: "first" | "last") => {
    const ids = (cars.data ?? []).map((c) => c.id).filter((id) => id !== car.id);
    if (to === "first") ids.unshift(car.id);
    else ids.push(car.id);
    applyOrder(ids);
  };
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = (cars.data ?? []).map((c) => c.id);
    applyOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

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
  // Selection only counts vehicles currently shown, so hidden rows are never acted on.
  const selectedIds = visible.filter((car) => selected.has(car.id)).map((car) => car.id);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageCars = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageSelected = pageCars.filter((car) => selected.has(car.id)).length;
  const allSelected = pageCars.length > 0 && pageSelected === pageCars.length;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const runBulk = (action: BulkAction, percent?: number) =>
    bulk.mutateAsync({ ids: selectedIds, action, ...(percent === undefined ? {} : { percent }) });
  const incomplete = all.filter((car) => missingFields(car).length > 0).length;
  // Dragging reorders the full list, so it only makes sense in display order without filters.
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
          <>
            {incomplete > 0 && (
              <Button variant="secondary" onPress={() => setCompleting(true)}>
                <ClipboardList className="size-4" aria-hidden />
                Compléter les infos manquantes
                <span className="tabular rounded-full bg-danger-soft px-1.5 text-xs font-semibold text-danger">
                  {incomplete}
                </span>
              </Button>
            )}
            <Button onPress={() => open(emptyCar)}>
              <Plus className="size-4" aria-hidden />
              Ajouter un véhicule
            </Button>
          </>
        }
      />

      <Toolbar label="Filtrer les véhicules">
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
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
          onChange={(value) => {
            setStatus(value as Status);
            setPage(1);
          }}
          className="w-full sm:w-44"
        />
        <SelectField
          label="Trier par"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => {
            setSort(value as Sort);
            setPage(1);
          }}
          className="w-full sm:w-60"
        />
      </Toolbar>

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <TableSkeleton label="Véhicules" columns={COLUMNS} minWidth="min-w-[860px]" />
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div
              role="toolbar"
              aria-label="Actions groupées"
              className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2 shadow-md"
            >
              <span className="px-2 text-sm font-medium text-foreground">
                {plural(selectedIds.length, "sélectionné", "sélectionnés")}
              </span>
              {selectedIds.length < visible.length && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setSelected(new Set(visible.map((car) => car.id)))}
                >
                  Tout sélectionner ({visible.length})
                </Button>
              )}
              <BulkButton icon={Eye} isDisabled={bulk.isPending} onPress={() => runBulk("publish")}>
                Publier
              </BulkButton>
              <BulkButton
                icon={EyeOff}
                isDisabled={bulk.isPending}
                onPress={() => runBulk("unpublish")}
              >
                Dépublier
              </BulkButton>
              <BulkButton
                icon={Tag}
                isDisabled={bulk.isPending}
                onPress={() => setBulkDialog("discount")}
              >
                Remise
              </BulkButton>
              <BulkButton
                icon={BadgeCheck}
                isDisabled={bulk.isPending}
                onPress={() => runBulk("sold")}
              >
                Marquer vendu
              </BulkButton>
              <BulkButton
                icon={RotateCcw}
                isDisabled={bulk.isPending}
                onPress={() => runBulk("unsold")}
              >
                Remettre en vente
              </BulkButton>
              <BulkButton
                icon={Trash2}
                danger
                isDisabled={bulk.isPending}
                onPress={() => setBulkDialog("delete")}
              >
                Supprimer
              </BulkButton>
              {bulk.isPending && <Spinner size="sm" aria-label="Action en cours" />}
              <Button
                size="sm"
                variant="ghost"
                className="ms-auto"
                onPress={() => setSelected(new Set())}
              >
                <X className="size-4" aria-hidden />
                Désélectionner
              </Button>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
            onDragEnd={onDragEnd}
            accessibility={{
              announcements: frenchAnnouncements((id) => {
                const car = all.find((c) => c.id === id);
                return car ? titleOf(car) : "Véhicule";
              }),
              screenReaderInstructions: { draggable: frenchInstructions },
            }}
          >
            <SortableContext
              items={pageCars.map((car) => car.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Véhicules"
                    className="min-w-[860px]"
                    keyboardNavigationBehavior="tab"
                  >
                    <Table.Header>
                      <Table.Column className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Sélectionner les véhicules de cette page"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = pageSelected > 0 && !allSelected;
                          }}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              for (const car of pageCars)
                                if (allSelected) next.delete(car.id);
                                else next.add(car.id);
                              return next;
                            })
                          }
                          className="size-4 cursor-pointer accent-[var(--accent)]"
                        />
                      </Table.Column>
                      <Table.Column className="w-12">
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
                      {pageCars.map((car, index) => (
                        <CarRow
                          key={car.id}
                          car={car}
                          selected={selected.has(car.id)}
                          onSelect={() => toggle(car.id)}
                          order={
                            canReorder
                              ? {
                                  first: current === 1 && index === 0,
                                  last: current === pageCount && index === pageCars.length - 1,
                                  onMove: (to) => move(car, to),
                                }
                              : undefined
                          }
                          onToggleSold={() => sell.mutate({ id: car.id, sold: !car.sold })}
                          onDiscount={() => discount.open(car)}
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
            </SortableContext>
          </DndContext>
          {visible.length > 0 && (
            <ListPagination
              page={current}
              pageCount={pageCount}
              onChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              summary={`${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, visible.length)} sur ${plural(visible.length, "véhicule", "véhicules")}${filtersActive ? ` (${all.length} au total)` : ""}`}
            />
          )}
          <p className="text-sm text-muted">
            {canReorder
              ? "Glissez une ligne par sa poignée pour changer l’ordre d’affichage sur le site. Pour changer de page, utilisez « Afficher en premier / en dernier »."
              : "Pour changer l’ordre d’affichage sur le site, choisissez « Ordre d’affichage » et retirez les filtres."}
          </p>
        </>
      )}

      <CompleteDetailsDialog
        cars={all}
        isOpen={completing}
        onOpenChange={setCompleting}
        onSaved={invalidate}
        onEditCar={(car) => open(car)}
      />

      <BulkDiscountDialog
        count={selectedIds.length}
        isOpen={bulkDialog === "discount"}
        onOpenChange={(isOpen) => setBulkDialog(isOpen ? "discount" : null)}
        onApply={(percent) => runBulk("discount", percent)}
      />

      <ConfirmDialog
        isOpen={bulkDialog === "delete"}
        onOpenChange={(isOpen) => setBulkDialog(isOpen ? "delete" : null)}
        title={`Supprimer ${plural(selectedIds.length, "véhicule", "véhicules")} ?`}
        confirmLabel="Supprimer"
        onConfirm={() => runBulk("delete")}
      >
        <p>
          Les véhicules sélectionnés et leurs photos seront définitivement supprimés. Cette action
          est irréversible.
        </p>
      </ConfirmDialog>

      <DiscountDialog
        car={discount.target}
        isOpen={discount.isOpen}
        onOpenChange={discount.onOpenChange}
        onSave={(discountPrice) =>
          discount.target
            ? discountMutation.mutateAsync({ id: discount.target.id, discountPrice })
            : Promise.resolve()
        }
      />

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

type MoveTo = "first" | "last";

/** Keeps clicks on controls inside a row from opening the vehicle. */
const stop = (event: SyntheticEvent) => event.stopPropagation();
const isolate = { onPointerDown: stop, onClick: stop, onKeyDown: stop };

function CarRow({
  car,
  selected,
  onSelect,
  order,
  publishing,
  onEdit,
  onTogglePublished,
  onToggleSold,
  onDiscount,
  onDelete,
}: {
  car: AdminCar;
  selected: boolean;
  onSelect: () => void;
  /** Present when the list can be reordered. */
  order?: { first: boolean; last: boolean; onMove: (to: MoveTo) => void } | undefined;
  publishing: boolean;
  onEdit: () => void;
  onTogglePublished: () => void;
  onToggleSold: () => void;
  onDiscount: () => void;
  onDelete: () => void;
}) {
  const title = titleOf(car);
  const percent = discountPercent(car);
  const missing = missingFields(car);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: car.id, disabled: !order });
  return (
    <Table.Row
      id={car.id}
      ref={setNodeRef}
      onAction={onEdit}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`cursor-pointer ${car.sold ? "opacity-70" : ""} ${
        isDragging ? "relative z-10 bg-surface shadow-lg ring-1 ring-border" : ""
      }`}
    >
      <Table.Cell>
        <input
          {...isolate}
          type="checkbox"
          aria-label={`Sélectionner ${title}`}
          checked={selected}
          onChange={onSelect}
          className="size-4 cursor-pointer accent-[var(--accent)]"
        />
      </Table.Cell>
      <Table.Cell>
        {order ? (
          <DragHandle
            label={`Déplacer ${title}`}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        ) : (
          <span className="block w-8" aria-hidden />
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
          {...isolate}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
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
        ) : !car.sold && car.price > 0 ? (
          <button
            type="button"
            {...isolate}
            onClick={(event) => {
              event.stopPropagation();
              onDiscount();
            }}
            title={percent ? "Modifier la remise" : "Ajouter une remise"}
            className="group grid rounded-sm text-start outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <PriceLabel car={car} percent={percent} />
            {!percent && (
              <span className="inline-flex items-center gap-1 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Tag className="size-3" aria-hidden /> Remise
              </span>
            )}
          </button>
        ) : (
          <PriceLabel car={car} percent={percent} />
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
          {missing.length > 0 && (
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  {...isolate}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  aria-label={`À compléter : ${missing.join(", ")}`}
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <StatusChip tone="danger">À compléter · {missing.length}</StatusChip>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content className="max-w-64 text-sm">
                Manque : {missing.join(", ")}
              </Tooltip.Content>
            </Tooltip>
          )}
          {publishing && <Spinner size="sm" aria-label="Mise à jour du statut" />}
        </span>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm text-muted">
        {car.updated_at ? dateFormat.format(new Date(car.updated_at)) : "—"}
      </Table.Cell>
      <Table.Cell className="text-end">
        <div {...isolate} className="inline-flex">
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
              !car.price_on_request &&
                car.price > 0 &&
                !car.sold && {
                  id: "discount",
                  label: percent ? "Modifier la remise" : "Ajouter une remise",
                  icon: Tag,
                  onAction: onDiscount,
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
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

function PriceLabel({ car, percent }: { car: AdminCar; percent: number }) {
  return percent ? (
    <span className="grid">
      <span className="font-medium text-accent">
        {formatPrice(salePrice(car))} <span className="text-xs font-semibold">−{percent} %</span>
      </span>
      <del className="text-xs text-muted">{formatPrice(car.price)}</del>
    </span>
  ) : (
    <span>{formatPrice(car.price)}</span>
  );
}

function BulkButton({
  icon: Icon,
  danger,
  isDisabled,
  onPress,
  children,
}: {
  icon: typeof Eye;
  danger?: boolean;
  isDisabled: boolean;
  onPress: () => unknown;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={danger ? "danger-soft" : "secondary"}
      isDisabled={isDisabled}
      onPress={() => void onPress()}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Button>
  );
}
