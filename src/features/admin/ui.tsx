import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Chip,
  Description,
  Drawer,
  Dropdown,
  EmptyState as EmptyStateRoot,
  Label,
  ListBox,
  NumberField,
  Pagination,
  ProgressBar,
  Select,
  Separator,
  Skeleton,
  Switch,
  Table,
  Tooltip,
  type ButtonProps,
} from "@heroui/react";
import { FileTrigger } from "react-aria-components";
import {
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from "@/components/icons";
import { Link } from "@tanstack/react-router";

import type { UploadState } from "./hooks";
import { IMAGE_TYPES, type Option } from "./model";

/*
 * Admin design system. Type scale: page title text-xl, section title text-base,
 * body text-sm, meta text-xs. Spacing on the 8px grid (gap-2/4/6/8). Controls use
 * the default HeroUI size, except dense table/tile actions which use size="sm".
 */

/* ───────── Phone (and installed app) ───────── */

const PHONE_QUERY = "(max-width: 1023.98px)";
const subscribePhone = (onChange: () => void) => {
  const media = window.matchMedia(PHONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
/**
 * Phone-width screen (the admin app): menus and selects open as bottom sheets,
 * numbers use the phone keypad and wheel. Computers keep popovers.
 */
export function useIsPhone() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

/** Drag (px) or flick speed (px/ms) that closes a bottom sheet. */
const SHEET_CLOSE_DISTANCE = 110;
const SHEET_CLOSE_SPEED = 0.6;

/**
 * Sheet sliding up from the bottom of the screen (phone replacement for popovers).
 * It follows the finger when dragged down and closes past a distance or on a
 * quick flick; a list inside keeps scrolling normally until it is at its top.
 */
export function BottomSheet({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const drag = useRef<{ y: number; t: number; dy: number; active: boolean } | null>(null);
  const sheet = useRef<HTMLElement | null>(null);
  const move = (dy: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? "transform 220ms cubic-bezier(0.2, 0, 0, 1)" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  };
  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="max-h-[85dvh] rounded-t-[1.75rem] px-[env(safe-area-inset-left)] pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
          <div
            ref={(el) => {
              sheet.current = el?.closest<HTMLElement>("[role='dialog']") ?? null;
            }}
            className="flex min-h-0 flex-1 flex-col"
            onTouchStart={(event) => {
              const t = event.touches[0];
              if (!t) return;
              // Inside a list scrolled down: that list scrolls, the sheet stays.
              const list = (event.target as HTMLElement).closest<HTMLElement>(
                "[data-sheet-scroll]",
              );
              if (list && list.scrollTop > 0) return;
              drag.current = { y: t.clientY, t: event.timeStamp, dy: 0, active: false };
            }}
            onTouchMove={(event) => {
              const d = drag.current;
              const t = event.touches[0];
              if (!d || !t) return;
              const dy = t.clientY - d.y;
              if (!d.active) {
                if (dy < 0) {
                  drag.current = null; // scrolling the list up
                  return;
                }
                if (dy > 6) d.active = true;
              }
              if (d.active) {
                d.dy = Math.max(0, dy);
                move(d.dy, false);
              }
            }}
            onTouchEnd={(event) => {
              const d = drag.current;
              drag.current = null;
              if (!d?.active) return;
              const speed = d.dy / Math.max(1, event.timeStamp - d.t);
              if (d.dy > SHEET_CLOSE_DISTANCE || speed > SHEET_CLOSE_SPEED) {
                move(window.innerHeight, true);
                window.setTimeout(() => {
                  onOpenChange(false);
                  move(0, false);
                }, 180);
              } else move(0, true);
            }}
          >
            <Drawer.Handle />
            <Drawer.Header className="px-5 pb-1 pt-2">
              <Drawer.Heading className="text-base font-semibold text-foreground">
                {title}
              </Drawer.Heading>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </Drawer.Header>
            <Drawer.Body data-sheet-scroll className="overscroll-contain px-3 pb-1 pt-2">
              {children}
            </Drawer.Body>
          </div>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

/** One choice row of a bottom sheet (large touch target, tick when selected). */
export function SheetOption({
  selected = false,
  danger = false,
  icon: Icon,
  onPress,
  href,
  external,
  children,
}: {
  selected?: boolean;
  danger?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
  href?: string;
  external?: boolean;
  children: ReactNode;
}) {
  const className = `flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-start text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
    selected
      ? "bg-accent-soft font-semibold text-accent"
      : danger
        ? "text-danger active:bg-danger-soft"
        : "text-foreground active:bg-surface-secondary"
  }`;
  const body = (
    <>
      {Icon && (
        <Icon
          className={`size-5 shrink-0 ${danger ? "text-danger" : selected ? "text-accent" : "text-muted"}`}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      {selected && <Check className="size-5 shrink-0 text-accent" aria-hidden />}
    </>
  );
  return href ? (
    <a
      href={href}
      className={className}
      onClick={onPress}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {body}
    </a>
  ) : (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={className}
      onClick={onPress}
    >
      {body}
    </button>
  );
}

/** Field-looking button that opens a sheet (phone select, brand picker…). */
export const sheetFieldClass =
  "flex h-11 w-full items-center gap-2 rounded-[var(--field-radius)] border border-[var(--field-border)] bg-[var(--field-background,var(--surface))] px-3 text-start text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-surface-secondary";

/* ───────── Layout ───────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-separator bg-surface p-4 sm:p-6 ${className ?? ""}`}
    >
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Filter row above a table: controls aligned on their bottom edge. */
export function Toolbar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-end gap-4">
      {children}
    </div>
  );
}

/* ───────── Status & feedback ───────── */

export type Tone = "default" | "accent" | "success" | "warning" | "danger";

export function StatusChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Chip size="sm" variant="soft" color={tone}>
      {children}
    </Chip>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <EmptyStateRoot className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon && (
        <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-secondary text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </EmptyStateRoot>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{message}</Alert.Title>
        <Alert.Description>Vérifiez votre connexion puis réessayez.</Alert.Description>
      </Alert.Content>
      <Button size="sm" variant="danger" onPress={onRetry}>
        Réessayer
      </Button>
    </Alert>
  );
}

/** Stand-in table with the real column headers while data loads. */
export function TableSkeleton({
  label,
  columns,
  rows = 5,
  minWidth,
}: {
  label: string;
  columns: string[];
  rows?: number;
  minWidth: string;
}) {
  return (
    <Table aria-busy="true">
      <Table.ScrollContainer>
        <Table.Content aria-label={`${label} (chargement)`} className={minWidth}>
          <Table.Header>
            {columns.map((column, index) => (
              <Table.Column key={column || index} isRowHeader={index === 0}>
                {column}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {Array.from({ length: rows }, (_, row) => (
              <Table.Row key={row} id={`loading-${row}`}>
                {columns.map((column, index) => (
                  <Table.Cell key={column || index}>
                    <Skeleton
                      className={`h-4 rounded-md ${index === 0 ? "w-3/4" : "w-1/2"} ${
                        index === columns.length - 1 ? "ms-auto w-8" : ""
                      }`}
                    />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

/** Determinate once bytes are moving; indeterminate while the image is prepared. */
export function UploadProgress({ state, label }: { state: UploadState; label: string }) {
  if (state.status === "error") return null;
  const percent = state.progress === null ? null : Math.round(state.progress * 100);
  return (
    <ProgressBar
      size="sm"
      aria-label={label}
      className="w-full"
      {...(percent === null ? { isIndeterminate: true } : { value: percent })}
    >
      <Label className="text-xs text-muted">
        {percent === null ? "Préparation de l’image…" : "Envoi en cours"}
      </Label>
      <ProgressBar.Output className="text-xs text-muted" />
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

/* ───────── Actions ───────── */

/** Icon-only button with an accessible name and a matching tooltip. */
export function IconButton({
  label,
  icon: Icon,
  onPress,
  variant = "ghost",
  isDisabled,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
  variant?: ButtonProps["variant"];
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip delay={400} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant={variant}
        aria-label={label}
        isDisabled={isDisabled ?? false}
        className={className ?? ""}
        {...(onPress ? { onPress } : {})}
      >
        <Icon className="size-4" aria-hidden />
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

export type RowAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onAction?: () => void;
  /** Links open in a new tab when `external` (site pages, WhatsApp). */
  href?: string;
  external?: boolean;
  danger?: boolean;
};

/** Per-row "…" menu. Falsy entries are skipped; danger actions sit after a separator. */
export function RowMenu({
  label,
  actions,
  large = false,
}: {
  label: string;
  actions: (RowAction | false | null | undefined)[];
  /** Finger-sized button (phone cards). */
  large?: boolean;
}) {
  const items = actions.filter((action): action is RowAction => Boolean(action));
  const firstDanger = items.findIndex((item) => item.danger);
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  if (phone)
    return (
      <>
        <IconButton
          label={label}
          icon={MoreHorizontal}
          onPress={() => setOpen(true)}
          {...(large ? { className: "size-10" } : {})}
        />
        <BottomSheet isOpen={open} onOpenChange={setOpen} title={label}>
          <div className="grid gap-0.5">
            {items.map((item, index) => (
              <Fragment key={item.id}>
                {index === firstDanger && index > 0 && <Separator className="my-1.5" />}
                <SheetOption
                  icon={item.icon}
                  danger={item.danger ?? false}
                  {...(item.href ? { href: item.href, external: item.external ?? false } : {})}
                  onPress={() => {
                    setOpen(false);
                    // Let the sheet close before a dialog the action may open.
                    if (item.onAction) window.setTimeout(item.onAction, 180);
                  }}
                >
                  {item.label}
                </SheetOption>
              </Fragment>
            ))}
          </div>
        </BottomSheet>
      </>
    );
  return (
    <Dropdown>
      <IconButton
        label={label}
        icon={MoreHorizontal}
        {...(large ? { className: "size-10" } : {})}
      />
      <Dropdown.Popover placement="bottom end" className="min-w-56">
        <Dropdown.Menu
          aria-label={label}
          onAction={(key) => items.find((item) => item.id === key)?.onAction?.()}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.id}>
                {index === firstDanger && index > 0 && <Separator />}
                <Dropdown.Item
                  id={item.id}
                  textValue={item.label}
                  {...(item.danger ? { variant: "danger" as const } : {})}
                  {...(item.href
                    ? {
                        href: item.href,
                        ...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
                      }
                    : {})}
                >
                  <Icon
                    className={`size-4 shrink-0 ${item.danger ? "text-danger" : "text-muted"}`}
                    aria-hidden
                  />
                  <Label>{item.label}</Label>
                </Dropdown.Item>
              </Fragment>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/** A HeroUI button that opens the file picker. */
export function FilePickButton({
  onSelect,
  accept = IMAGE_TYPES,
  multiple = false,
  children,
  variant = "secondary",
  size,
  isDisabled,
  fullWidth,
}: {
  onSelect: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  isDisabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <FileTrigger
      acceptedFileTypes={accept}
      allowsMultiple={multiple}
      onSelect={(files) => {
        if (files?.length) onSelect(Array.from(files));
      }}
    >
      <Button
        variant={variant}
        isDisabled={isDisabled ?? false}
        fullWidth={fullWidth ?? false}
        {...(size ? { size } : {})}
      >
        {children}
      </Button>
    </FileTrigger>
  );
}

/**
 * Confirmation for destructive or important actions. `onConfirm` may be async:
 * the dialog shows a pending state, closes on success and stays open on failure
 * (the caller reports the error).
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = "Annuler",
  onConfirm,
  tone = "danger",
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => unknown;
  tone?: "danger" | "warning" | "accent";
}) {
  const [pending, setPending] = useState(false);
  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Reported by the caller (toast); keep the dialog open to retry.
    } finally {
      setPending(false);
    }
  }
  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open);
      }}
      isKeyboardDismissDisabled={pending}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[440px]">
          <AlertDialog.Header>
            <AlertDialog.Icon status={tone} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="text-sm">{children}</AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="tertiary"
              className="w-full sm:w-auto"
              isDisabled={pending}
              onPress={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              className="w-full sm:w-auto"
              isPending={pending}
              onPress={confirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

/** "Leave without saving?" — used by forms and by router blockers. */
export function UnsavedChangesDialog({
  isOpen,
  onStay,
  onLeave,
  children,
}: {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onStay();
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[440px]">
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>Quitter sans enregistrer ?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="text-sm">{children}</AlertDialog.Body>
          {/* Phones: stacked full-width buttons, main action on top. */}
          <AlertDialog.Footer className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="tertiary" className="w-full sm:w-auto" onPress={onStay}>
              Continuer l’édition
            </Button>
            <Button variant="danger" className="w-full sm:w-auto" onPress={onLeave}>
              Abandonner les modifications
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

/* ───────── Pagination ───────── */

/** Page numbers to show, with null for an ellipsis: 1 … 4 5 6 … 12. */
function pageWindow(current: number, count: number): (number | null)[] {
  const pages = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((p) => p >= 1 && p <= count)
    .sort((x, y) => x - y);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev > 1) out.push(p - prev === 2 ? p - 1 : null);
    out.push(p);
  });
  return out;
}

export function ListPagination({
  page,
  pageCount,
  onChange,
  summary,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  summary: ReactNode;
}) {
  return (
    <Pagination className="flex-wrap justify-between gap-4" aria-label="Pagination">
      <Pagination.Summary className="text-sm text-muted">{summary}</Pagination.Summary>
      {pageCount > 1 && (
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous
              isDisabled={page === 1}
              onPress={() => onChange(page - 1)}
              aria-label="Page précédente"
            >
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>
          {pageWindow(page, pageCount).map((p, i) =>
            p === null ? (
              <Pagination.Item key={`gap-${i}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={p}>
                <Pagination.Link
                  isActive={p === page}
                  onPress={() => onChange(p)}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}
          <Pagination.Item>
            <Pagination.Next
              isDisabled={page === pageCount}
              onPress={() => onChange(page + 1)}
              aria-label="Page suivante"
            >
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      )}
    </Pagination>
  );
}

/* ───────── Form fields ───────── */

export function SelectField({
  label,
  value,
  options,
  onChange,
  className,
  isDisabled,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  isDisabled?: boolean;
}) {
  // Stored values outside the list (legacy data) stay selectable instead of vanishing.
  const all = options.some((o) => o.id === value)
    ? options
    : [...options, { id: value, label: value }];
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const labelId = useId();
  if (phone)
    return (
      <div className={`grid min-w-0 gap-1 ${className ?? ""}`}>
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <button
          type="button"
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          disabled={isDisabled ?? false}
          onClick={() => setOpen(true)}
          className={`${sheetFieldClass} disabled:opacity-50`}
        >
          <span className="min-w-0 flex-1 truncate">
            {all.find((o) => o.id === value)?.label ?? "Choisir"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
        <BottomSheet isOpen={open} onOpenChange={setOpen} title={label}>
          <div role="listbox" aria-label={label} className="grid gap-0.5">
            {all.map((option) => (
              <SheetOption
                key={option.id}
                selected={option.id === value}
                onPress={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                {option.label}
              </SheetOption>
            ))}
          </div>
        </BottomSheet>
      </div>
    );
  return (
    <Select
      value={value}
      onChange={(key) => {
        if (typeof key === "string" || typeof key === "number") onChange(String(key));
      }}
      className={className ?? ""}
      isDisabled={isDisabled ?? false}
      fullWidth
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {all.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

/**
 * Integer field. `optional` fields map an empty input to null; required ones to
 * `fallback` (the field commits on blur, so clearing it simply restores a value).
 */
export function IntegerField({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  isDisabled,
  isRequired,
  grouping = true,
  description,
  wheel,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  minValue?: number;
  maxValue?: number;
  isDisabled?: boolean;
  isRequired?: boolean;
  grouping?: boolean;
  description?: ReactNode;
  /** Phones: pick from the native wheel (e.g. years) instead of typing. */
  wheel?: { from: number; to: number };
}) {
  const phone = useIsPhone();
  if (phone)
    return (
      <PhoneNumberField
        label={label}
        value={value}
        onChange={onChange}
        {...(minValue === undefined ? {} : { minValue })}
        {...(maxValue === undefined ? {} : { maxValue })}
        isDisabled={isDisabled ?? false}
        isRequired={isRequired ?? false}
        description={description}
        wheel={wheel}
        grouping={grouping}
      />
    );

  return (
    <NumberField
      value={value ?? Number.NaN}
      onChange={(next) => onChange(next === undefined || Number.isNaN(next) ? null : next)}
      {...(minValue === undefined ? {} : { minValue })}
      {...(maxValue === undefined ? {} : { maxValue })}
      isDisabled={isDisabled ?? false}
      isRequired={isRequired ?? false}
      formatOptions={{ maximumFractionDigits: 0, useGrouping: grouping }}
      fullWidth
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
      {description && <Description>{description}</Description>}
    </NumberField>
  );
}

export function SwitchField({
  isSelected,
  onChange,
  children,
  isDisabled,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  isDisabled?: boolean;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} isDisabled={isDisabled ?? false}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <span className="text-sm">{children}</span>
      </Switch.Content>
    </Switch>
  );
}

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

/** Where the page sits in the admin; earlier steps are links back. */
export function AdminBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.to && !last ? (
                <Link
                  to={item.to}
                  {...(item.params ? { params: item.params } : {})}
                  className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? "truncate font-medium text-foreground" : ""}
                  {...(last ? { "aria-current": "page" as const } : {})}
                >
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ───────── Account ───────── */

/** Administrator's photo in a circle, or the first letter of their e-mail. */
export function AdminAvatar({
  email,
  url,
  className = "size-6 text-xs",
}: {
  email: string;
  url: string | null | undefined;
  className?: string;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className={`shrink-0 rounded-full bg-surface-secondary object-cover ${className}`}
    />
  ) : (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold uppercase text-accent ${className}`}
    >
      {email.charAt(0) || "A"}
    </span>
  );
}

const grouped = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Phone number input: the native numeric keypad (or the native wheel for a range
 * such as years). Out-of-range values are brought back within limits on leaving.
 */
function PhoneNumberField({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  isDisabled,
  isRequired,
  description,
  wheel,
  grouping,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  minValue?: number;
  maxValue?: number;
  grouping: boolean;
  isDisabled: boolean;
  isRequired: boolean;
  description?: ReactNode;
  wheel?: { from: number; to: number } | undefined;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value == null || Number.isNaN(value) ? "" : String(value));
  // Follow changes made elsewhere (e.g. price cleared by "Masquer le prix").
  useEffect(() => {
    setText((current) =>
      Number(current) === value
        ? current
        : value == null || Number.isNaN(value)
          ? ""
          : String(value),
    );
  }, [value]);
  const clamp = (n: number) =>
    Math.min(maxValue ?? Number.MAX_SAFE_INTEGER, Math.max(minValue ?? 0, n));
  const field =
    "h-11 w-full rounded-[var(--field-radius)] border border-[var(--field-border)] bg-[var(--field-background,var(--surface))] px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50";
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {isRequired && <span className="text-danger"> *</span>}
      </label>
      {wheel ? (
        <span className="relative block">
          <select
            id={id}
            value={value ?? ""}
            disabled={isDisabled}
            required={isRequired}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
            className={`${field} appearance-none pe-9`}
          >
            {!isRequired && <option value="">—</option>}
            {Array.from({ length: wheel.to - wheel.from + 1 }, (_, i) => wheel.to - i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </span>
      ) : (
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          // Spaces between thousands while not typing (152 000), digits only while typing.
          value={focused || !grouping ? text : text && grouped.format(Number(text))}
          onFocus={() => setFocused(true)}
          disabled={isDisabled}
          required={isRequired}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            setText(digits);
            onChange(digits ? Number(digits) : null);
          }}
          onBlur={() => {
            setFocused(false);
            if (!text) return;
            const n = clamp(Number(text));
            setText(String(n));
            onChange(n);
          }}
          className={`${field} tabular-nums`}
        />
      )}
      {description && <span className="text-xs text-muted">{description}</span>}
    </div>
  );
}
