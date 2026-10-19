import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Label, SearchField, Spinner, Table, toast, Tooltip } from "@heroui/react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BadgeCheck,
  ClipboardList,
  X,
  Check,
  ArrowUpDown,
  Car as CarIcon,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Store,
  Tag,
  Trash2,
} from "@/components/icons";
import { carImage, discountPercent, formatKm, formatPrice, salePrice } from "@/lib/cars";
import {
  bulkCars,
  deleteCar,
  reorderCars,
  setCarDiscount,
  shareCars,
  setCarPublished,
  setCarSold,
  type CarInput,
} from "@/lib/data";
import type { BulkAction, FacebookSync } from "@/server/repository";
import { CompleteDetailsDialog } from "./CompleteDetailsDialog";
import { announceShare, socialStatusQuery } from "./SocialCard";
import { ShareDialog } from "./ShareDialog";
import { onSale, showcaseWith, useVitrine } from "./VitrinePage";
import { BulkDiscountDialog, DiscountDialog } from "./DiscountDialog";
import { useDialogTarget } from "./hooks";
import { CarCardsSkeleton, fadeIn } from "./skeletons";
import {
  adminCarsQuery,
  adminCarsQueryKey,
  dateFormat,
  emptyCar,
  facebookSyncQuery,
  fieldsToFill,
  missingFields,
  normalize,
  plural,
  type AdminCar,
} from "./model";
import { FacebookLogo } from "@/components/aks/SocialLogos";
import { brandInfo } from "@/features/catalog/brands";
import {
  ConfirmDialog,
  EmptyState,
  ListPagination,
  LoadError,
  BottomSheet,
  PageHeader,
  SheetOption,
  RowMenu,
  type RowAction,
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
const COLUMNS = ["", "Photo", "Véhicule", "Prix", "Statut", "Facebook", "Mise à jour", ""];
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

export function CarsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("order");
  const [publishing, setPublishing] = useState<ReadonlySet<string>>(new Set());
  const deletion = useDialogTarget<AdminCar>();
  const discount = useDialogTarget<AdminCar>();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<"discount" | "delete" | null>(null);
  const [completing, setCompleting] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  // Height of the phone selection panel: the list leaves exactly that much room
  // below its last card, so every card can be scrolled above the panel.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const hasSelection = selected.size > 0;
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasSelection]);
  /** Vehicles to share on Facebook / Instagram (row or bulk action). */
  const [sharing, setSharing] = useState<string[] | null>(null);
  const [page, setPage] = useState(1);
  const vitrine = useVitrine();
  const facebook = useQuery(facebookSyncQuery);
  const syncByCar = new Map((facebook.data ?? []).map((row) => [row.carId, row]));

  const cars = useQuery(adminCarsQuery);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
    ]);

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
        publish: `${n} publié(s) : visible(s) sur le site.`,
        unpublish: `${n} retiré(s) du site (brouillons).`,
        sold: `${n} marqué(s) comme vendu(s).`,
        unsold: `Mention « vendu » retirée pour ${n}.`,
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

  const navigate = useNavigate();
  const router = useRouter();
  // "+" opens the editor instantly: its code and the network status load beforehand.
  useEffect(() => {
    void router
      .preloadRoute({ to: "/admin/vehicules/$carId", params: { carId: "nouveau" } })
      .catch(() => undefined);
    void queryClient.prefetchQuery(socialStatusQuery);
  }, [router, queryClient]);
  /** Opens the vehicle editor page (or a new vehicle). */
  const open = (car: CarInput) =>
    void navigate({ to: "/admin/vehicules/$carId", params: { carId: car.id ?? "nouveau" } });

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
  const selectedCars = visible.filter((car) => selected.has(car.id));
  const selectedIds = selectedCars.map((car) => car.id);
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
  /** Vehicles already in the target state are left out, so the message counts real changes. */
  const needsChange: Partial<Record<BulkAction, (car: AdminCar) => boolean>> = {
    publish: (car) => !car.published,
    unpublish: (car) => car.published,
    sold: (car) => !car.sold,
    unsold: (car) => car.sold === true,
  };
  const runBulk = (action: BulkAction, percent?: number) => {
    const test = needsChange[action];
    const ids = test ? selectedCars.filter(test).map((car) => car.id) : selectedIds;
    if (!ids.length) {
      toast.info("Aucun changement : les véhicules sélectionnés sont déjà dans cet état.");
      return Promise.resolve();
    }
    return bulk.mutateAsync({ ids, action, ...(percent === undefined ? {} : { percent }) });
  };
  // Same list as the completion window (it also asks for prices not set yet).
  const incomplete = all.filter((car) => fieldsToFill(car).length > 0).length;
  // Dragging reorders the full list, so it only makes sense in display order without filters.
  const canReorder = sort === "order" && !filtersActive;

  const emptyState = all.length ? (
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
  );

  /** Same data and actions for a table row (computer) and a card (phone). */
  const itemProps = (car: AdminCar, index: number): ItemProps => ({
    car,
    selected: selected.has(car.id),
    onSelect: () => toggle(car.id),
    order: canReorder
      ? {
          first: current === 1 && index === 0,
          last: current === pageCount && index === pageCars.length - 1,
          onMove: (to) => move(car, to),
        }
      : undefined,
    onToggleSold: () => sell.mutate({ id: car.id, sold: !car.sold }),
    onDiscount: () => discount.open(car),
    onShare: () => setSharing([car.id]),
    onToggleShowcase: () =>
      vitrine.mutate(
        car.featured_rank != null ? showcaseWith(all, [], [car.id]) : showcaseWith(all, [car.id]),
        {
          onSuccess: () =>
            toast.success(
              car.featured_rank != null
                ? "Retiré de la vitrine."
                : "Ajouté à la vitrine de l’accueil.",
            ),
        },
      ),
    publishing: publishing.has(car.id),
    onEdit: () => open(car),
    onTogglePublished: () => publish.mutate({ id: car.id, published: !car.published }),
    onDelete: () => deletion.open(car),
    facebook: syncByCar.get(car.id),
    facebookLoading: facebook.isPending,
  });

  /** Actions on the selection: short label + tint for the phone panel, full label on computers. */
  type BulkItem = {
    id: string;
    label: string;
    long?: string;
    icon: typeof Eye;
    tint: string;
    danger?: boolean;
    disabled?: boolean;
    onPress: () => unknown;
  };
  const toShowcase = selectedCars.filter((car) => car.featured_rank == null && onSale(car));
  const bulkCandidates: (BulkItem | false)[] = [
    selectedCars.length === 1 && {
      id: "edit",
      label: "Modifier",
      icon: Pencil,
      tint: "bg-slate-100 text-slate-700",
      onPress: () => open(selectedCars[0]!),
    },
    selectedCars.some((car) => !car.published) && {
      id: "publish",
      label: "Publier",
      long: "Publier sur le site",
      icon: Eye,
      tint: "bg-emerald-50 text-emerald-700",
      onPress: () => runBulk("publish"),
    },
    selectedCars.some((car) => car.published) && {
      id: "unpublish",
      label: "Retirer",
      long: "Retirer du site",
      icon: EyeOff,
      tint: "bg-zinc-100 text-zinc-700",
      onPress: () => runBulk("unpublish"),
    },
    {
      id: "discount",
      label: "Remise",
      icon: Tag,
      tint: "bg-violet-50 text-violet-700",
      onPress: () => setBulkDialog("discount"),
    },
    toShowcase.length > 0 && {
      id: "showcase",
      label: "Vitrine",
      long: "Ajouter à la vitrine",
      icon: Store,
      tint: "bg-amber-50 text-amber-700",
      disabled: vitrine.isPending,
      onPress: () =>
        vitrine
          .mutateAsync(
            showcaseWith(
              all,
              toShowcase.map((car) => car.id),
            ),
          )
          .then(() => {
            toast.success(
              `${plural(toShowcase.length, "véhicule ajouté", "véhicules ajoutés")} à la vitrine.`,
            );
            setSelected(new Set());
          })
          .catch(() => undefined), // reported by the mutation
    },
    selectedCars.some(onSale) && {
      id: "share",
      label: "Réseaux",
      long: "Facebook / Instagram",
      icon: Share2,
      tint: "bg-blue-50 text-blue-700",
      onPress: () => setSharing(selectedCars.filter(onSale).map((car) => car.id)),
    },
    selectedCars.some((car) => !car.sold) && {
      id: "sold",
      label: "Vendu",
      long: "Marquer vendu",
      icon: BadgeCheck,
      tint: "bg-sky-50 text-sky-700",
      onPress: () => runBulk("sold"),
    },
    // Only for vehicles marked sold: removes the mark (drafts stay drafts).
    selectedCars.some((car) => car.sold) && {
      id: "unsold",
      label: "Remettre",
      long: "Annuler « vendu »",
      icon: RotateCcw,
      tint: "bg-teal-50 text-teal-700",
      onPress: () => runBulk("unsold"),
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: Trash2,
      tint: "bg-red-50 text-red-600",
      danger: true,
      onPress: () => setBulkDialog("delete"),
    },
  ];
  const bulkItems = bulkCandidates.filter((item): item is BulkItem => item !== false);

  const statusCount = (id: Status) => all.filter((car) => matchesStatus(car, id)).length;

  return (
    <div className="grid gap-6">
      {/* Phones: compact header, search with a sort button, status chips. */}
      <div className="grid gap-3 md:hidden">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Véhicules</h1>
          <p className="text-sm text-muted">
            {cars.data
              ? `${all.length} au total · ${published} en vente · ${plural(sold, "vendu", "vendus")}`
              : "Chargement…"}
          </p>
        </header>
        <div className="flex gap-2">
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            aria-label="Rechercher un véhicule"
            className="min-w-0 flex-1"
            fullWidth
          >
            <SearchField.Group className="h-12 rounded-full bg-surface px-1 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Marque, modèle…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-label={`Trier : ${SORT_OPTIONS.find((o) => o.id === sort)?.label}`}
            className="relative grid size-12 shrink-0 place-items-center rounded-full bg-surface text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowUpDown className="size-5" aria-hidden />
            {sort !== "order" && (
              <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-accent" />
            )}
          </button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Statut">
          {STATUS_OPTIONS.map((option) => {
            const active = status === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatus(option.id as Status);
                  setPage(1);
                }}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted shadow-[0_1px_2px_rgb(15_23_42/0.05)]"
                }`}
              >
                {option.label}
                {cars.data && (
                  <span
                    className={`text-xs tabular-nums ${active ? "text-background/70" : "text-muted/80"}`}
                  >
                    {statusCount(option.id as Status)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {incomplete > 0 && (
          <button
            type="button"
            onClick={() => setCompleting(true)}
            className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-start text-sm text-amber-900 outline-none ring-1 ring-amber-200 active:bg-amber-100 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ClipboardList className="size-5 shrink-0 text-amber-600" aria-hidden />
            <span className="flex-1">
              <strong className="font-semibold">
                {plural(incomplete, "véhicule", "véhicules")}
              </strong>{" "}
              à compléter
            </span>
            <span className="font-semibold text-amber-700">Compléter</span>
          </button>
        )}
        <BottomSheet isOpen={sortOpen} onOpenChange={setSortOpen} title="Trier par">
          <div role="listbox" aria-label="Trier par" className="grid gap-0.5">
            {SORT_OPTIONS.map((option) => (
              <SheetOption
                key={option.id}
                selected={sort === option.id}
                onPress={() => {
                  setSort(option.id as Sort);
                  setPage(1);
                  setSortOpen(false);
                }}
              >
                {option.label}
              </SheetOption>
            ))}
          </div>
        </BottomSheet>
      </div>

      <div className="max-md:hidden">
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
                <Button
                  variant="secondary"
                  className="max-sm:w-full"
                  onPress={() => setCompleting(true)}
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Compléter les infos manquantes
                  <span className="tabular rounded-full bg-danger-soft px-1.5 text-xs font-semibold text-danger">
                    {incomplete}
                  </span>
                </Button>
              )}
              {/* Phones: the round "+" button at the bottom of the screen instead. */}
              <Button className="max-sm:hidden" onPress={() => open(emptyCar)}>
                <Plus className="size-4" aria-hidden />
                Ajouter un véhicule
              </Button>
            </>
          }
        />
      </div>
      {selectedIds.length === 0 && (
        <Button
          isIconOnly
          aria-label="Ajouter un véhicule"
          onPress={() => open(emptyCar)}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-30 size-14 rounded-full shadow-lg md:hidden"
        >
          <Plus className="size-6" aria-hidden />
        </Button>
      )}

      <div className="max-md:hidden">
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
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:gap-4">
            <SelectField
              label="Statut"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value as Status);
                setPage(1);
              }}
              className="min-w-0 sm:w-44"
            />
            <SelectField
              label="Trier par"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(value) => {
                setSort(value as Sort);
                setPage(1);
              }}
              className="min-w-0 sm:w-60"
            />
          </div>
        </Toolbar>
      </div>

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <>
          <CarCardsSkeleton />
          <div className="hidden md:block">
            <TableSkeleton label="Véhicules" columns={COLUMNS} minWidth="min-w-[860px]" />
          </div>
        </>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <>
              {/* Computers: bar above the table. */}
              <div
                role="toolbar"
                aria-label="Actions groupées"
                className="sticky top-2 z-10 hidden flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2 shadow-md md:flex"
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
                {bulkItems.map((item) => (
                  <BulkButton
                    key={item.id}
                    icon={item.icon}
                    danger={item.danger ?? false}
                    isDisabled={item.disabled ?? bulk.isPending}
                    onPress={item.onPress}
                  >
                    {item.long ?? item.label}
                  </BulkButton>
                ))}
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

              {/* Phones: compact panel at the bottom, one labelled action per tile. */}
              <div
                ref={panelRef}
                data-selection-panel
                role="toolbar"
                aria-label="Actions groupées"
                className="fixed inset-x-0 bottom-0 z-30 rounded-t-[1.75rem] bg-surface pb-[calc(0.75rem+env(safe-area-inset-bottom))] pe-[max(1rem,env(safe-area-inset-right))] ps-[max(1rem,env(safe-area-inset-left))] pt-2.5 shadow-[0_-10px_30px_-10px_rgb(15_23_42/0.3)] animate-in slide-in-from-bottom-6 duration-200 md:hidden"
              >
                <div className="mb-1.5 flex items-center gap-3">
                  <p className="flex-1 text-[15px] font-semibold text-foreground">
                    {plural(selectedIds.length, "véhicule sélectionné", "véhicules sélectionnés")}
                  </p>
                  {bulk.isPending && <Spinner size="sm" aria-label="Action en cours" />}
                  {selectedIds.length < visible.length && (
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(visible.map((car) => car.id)))}
                      className="h-9 rounded-full px-3 text-sm font-semibold text-accent active:bg-accent-soft"
                    >
                      Tout ({visible.length})
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Désélectionner"
                    onClick={() => setSelected(new Set())}
                    className="grid size-9 place-items-center rounded-full bg-surface-secondary text-foreground active:opacity-80"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                {/* One row: swipe sideways when there are more actions than fit. */}
                <div className="-mx-4 flex snap-x gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
                  {bulkItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={item.disabled ?? bulk.isPending}
                        onClick={() => void item.onPress()}
                        className="flex w-[4.6rem] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl px-1 py-1.5 outline-none transition-colors active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40"
                      >
                        <span
                          className={`grid size-10 place-items-center rounded-full ${item.tint}`}
                        >
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span
                          className={`text-center text-xs font-medium leading-tight ${item.danger ? "text-danger" : "text-foreground"}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {/* Phones and small tablets: one card per vehicle. */}
          <ul aria-label="Véhicules" className={`grid gap-3 md:hidden ${fadeIn}`}>
            {pageCars.map((car, index) => (
              <CarCard key={car.id} {...itemProps(car, index)} />
            ))}
            {pageCars.length === 0 && <li>{emptyState}</li>}
          </ul>
          <Table className="hidden md:block">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Véhicules"
                className="min-w-[860px]"
                keyboardNavigationBehavior="tab"
              >
                <Table.Header>
                  <Table.Column className="w-10">
                    {/* Some or all rows ticked: a click clears them; none: selects the page.
                        Its clicks are kept from the table header (which would swallow them). */}
                    <input
                      {...isolate}
                      type="checkbox"
                      aria-label={
                        pageSelected
                          ? "Désélectionner les véhicules de cette page"
                          : "Sélectionner les véhicules de cette page"
                      }
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = pageSelected > 0 && !allSelected;
                      }}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const car of pageCars)
                            if (pageSelected > 0) next.delete(car.id);
                            else next.add(car.id);
                          return next;
                        })
                      }
                      className="size-4 cursor-pointer accent-[var(--accent)]"
                    />
                  </Table.Column>
                  <Table.Column className="w-24">Photo</Table.Column>
                  <Table.Column isRowHeader>Véhicule</Table.Column>
                  <Table.Column>Prix</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column>Facebook</Table.Column>
                  <Table.Column>Mise à jour</Table.Column>
                  <Table.Column className="w-14">
                    <span className="sr-only">Actions</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={() => emptyState}>
                  {pageCars.map((car, index) => (
                    <CarRow key={car.id} {...itemProps(car, index)} />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
          {/* Room under the last cards for the phone selection panel. */}
          {selectedIds.length > 0 && (
            <div aria-hidden className="md:hidden" style={{ height: panelHeight + 16 }} />
          )}
          <p className="text-sm text-muted">
            Pour changer l’ordre d’affichage sur le site, cliquez sur la marque d’un véhicule : ses
            véhicules s’affichent en cartes, à glisser-déposer.
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

      <ShareDialog
        count={sharing?.length ?? 0}
        isOpen={sharing !== null}
        onOpenChange={(open) => !open && setSharing(null)}
        onShare={async (targets) => {
          try {
            const result = await shareCars({ data: { ids: sharing ?? [], targets } });
            if (result.error) toast.danger(result.error);
            else if (result.started)
              toast.success(
                `${plural(result.started, "publication lancée", "publications lancées")} : elles apparaissent dans la colonne Facebook dans quelques secondes.`,
              );
            else toast.info("Rien à publier : ces véhicules sont déjà sur les réseaux choisis.");
            setSelected(new Set());
            await queryClient.invalidateQueries({ queryKey: ["admin-facebook-sync"] });
          } catch (e) {
            toast.danger(e instanceof Error ? e.message : "Publication impossible.");
            throw e;
          }
        }}
      />

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

type ItemProps = {
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
  onToggleShowcase: () => void;
  onShare: () => void;
  onDelete: () => void;
  facebook: FacebookSync | undefined;
  facebookLoading: boolean;
};

function CarRow({
  car,
  selected,
  onSelect,
  publishing,
  onEdit,
  onDiscount,
  facebook,
  facebookLoading,
  ...handlers
}: ItemProps) {
  const title = titleOf(car);
  const percent = discountPercent(car);
  const missing = missingFields(car);
  const inShowcase = car.featured_rank != null;
  return (
    <Table.Row
      id={car.id}
      onAction={onEdit}
      className={`cursor-pointer ${car.sold ? "opacity-70" : ""}`}
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
        <img
          src={carImage(car)}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-16 rounded-lg border border-separator bg-surface-secondary object-cover"
        />
      </Table.Cell>
      <Table.Cell>
        {/* The brand opens its ordering page; the name opens the vehicle. */}
        <Link
          to="/admin/vehicules/marque/$brand"
          params={{ brand: brandInfo(car.brand).slug }}
          onPointerDown={stop}
          onKeyDown={stop}
          onClick={stop}
          title={`Ordre des véhicules ${car.brand}`}
          className="rounded-sm text-xs font-medium text-muted outline-none hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          {car.brand}
        </Link>
        <button
          type="button"
          {...isolate}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="block rounded-sm text-start font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          {car.name}
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
          {inShowcase && onSale(car) && <StatusChip tone="accent">Vitrine</StatusChip>}
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
      <Table.Cell className="whitespace-nowrap text-sm">
        <FacebookCell sync={facebook} loading={facebookLoading} published={car.published} />
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm text-muted">
        {car.updated_at ? dateFormat.format(new Date(car.updated_at)) : "—"}
      </Table.Cell>
      <Table.Cell className="text-end">
        <div {...isolate} className="inline-flex">
          <RowMenu
            label={`Actions pour ${title}`}
            actions={carMenu({ car, onEdit, onDiscount, ...handlers })}
          />
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

/** The "…" menu of a vehicle (table row and phone card). */
function carMenu({
  car,
  order,
  onEdit,
  onTogglePublished,
  onToggleSold,
  onDiscount,
  onToggleShowcase,
  onShare,
  onDelete,
}: Pick<
  ItemProps,
  | "car"
  | "order"
  | "onEdit"
  | "onTogglePublished"
  | "onToggleSold"
  | "onDiscount"
  | "onToggleShowcase"
  | "onShare"
  | "onDelete"
>): (RowAction | false | undefined)[] {
  const percent = discountPercent(car);
  const inShowcase = car.featured_rank != null;
  return [
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
    // Only cars en vente can be added; a featured one can always be removed.
    (onSale(car) || inShowcase) && {
      id: "vitrine",
      label: inShowcase ? "Retirer de la vitrine" : "Ajouter à la vitrine",
      icon: Store,
      onAction: onToggleShowcase,
    },
    onSale(car) && {
      id: "share",
      label: "Publier sur Facebook / Instagram",
      icon: Share2,
      onAction: onShare,
    },
    {
      id: "sold",
      label: car.sold ? "Annuler « vendu »" : "Marquer comme vendu",
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
      label: car.published ? "Retirer du site" : "Publier sur le site",
      icon: car.published ? EyeOff : Eye,
      onAction: onTogglePublished,
    },
    { id: "delete", label: "Supprimer", icon: Trash2, onAction: onDelete, danger: true },
  ];
}

/**
 * Phone card: a tap selects it (highlighted, tick on the photo); the actions,
 * "Modifier" first, are in "…" and in the bar of the selection.
 */
function CarCard(props: ItemProps) {
  const { car, selected, onSelect, publishing, facebook, facebookLoading } = props;
  const title = titleOf(car);
  const percent = discountPercent(car);
  const missing = missingFields(car);
  return (
    <li>
      <div
        role="checkbox"
        aria-checked={selected}
        aria-label={title}
        tabIndex={0}
        onClick={(event) => {
          const card = event.currentTarget;
          onSelect();
          // Once the selection panel is up, keep the tapped card visible above it.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const panel = document.querySelector("[data-selection-panel]");
              const limit = panel ? panel.getBoundingClientRect().top : window.innerHeight;
              const bottom = card.getBoundingClientRect().bottom;
              if (bottom > limit - 8)
                window.scrollBy({ top: bottom - limit + 16, behavior: "smooth" });
            }),
          );
        }}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onSelect();
          }
        }}
        className={`relative flex cursor-pointer select-none gap-3 rounded-2xl border p-3 outline-none transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-focus ${
          selected
            ? "border-accent bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))] ring-2 ring-accent"
            : "border-separator bg-surface"
        } ${car.sold && !selected ? "opacity-75" : ""}`}
      >
        <div className="relative shrink-0 self-start">
          <img
            src={carImage(car)}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-24 rounded-xl bg-surface-secondary object-cover"
          />
          {selected && (
            <span className="absolute -start-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-surface animate-in zoom-in-50 duration-150">
              <Check className="size-3.5" aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            {car.brand} · {car.year} · {formatKm(car.km_value)}
          </p>
          <p className="line-clamp-2 font-semibold leading-snug text-foreground">{car.name}</p>
          <div className="mt-0.5 text-sm">
            {car.price_on_request ? (
              <span className="text-muted">Prix masqué</span>
            ) : (
              <PriceLabel car={car} percent={percent} />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {car.sold ? (
              <StatusChip tone="warning">Vendu</StatusChip>
            ) : (
              <StatusChip tone={car.published ? "success" : "default"}>
                {car.published ? "En vente" : "Brouillon"}
              </StatusChip>
            )}
            {car.featured_rank != null && onSale(car) && (
              <StatusChip tone="accent">Vitrine</StatusChip>
            )}
            {missing.length > 0 && (
              <StatusChip tone="danger">À compléter · {missing.length}</StatusChip>
            )}
            {facebook && (
              <span className="text-xs" {...isolate}>
                <FacebookCell sync={facebook} loading={facebookLoading} published={car.published} />
              </span>
            )}
            {publishing && <Spinner size="sm" aria-label="Mise à jour du statut" />}
          </div>
        </div>
        <div {...isolate} className="-me-1 -mt-1 self-start">
          <RowMenu label={`Actions pour ${title}`} actions={carMenu(props)} large />
        </div>
      </div>
    </li>
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

/** Whether the vehicle is on the Facebook Page: link to the post, or why not. */
function FacebookCell({
  sync,
  loading,
  published,
}: {
  sync: FacebookSync | undefined;
  loading: boolean;
  published: boolean;
}) {
  if (loading) return <span className="text-muted">…</span>;
  if (sync?.status === "published")
    return sync.permalink ? (
      <a
        href={sync.permalink}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={stop}
        onKeyDown={stop}
        onClick={stop}
        className="inline-flex items-center gap-1.5 rounded-sm font-medium text-success outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        title="Voir la publication Facebook"
      >
        <FacebookLogo className="size-4" />
        Publié
      </a>
    ) : (
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <FacebookLogo className="size-4" />
        Publié
      </span>
    );
  if (sync?.status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Spinner size="sm" aria-hidden /> En cours
      </span>
    );
  if (sync?.status === "failed")
    return (
      <span className="font-medium text-danger" title={sync.error ?? undefined}>
        Échec
      </span>
    );
  return (
    <span className="text-muted" title={published ? "Pas encore partagé sur Facebook" : undefined}>
      Non publié
    </span>
  );
}
