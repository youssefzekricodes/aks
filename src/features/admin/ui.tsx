import { Fragment, useState, type ReactNode } from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Chip,
  Description,
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
import { ChevronRight, MoreHorizontal, type LucideIcon } from "@/components/icons";
import { Link } from "@tanstack/react-router";

import type { UploadState } from "./hooks";
import { IMAGE_TYPES, type Option } from "./model";

/*
 * Admin design system. Type scale: page title text-xl, section title text-base,
 * body text-sm, meta text-xs. Spacing on the 8px grid (gap-2/4/6/8). Controls use
 * the default HeroUI size, except dense table/tile actions which use size="sm".
 */

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

/** Loading placeholder of a phone card list (shown below `md`, next to a TableSkeleton). */
export function CardListSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <ul aria-label={`${label} : chargement`} aria-busy className="grid gap-3 md:hidden">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-2xl border border-separator bg-surface p-3">
          <Skeleton className="aspect-[4/3] w-24 shrink-0 rounded-xl" />
          <div className="grid flex-1 content-start gap-2">
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
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
          <AlertDialog.Footer>
            <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
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
          <AlertDialog.Footer>
            <Button variant="tertiary" onPress={onStay}>
              Continuer l’édition
            </Button>
            <Button variant="danger" onPress={onLeave}>
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
}) {
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
