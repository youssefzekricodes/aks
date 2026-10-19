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
import { EmptyState, LoadError, PageHeader, SectionCard } from "./ui";

const number = new Intl.NumberFormat("fr-FR");
const TOP_VIEWED = 8;

/**
 * Overview: stock totals, stock by body type and the most viewed vehicles
 * (page views of the last 30 days, counted once per visitor session).
 */
export function DashboardTab() {
  const cars = useQuery(adminCarsQuery);
  const stats = useQuery(dashboardStatsQuery);
  const leads = useQuery(leadsQueryOptions);

  if (cars.isError)
    return (
      <div className="grid gap-6">
        <PageHeader title="Tableau de bord" />
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      </div>
    );

  const all = cars.data ?? [];
  const onSale = all.filter((car) => car.published && !car.sold);
  const sold = all.filter((car) => car.sold);
  const drafts = all.filter((car) => !car.published && !car.sold);
  const openLeads = (leads.data ?? []).filter((lead) => !lead.handled).length;
  const views = stats.data?.views ?? [];
  const views30 = views.reduce((sum, v) => sum + v.last30, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble du stock et de l’intérêt des visiteurs."
      />

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          icon={CarIcon}
          label="Véhicules au total"
          value={cars.data && all.length}
          hint={cars.data && `${plural(onSale.length, "en vente", "en vente")}`}
          to="cars"
        />
        <StatTile
          icon={BadgeCheck}
          label="Vendus"
          value={cars.data && sold.length}
          hint="Masqués du site"
          to="cars"
        />
        <StatTile
          icon={FileClock}
          label="Brouillons"
          value={cars.data && drafts.length}
          hint="Non publiés"
          to="cars"
        />
        <StatTile
          icon={Eye}
          label="Vues (30 jours)"
          value={stats.data && views30}
          hint="Fiches véhicules consultées"
        />
        <StatTile
          icon={Inbox}
          label="Demandes à traiter"
          value={leads.data && openLeads}
          hint={leads.data && `${plural(leads.data.length, "demande", "demandes")} au total`}
          to="leads"
          highlight={openLeads > 0}
        />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <SectionCard
          title="Stock par carrosserie"
          description="Véhicules actuellement en vente sur le site."
        >
          {cars.isPending ? <ListSkeleton rows={6} /> : <BodyBreakdown cars={onSale} />}
        </SectionCard>

        <SectionCard
          title="Véhicules les plus consultés"
          description="Vues de la fiche sur les 30 derniers jours (une par visiteur et par session)."
        >
          {stats.isError ? (
            <LoadError
              message="Statistiques indisponibles. La migration « sales_views » a-t-elle été exécutée ?"
              onRetry={() => stats.refetch()}
            />
          ) : cars.isPending || stats.isPending ? (
            <ListSkeleton rows={5} />
          ) : (
            <MostViewed cars={all} views={views} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined | false;
  hint?: ReactNode;
  to?: "cars" | "leads";
  highlight?: boolean;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-2 text-sm text-muted">
        <Icon className={`size-4 ${highlight ? "text-accent" : ""}`} aria-hidden />
        {label}
      </dt>
      <dd className="mt-2">
        {value === undefined || value === false ? (
          <Skeleton className="h-8 w-16 rounded-md" />
        ) : (
          <span className="tabular-nums text-3xl font-semibold text-foreground">
            {number.format(value)}
          </span>
        )}
        {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      </dd>
    </>
  );
  const tile = `block h-full rounded-2xl border bg-surface p-4 ${highlight ? "border-accent" : "border-separator"}`;
  return to ? (
    <Link
      to={SECTION_PATHS[to]}
      preload="intent"
      className={`${tile} outline-none transition-colors hover:border-[color-mix(in_oklab,var(--border)_50%,var(--foreground)_30%)] focus-visible:ring-2 focus-visible:ring-focus`}
    >
      <div>{body}</div>
    </Link>
  ) : (
    <div className={tile}>{body}</div>
  );
}

/** One row per body type (all of them, zero included), bar length = share of the largest. */
/** `bar`: colour of the bars (the phone home screen uses gradients). */
export function BodyBreakdown({ cars, bar = "bg-accent" }: { cars: AdminCar[]; bar?: string }) {
  const counts = new Map<string, number>(CAR_BODIES.map((body) => [body, 0]));
  // Only real body types: "À préciser" (imported, not filled in yet) is left out.
  for (const car of cars) if (counts.has(car.body)) counts.set(car.body, counts.get(car.body)! + 1);
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const max = Math.max(1, ...rows.map(([, count]) => count));
  if (!cars.length)
    return (
      <EmptyState
        icon={CarIcon}
        title="Aucun véhicule en vente."
        description="Publiez un véhicule pour voir la répartition."
      />
    );
  return (
    <ul className="grid gap-2.5">
      {rows.map(([body, count]) => (
        <li
          key={body}
          className="grid grid-cols-[2.5rem_7rem_minmax(0,1fr)_2.5rem] items-center gap-3"
        >
          <BodyIcon body={body} active={count > 0} className="h-auto w-10" />
          <span className="truncate text-sm text-foreground">{body}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-secondary" aria-hidden>
            <span
              className={`block h-full rounded-full ${bar}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </span>
          <span className="tabular-nums text-end text-sm font-medium text-foreground">
            {count}
            <span className="sr-only"> {count > 1 ? "véhicules" : "véhicule"}</span>
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
        title="Pas encore de vues."
        description="Les consultations des fiches véhicules apparaîtront ici."
      />
    );
  const max = rows[0]!.last30;
  return (
    <ol className="grid gap-3">
      {rows.map((row, index) => {
        const car = byId.get(row.carId)!;
        return (
          <li key={row.carId} className="flex items-center gap-3">
            <span className="tabular-nums w-5 shrink-0 text-end text-sm text-muted">
              {index + 1}
            </span>
            <img
              src={carImage(car)}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-14 shrink-0 rounded-lg border border-separator bg-surface-secondary object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-foreground">
                  {car.brand} {car.name}
                  {car.sold && <span className="ms-2 text-xs font-normal text-muted">Vendu</span>}
                </p>
                <p className="tabular-nums shrink-0 text-sm font-semibold text-foreground">
                  {number.format(row.last30)}
                  <span className="font-normal text-muted"> vues</span>
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
                  {number.format(row.total)} au total
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full rounded-md" />
      ))}
    </div>
  );
}
