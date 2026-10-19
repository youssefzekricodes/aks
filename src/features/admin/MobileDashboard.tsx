import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import { Banknote, Car, ClipboardList, Eye, Inbox, Tag, type LucideIcon } from "@/components/icons";
import { salePrice } from "@/lib/cars";
import { BodyBreakdown, ListSkeleton, MostViewed } from "./DashboardTab";
import {
  SECTION_PATHS,
  adminCarsQuery,
  dashboardStatsQuery,
  fieldsToFill,
  leadsQueryOptions,
  plural,
} from "./model";
import { LoadError } from "./ui";

const number = new Intl.NumberFormat("fr-FR");
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Stock status colours (validated for colour-blind readers; each also has a label). */
const STATUS = [
  { key: "sale", label: "En vente", color: "#c8102e" },
  { key: "draft", label: "Brouillons", color: "#d97706" },
  { key: "sold", label: "Vendus", color: "#2563eb" },
] as const;

/** Phone statistics page (/admin/tableau-de-bord): key figures, then the details. */
export function MobileDashboard() {
  const cars = useQuery(adminCarsQuery);
  const stats = useQuery(dashboardStatsQuery);
  const leads = useQuery(leadsQueryOptions);

  if (cars.isError)
    return (
      <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
    );

  const all = cars.data ?? [];
  const forSale = all.filter((car) => car.published && !car.sold);
  const drafts = all.filter((car) => !car.published && !car.sold);
  const sold = all.filter((car) => car.sold);
  const priced = forSale.filter((car) => !car.price_on_request && car.price > 0);
  const stockValue = priced.reduce((sum, car) => sum + salePrice(car), 0);
  const average = priced.length ? stockValue / priced.length : 0;
  const toFill = all.filter((car) => fieldsToFill(car).length > 0).length;
  const openLeads = (leads.data ?? []).filter((lead) => !lead.handled).length;
  const views30 = (stats.data?.views ?? []).reduce((sum, v) => sum + v.last30, 0);
  const ready = Boolean(cars.data);
  const counts = { sale: forSale.length, draft: drafts.length, sold: sold.length };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="mt-0.5 text-sm text-muted">
          Stock, demandes et visites · mis à jour à{" "}
          {time.format(cars.dataUpdatedAt ? new Date(cars.dataUpdatedAt) : new Date())}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <Kpi
          icon={Car}
          tint="bg-red-50 text-red-600"
          label="En vente"
          value={ready ? number.format(forSale.length) : undefined}
          hint={ready ? `sur ${plural(all.length, "véhicule", "véhicules")}` : undefined}
          to={SECTION_PATHS.cars}
        />
        <Kpi
          icon={Inbox}
          tint="bg-emerald-50 text-emerald-600"
          label="Demandes"
          value={leads.data ? number.format(openLeads) : undefined}
          hint={leads.data ? `à traiter · ${number.format(leads.data.length)} au total` : undefined}
          to={SECTION_PATHS.leads}
        />
        <Kpi
          icon={Eye}
          tint="bg-sky-50 text-sky-600"
          label="Vues (30 jours)"
          value={stats.data ? number.format(views30) : stats.isError ? "—" : undefined}
          hint="Fiches véhicules"
        />
        <Kpi
          icon={Banknote}
          tint="bg-indigo-50 text-indigo-600"
          label="Valeur du stock"
          value={ready ? `${compact.format(stockValue)} DT` : undefined}
          hint={ready ? `${plural(priced.length, "prix affiché", "prix affichés")}` : undefined}
        />
        <Kpi
          icon={Tag}
          tint="bg-violet-50 text-violet-600"
          label="Prix moyen"
          value={ready ? (average ? `${compact.format(average)} DT` : "—") : undefined}
          hint="Véhicules en vente"
        />
        <Kpi
          icon={ClipboardList}
          tint="bg-amber-50 text-amber-600"
          label="À compléter"
          value={ready ? number.format(toFill) : undefined}
          hint="Infos manquantes"
          to={SECTION_PATHS.cars}
        />
      </dl>

      <Panel
        title="Répartition du stock"
        hint={ready ? plural(all.length, "véhicule", "véhicules") : ""}
      >
        {ready ? <StockSplit counts={counts} total={all.length} /> : <ListSkeleton rows={3} />}
      </Panel>

      <Panel title="Les plus consultés" hint="Vues des 30 derniers jours">
        {stats.isError ? (
          <LoadError message="Statistiques indisponibles." onRetry={() => stats.refetch()} />
        ) : cars.isPending || stats.isPending ? (
          <ListSkeleton rows={5} />
        ) : (
          <MostViewed cars={all} views={stats.data?.views ?? []} />
        )}
      </Panel>

      <Panel title="Stock par carrosserie" hint="Véhicules en vente sur le site">
        {cars.isPending ? <ListSkeleton rows={6} /> : <BodyBreakdown cars={forSale} />}
      </Panel>
    </div>
  );
}

function Kpi({
  icon: Icon,
  tint,
  label,
  value,
  hint,
  to,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string | undefined;
  hint?: string | undefined;
  to?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tint}`}>
          <Icon className="size-4" aria-hidden />
        </span>
      </span>
      <dd className="mt-2">
        {value === undefined ? (
          <Skeleton className="h-7 w-16 rounded-md" />
        ) : (
          <span
            className={`block truncate text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums ${tint.split(" ").find((c) => c.startsWith("text-")) ?? "text-foreground"}`}
          >
            {value}
          </span>
        )}
        {hint && <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>}
      </dd>
    </>
  );
  const className =
    "block rounded-2xl border border-separator bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]";
  return to ? (
    <Link
      to={to}
      className={`${className} outline-none transition-colors active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Stacked bar (2px gaps) and a labelled legend: identity never relies on colour alone. */
function StockSplit({
  counts,
  total,
}: {
  counts: Record<(typeof STATUS)[number]["key"], number>;
  total: number;
}) {
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <div className="grid gap-4">
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-secondary"
        role="img"
        aria-label={STATUS.map((s) => `${s.label} : ${counts[s.key]}`).join(", ")}
      >
        {STATUS.filter((s) => counts[s.key] > 0).map((s) => (
          <span
            key={s.key}
            className="h-full first:rounded-s-full last:rounded-e-full"
            style={{ width: `${(counts[s.key] / Math.max(total, 1)) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <ul className="grid gap-2.5">
        {STATUS.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="flex-1 text-foreground">{s.label}</span>
            <span className="font-semibold text-foreground tabular-nums">{counts[s.key]}</span>
            <span className="w-10 text-end text-xs text-muted tabular-nums">
              {share(counts[s.key])} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
