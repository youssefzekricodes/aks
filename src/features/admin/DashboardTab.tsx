import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import {
  BadgeCheck,
  Car as CarIcon,
  Eye,
  FileClock,
  Inbox,
  type LucideIcon,
} from "@/components/icons";
import { CAR_BODIES, carImage } from "@/lib/cars";
import { BodyIcon } from "@/components/aks/BodyIcon";
import {
  SECTION_PATHS,
  adminCarsQuery,
  dashboardStatsQuery,
  leadsQueryOptions,
  plural,
  type AdminCar,
} from "./model";
import { EmptyState } from "./ui";
import { Dashboard } from "./Dashboard";
import { formatNumber, t } from "./i18n";
import { BodyBreakdownSkeleton, MostViewedSkeleton } from "./skeletons";

const TOP_VIEWED = 8;

/** Computer dashboard (/admin): the shared dashboard. */
export function DashboardTab() {
  return <Dashboard />;
}

/** One row per body type (all of them, zero included), bar length = share of the largest. */
/** `bar`: colour of the bars (the phone home screen uses gradients). */
export function BodyBreakdown({
  cars,
  bar = "bg-accent",
  hideEmpty = false,
}: {
  cars: AdminCar[];
  bar?: string;
  /** Leave out the body types with no vehicle (shorter list). */
  hideEmpty?: boolean;
}) {
  const counts = new Map<string, number>(CAR_BODIES.map((body) => [body, 0]));
  // Only real body types: "À préciser" (imported, not filled in yet) is left out.
  for (const car of cars) if (counts.has(car.body)) counts.set(car.body, counts.get(car.body)! + 1);
  const rows = [...counts.entries()]
    .filter(([, count]) => !hideEmpty || count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const max = Math.max(1, ...rows.map(([, count]) => count));
  if (!cars.length)
    return (
      <EmptyState
        icon={CarIcon}
        title={t("Aucun véhicule en vente.")}
        description={t("Publiez un véhicule pour voir la répartition.")}
      />
    );
  return (
    <ul className="grid grid-cols-1 gap-2.5">
      {rows.map(([body, count]) => (
        <li
          key={body}
          className="grid grid-cols-[2.5rem_7rem_minmax(0,1fr)_2.5rem] items-center gap-3"
        >
          <BodyIcon body={body} active={count > 0} className="h-auto w-10" />
          <span className="truncate text-sm text-foreground">{t(body)}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-secondary" aria-hidden>
            <span
              className={`block h-full rounded-full ${bar}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </span>
          <span className="tabular-nums text-end text-sm font-medium text-foreground">
            {formatNumber(count)}
            <span className="sr-only"> {t(count > 1 ? "véhicules" : "véhicule")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MostViewed({
  cars,
  views,
  bar = "bg-accent",
}: {
  cars: AdminCar[];
  views: { carId: string; last30: number; total: number }[];
  bar?: string;
}) {
  const byId = new Map(cars.map((car) => [car.id, car]));
  const rows = views
    .filter((v) => v.last30 > 0 && byId.has(v.carId))
    .sort((a, b) => b.last30 - a.last30 || b.total - a.total)
    .slice(0, TOP_VIEWED);
  if (!rows.length)
    return (
      <EmptyState
        icon={Eye}
        title={t("Pas encore de vues.")}
        description={t("Les consultations des fiches véhicules apparaîtront ici.")}
      />
    );
  const max = rows[0]!.last30;
  return (
    <ol className="grid grid-cols-1 gap-3">
      {rows.map((row, index) => {
        const car = byId.get(row.carId)!;
        return (
          <li key={row.carId} className="flex min-w-0 items-center gap-3">
            <span className="tabular-nums w-5 shrink-0 text-end text-sm text-muted">
              {formatNumber(index + 1)}
            </span>
            <img
              src={carImage(car)}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-14 shrink-0 rounded-lg border border-separator bg-surface-secondary object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                {/* Latin names in the Arabic screen keep their start ("Volkswagen Am…"). */}
                <p
                  dir="auto"
                  className="truncate text-sm font-medium text-foreground rtl:text-right"
                >
                  {car.brand} {car.name}
                  {car.sold && (
                    <span className="ms-2 text-xs font-normal text-muted">{t("Vendu")}</span>
                  )}
                </p>
                <p className="tabular-nums shrink-0 text-sm font-semibold text-foreground">
                  {formatNumber(row.last30)}
                  <span className="font-normal text-muted"> {t("vues")}</span>
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary"
                  aria-hidden
                >
                  <span
                    className={`block h-full rounded-full ${bar}`}
                    style={{ width: `${(row.last30 / max) * 100}%` }}
                  />
                </span>
                <span className="tabular-nums shrink-0 text-xs text-muted">
                  {t("{count} au total", { count: row.total })}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
