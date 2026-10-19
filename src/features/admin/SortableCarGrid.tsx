import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import { closestCenter, DndContext, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil } from "lucide-react";
import { CarCard, CarGrid } from "@/components/aks/CarCard";
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
  const lastDrop = useRef(0);
  const dropped = () => {
    setDragging(null);
    lastDrop.current = Date.now();
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    dropped();
    if (!over || active.id === over.id) return;
    const ids = cars.map((car) => car.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }
  const edit = (car: AdminCar) => Date.now() - lastDrop.current > 300 && onEdit(car);
  const draggedCar = dragging ? cars.find((car) => car.id === dragging) : undefined;

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
      <SortableContext items={cars.map((car) => car.id)} strategy={rectSortingStrategy}>
        <CarGrid>
          {cars.map((car, index) => (
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
            <CarCard car={draggedCar} preview />
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
      className={`relative ${isDragging ? "opacity-30" : ""}`}
    >
      {/* Click to edit; press and move to drag. */}
      <div
        {...listeners}
        onClick={onEdit}
        className="h-full cursor-grab touch-manipulation select-none active:cursor-grabbing"
      >
        <CarCard car={car} preview />
      </div>
      <div className="pointer-events-none absolute left-3 top-12 flex items-center gap-2">
        <span className="tabular grid size-7 place-items-center rounded-full bg-black/70 text-xs font-semibold text-white">
          {position}
        </span>
        {status && <StatusChip tone={car.sold ? "warning" : "default"}>{status}</StatusChip>}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1">
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
