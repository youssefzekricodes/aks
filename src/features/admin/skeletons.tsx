import { Skeleton } from "@heroui/react";
import { t } from "./i18n";

/*
 * Loading placeholders of the admin, one per kind of content. Each copies the
 * layout, sizes and spacing of the real card it stands for, so nothing moves when
 * the data arrives (the content then fades in, see `fadeIn`).
 */

/** Class for content that replaces a skeleton: a short fade, no jump. */
export const fadeIn = "animate-in fade-in-0 duration-300";

const card = "rounded-2xl border border-separator bg-surface";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Busy({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={t(label)} aria-busy className={className}>
      {children}
    </div>
  );
}

/** Véhicules (phone): photo, brand line, name, price, status chips, "…". */
export function CarCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Busy label="Chargement des véhicules" className="grid gap-3 md:hidden">
      {range(count).map((i) => (
        <div key={i} className={`${card} flex gap-3 p-3`}>
          <Skeleton className="aspect-[4/3] w-24 shrink-0 self-start rounded-xl" />
          <div className="grid min-w-0 flex-1 content-start gap-2">
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-3.5 w-1/3 rounded" />
            <div className="mt-1 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>
      ))}
    </Busy>
  );
}

/** Marques (phone): logo box, name and figures, edit button; visibility and favourite row. */
export function BrandCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Busy label="Chargement des marques" className="grid gap-3 md:hidden">
      {range(count).map((i) => (
        <div key={i} className={`${card} grid gap-3 p-3`}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-16 shrink-0 rounded-xl" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-full" />
          </div>
          <div className="flex items-center justify-between border-t border-separator pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-11 rounded-full" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <Skeleton className="size-10 rounded-full" />
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** Administrateurs (phone): initial, e-mail, role and 2FA chips, last sign-in. */
export function AdminCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Busy label="Chargement des comptes" className="grid gap-3 md:hidden">
      {range(count).map((i) => (
        <div key={i} className={`${card} flex items-start gap-3 p-3`}>
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>
      ))}
    </Busy>
  );
}

/** Demandes (phone): day title, then initials, name and time, car, message, actions. */
export function LeadCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Busy label="Chargement des demandes" className="grid gap-3">
      <Skeleton className="ms-1 mt-1 h-3 w-24 rounded" />
      {range(count).map((i) => (
        <div key={i} className="admin-card grid gap-3 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-44 rounded" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
          {i % 2 === 0 && <Skeleton className="h-[3.75rem] w-full rounded-2xl" />}
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="flex gap-2">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <Skeleton className="h-11 flex-1 rounded-full" />
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** Vitrine / brand order: phone rows (position, photo, name, buttons), computer site cards. */
export function SortableCarsSkeleton({
  count = 6,
  intro = false,
}: {
  count?: number;
  /** The explanation paragraph above the list (Vitrine). */
  intro?: boolean;
}) {
  return (
    <Busy label="Chargement des véhicules" className="grid gap-4">
      {intro && (
        <div className="grid gap-2 py-0.5">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-11/12 rounded" />
          <Skeleton className="h-3.5 w-1/2 rounded" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {range(count).map((i) => (
          <div key={i}>
            <div className={`${card} flex items-center gap-3 p-2.5 md:hidden`}>
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="aspect-[4/3] w-20 shrink-0 rounded-lg" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <Skeleton className="size-10 shrink-0 rounded-xl" />
            </div>
            <div className={`${card} hidden overflow-hidden md:block`}>
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="grid gap-2 p-4">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-2/3 rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="mt-2 h-4 w-1/3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** "Les plus consultés": rank, photo, name and views, bar. */
export function MostViewedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Busy label="Chargement des statistiques" className="grid gap-3">
      {range(rows).map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-5 shrink-0 rounded" />
          <Skeleton className="aspect-[4/3] w-14 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-2">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-2/5 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
            <Skeleton className="h-2 rounded-full" style={{ width: `${90 - i * 12}%` }} />
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** "Stock par carrosserie": icon, label, bar, count. */
export function BodyBreakdownSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Busy label="Chargement du stock" className="grid gap-2.5">
      {range(rows).map((i) => (
        <div
          key={i}
          className="grid grid-cols-[2.5rem_7rem_minmax(0,1fr)_2.5rem] items-center gap-3"
        >
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-2.5 rounded-full" style={{ width: `${100 - i * 15}%` }} />
          <Skeleton className="ms-auto h-3 w-5 rounded" />
        </div>
      ))}
    </Busy>
  );
}

/** "Répartition du stock": stacked bar and its three-line legend. */
export function StockSplitSkeleton() {
  return (
    <Busy label="Chargement du stock" className="grid gap-4">
      <div className="mx-auto grid size-[188px] place-items-center rounded-full border-[28px] border-surface-secondary">
        <Skeleton className="h-7 w-10 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-secondary p-3">
        {range(3).map((i) => (
          <div key={i} className="grid justify-items-center gap-1.5">
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="h-5 w-10 rounded" />
            <Skeleton className="h-2.5 w-5 rounded" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Import Facebook: date line, photo strip, text, then the form and its buttons. */
export function FacebookPostsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Busy label="Chargement des publications" className="grid gap-4">
      {range(count).map((i) => (
        <div
          key={i}
          className="grid gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        >
          <div className="grid content-start gap-3">
            <Skeleton className="h-4 w-40 rounded" />
            <div className="grid grid-cols-4 gap-1.5">
              {range(4).map((j) => (
                <Skeleton key={j} className="aspect-square rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="grid content-start gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {range(4).map((j) => (
                <div key={j} className="grid gap-1.5">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** Vehicle editor: breadcrumbs, title, then the form sections (labels and fields). */
export function CarFormSkeleton() {
  const section = (fields: number) => (
    <div className={`${card} grid gap-5 p-4 sm:p-6`}>
      <Skeleton className="h-5 w-32 rounded" />
      <div className="grid gap-4 sm:grid-cols-2">
        {range(fields).map((j) => (
          <div key={j} className="grid gap-1.5">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Busy label="Chargement du véhicule" className="grid gap-6">
      <Skeleton className="h-4 w-44 rounded" />
      <div className="grid gap-2">
        <Skeleton className="h-7 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>
      {section(4)}
      {section(2)}
      {section(6)}
      <div className={`${card} grid gap-3 p-4 sm:p-6`}>
        <Skeleton className="h-5 w-24 rounded" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {range(5).map((j) => (
            <Skeleton key={j} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>
    </Busy>
  );
}
