import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { closestCenter, DndContext, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil } from "@/components/icons";
import { CarCard, CarGrid } from "@/components/aks/CarCard";
import { carImage, formatPrice, salePrice } from "@/lib/cars";
import { reorderCars } from "@/lib/data";
import { adminCarsQueryKey, type AdminCar } from "./model";
import { DragHandle, frenchAnnouncements, frenchInstructions, useSortSensors } from "./sortable";
import { IconButton, StatusChip } from "./ui";

/**
 * Vehicles as site cards that can be dragged into a new order. A click opens the
 * vehicle (`onEdit`); the click that ends a drag is ignored.
 */
export function SortableCarGrid({
  cars,
  onReorder,
  onEdit,
  actions,
}: {
  cars: AdminCar[];
  /** New order of these vehicles (ids). */
  onReorder: (ids: string[]) => void;
  onEdit: (car: AdminCar) => void;
  /** Extra buttons on a card (e.g. remove from the showcase). */
  actions?: (car: AdminCar) => ReactNode;
}) {
  const sensors = useSortSensors();
  const [dragging, setDragging] = useState<string | null>(null);

  // The order shown right after a drop. Saving takes a moment (and the data layer
  // updates on its next tick), so without this the cards would flash back to the
  // old order for a frame, then jump. Dropped once the saved order has arrived,
  // or after a few seconds (e.g. the save failed and was undone).
  const [local, setLocal] = useState<string[] | null>(null);
  const propOrder = cars.map((car) => car.id).join(",");
  useEffect(() => {
    if (!local) return;
    if (local.join(",") === propOrder) {
      setLocal(null);
      return;
    }
    const timer = window.setTimeout(() => setLocal(null), 5000);
    return () => window.clearTimeout(timer);
  }, [local, propOrder]);
  const byId = new Map(cars.map((car) => [car.id, car]));
  const shown = local
    ? [
        ...local.flatMap((id) => byId.get(id) ?? []),
        // A vehicle added meanwhile goes at the end until the saved order arrives.
        ...cars.filter((car) => !local.includes(car.id)),
      ]
    : cars;

  const lastDrop = useRef(0);
  const dropped = () => {
    setDragging(null);
    lastDrop.current = Date.now();
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    dropped();
    if (!over || active.id === over.id) return;
    const ids = shown.map((car) => car.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setLocal(next); // same render as the drop: no flash of the old order
    onReorder(next);
  }
  const edit = (car: AdminCar) => Date.now() - lastDrop.current > 300 && onEdit(car);
  const draggedCar = dragging ? byId.get(dragging) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setDragging(String(active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={dropped}
      accessibility={{
        announcements: frenchAnnouncements((id) => {
          const car = cars.find((c) => c.id === id);
          return car ? `${car.brand} ${car.name}` : "Véhicule";
        }),
        screenReaderInstructions: { draggable: frenchInstructions },
      }}
    >
      <SortableContext items={shown.map((car) => car.id)} strategy={rectSortingStrategy}>
        <CarGrid>
          {shown.map((car, index) => (
            <SortableCard
              key={car.id}
              car={car}
              position={index + 1}
              onEdit={() => edit(car)}
              actions={actions?.(car)}
            />
          ))}
        </CarGrid>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {draggedCar && (
          <div className="pointer-events-none rotate-1 scale-[1.02] rounded-2xl shadow-2xl">
            <div className="hidden md:block">
              <CarCard car={draggedCar} preview />
            </div>
            <div className="md:hidden">
              <CompactRow car={draggedCar} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCard({
  car,
  position,
  onEdit,
  actions,
}: {
  car: AdminCar;
  position: number;
  onEdit: () => void;
  actions: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: car.id });
  const status = car.sold ? "Vendu" : car.published ? null : "Brouillon";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // Dragging a card never triggers the pull-to-refresh of the page.
      data-no-pull
      className={`relative min-w-0 ${isDragging ? "opacity-30" : ""}`}
    >
      {/* Phones: a compact row (several fit on screen), dragged by its handle so the
          page still scrolls under the finger. */}
      <div className="md:hidden">
        <CompactRow car={car} position={position} onClick={onEdit}>
          {actions}
          <DragHandle
            label={`Déplacer ${car.brand} ${car.name}`}
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            className="size-10 bg-surface-secondary"
          />
        </CompactRow>
      </div>
      {/* Click to edit; press and move to drag. */}
      <div
        {...listeners}
        onClick={onEdit}
        className="hidden h-full cursor-grab touch-manipulation select-none active:cursor-grabbing md:block"
      >
        <CarCard car={car} preview />
      </div>
      <div className="pointer-events-none absolute left-3 top-12 hidden items-center gap-2 md:flex">
        <span className="tabular grid size-7 place-items-center rounded-full bg-black/70 text-xs font-semibold text-white">
          {position}
        </span>
        {status && <StatusChip tone={car.sold ? "warning" : "default"}>{status}</StatusChip>}
      </div>
      <div className="absolute bottom-3 right-3 hidden gap-1 md:flex">
        {actions}
        <IconButton
          label={`Modifier ${car.brand} ${car.name}`}
          icon={Pencil}
          onPress={onEdit}
          variant="secondary"
        />
        <DragHandle
          label={`Déplacer ${car.brand} ${car.name}`}
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
          className="bg-surface shadow-sm"
        />
      </div>
    </div>
  );
}

/** Phone row: position, photo, name, price, status, then the buttons. */
function CompactRow({
  car,
  position,
  onClick,
  children,
}: {
  car: AdminCar;
  position?: number;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const status = car.sold ? "Vendu" : car.published ? null : "Brouillon";
  return (
    <div
      onClick={onClick}
      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-separator bg-surface p-2.5 active:bg-surface-secondary"
    >
      {position !== undefined && (
        <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
          {position}
        </span>
      )}
      <img
        src={carImage(car)}
        alt=""
        loading="lazy"
        className="aspect-[4/3] w-20 shrink-0 rounded-lg bg-surface-secondary object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted">
          {car.brand} · {car.year}
        </p>
        <p className="truncate font-semibold text-foreground">{car.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {car.price_on_request || !car.price ? "Prix sur demande" : formatPrice(salePrice(car))}
          {status && <StatusChip tone={car.sold ? "warning" : "default"}>{status}</StatusChip>}
        </p>
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Reorders some vehicles among the places they already hold in the site order,
 * so the others keep theirs (a brand's cars, or the published ones).
 */
export function useReorderWithin() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (ids: string[]) => reorderCars({ data: { ids } }),
    onError: (e: Error) => toast.danger(e.message),
    onSuccess: () => toast.success("Ordre enregistré."),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
      ]),
  });
  return (all: AdminCar[], subsetInNewOrder: string[]) => {
    const subset = new Set(subsetInNewOrder);
    const ids = all.map((car) => car.id);
    let next = 0;
    for (let i = 0; i < ids.length; i++)
      if (subset.has(ids[i]!)) ids[i] = subsetInNewOrder[next++]!;
    const previous = queryClient.getQueryData<AdminCar[]>(adminCarsQueryKey);
    const rank = new Map(ids.map((id, index) => [id, index]));
    queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) =>
      list
        ?.map((car) => ({ ...car, sort_order: rank.get(car.id) ?? car.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order),
    );
    mutation.mutate(ids, {
      onError: () => previous && queryClient.setQueryData(adminCarsQueryKey, previous),
    });
  };
}
