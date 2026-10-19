import type { HTMLAttributes } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mouse: drag after 4 px (clicks still work). Touch: press and hold 200 ms so
 * the page can still scroll. Keyboard: Space to pick up, arrows, Space to drop.
 */
export function useSortSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** Grip button that starts the drag; keeps its events from reaching the row/tile. */
export function DragHandle({
  label,
  attributes,
  listeners,
  isDisabled,
  className,
  setActivatorNodeRef,
}: {
  label: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDisabled?: boolean;
  className?: string;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}) {
  const handlers = (listeners ?? {}) as HTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={label}
      title="Glisser pour déplacer"
      disabled={isDisabled}
      {...attributes}
      {...handlers}
      onPointerDown={(event) => {
        handlers.onPointerDown?.(event);
        event.stopPropagation();
      }}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "grid size-8 shrink-0 touch-none place-items-center rounded-lg text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40",
        "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}

/** Screen reader announcements in French. */
export const frenchAnnouncements = (name: (id: string) => string) => ({
  onDragStart: ({ active }: { active: { id: string | number } }) =>
    `${name(String(active.id))} saisi.`,
  onDragOver: ({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => (over ? `${name(String(active.id))} au-dessus de ${name(String(over.id))}.` : ""),
  onDragEnd: ({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) =>
    over
      ? `${name(String(active.id))} déposé à la place de ${name(String(over.id))}.`
      : "Déplacement annulé.",
  onDragCancel: ({ active }: { active: { id: string | number } }) =>
    `Déplacement de ${name(String(active.id))} annulé.`,
});

export const frenchInstructions =
  "Pour déplacer, appuyez sur Espace, utilisez les flèches, puis Espace pour déposer ou Échap pour annuler.";
