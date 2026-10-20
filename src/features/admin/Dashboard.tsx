import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import {
  Banknote,
  Car,
  ChevronRight,
  Eye,
  Inbox,
  RefreshCw,
  type LucideIcon,
} from "@/components/icons";
import { carImage, salePrice } from "@/lib/cars";
import { BodyBreakdown, MostViewed } from "./DashboardTab";
import { formatDate, formatNumber, t } from "./i18n";
import {
  SECTION_PATHS,
  STOCK_STATUS,
  adminCarsQuery,
  dashboardStatsQuery,
  leadsQueryOptions,
  plural,
  type StockStatus,
} from "./model";
import { TodoList } from "./TodoList";
import { BodyBreakdownSkeleton, MostViewedSkeleton, StockSplitSkeleton, fadeIn } from "./skeletons";
import { LoadError } from "./ui";

/*
 * Admin dashboard (computer at /admin, phone at /admin/tableau-de-bord): key
 * figures, what needs doing, stock split, prices, most viewed vehicles, latest
 * requests and stock by body type. Neutral figures, colour only for meaning
 * (icons, status, chart), every block in the same card style.
 */

const STATUS = STOCK_STATUS;
type StatusKey = StockStatus;

/** Amounts written in full ("967 500 DT"): easier to read than "967,5 k". */
const money = (value: number) => `${formatNumber(Math.round(value))} ${t("DT")}`;

export function Dashboard() {
  const queryClient = useQueryClient();
  const cars = useQuery(adminCarsQuery);
  const stats = useQuery(dashboardStatsQuery);
  const leads = useQuery(leadsQueryOptions);

  if (cars.isError)
    return (
      <LoadError
        message={t("Impossible de charger les véhicules.")}
        onRetry={() => cars.refetch()}
      />
    );

  const ready = Boolean(cars.data);
  const all = cars.data ?? [];
  const forSale = all.filter((car) => car.published && !car.sold);
  const drafts = all.filter((car) => !car.published && !car.sold);
  const sold = all.filter((car) => car.sold);
  const priced = forSale.filter((car) => !car.price_on_request && car.price > 0);
  const prices = priced.map((car) => salePrice(car));
  const stockValue = prices.reduce((sum, p) => sum + p, 0);
  const allLeads = leads.data ?? [];
  const openLeads = allLeads.filter((lead) => !lead.handled).length;
  const views = stats.data?.views ?? [];
  const views30 = views.reduce((sum, v) => sum + v.last30, 0);
  const counts: Record<StatusKey, number> = {
    sale: forSale.length,
    draft: drafts.length,
    sold: sold.length,
  };
  const updated = cars.dataUpdatedAt ? new Date(cars.dataUpdatedAt) : new Date();
  const refreshing = cars.isFetching || stats.isFetching || leads.isFetching;

  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("Tableau de bord")}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {t("Mis à jour à {time}", { time: formatDate(updated, { timeStyle: "short" }) })}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            void Promise.all([
              queryClient.refetchQueries({ queryKey: adminCarsQuery.queryKey }),
              queryClient.refetchQueries({ queryKey: dashboardStatsQuery.queryKey }),
              queryClient.refetchQueries({ queryKey: leadsQueryOptions.queryKey }),
            ])
          }
          className="inline-flex h-10 items-center gap-2 rounded-full border border-separator bg-surface px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          {t("Actualiser")}
        </button>
      </header>

      {/* Key figures. */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Metric
          icon={Car}
          tint="bg-red-50 text-red-600"
          labelColor="text-red-700"
          label={t("En vente")}
          value={ready ? formatNumber(forSale.length) : undefined}
          detail={
            ready
              ? t("sur {total} au total", { total: plural(all.length, "véhicule", "véhicules") })
              : undefined
          }
          progress={ready && all.length ? forSale.length / all.length : undefined}
          to={SECTION_PATHS.cars}
        />
        <Metric
          icon={Inbox}
          tint="bg-emerald-50 text-emerald-600"
          labelColor="text-emerald-700"
          label={t("Demandes")}
          value={leads.data ? formatNumber(openLeads) : undefined}
          detail={
            leads.data
              ? t("à traiter, sur {count} reçues", { count: formatNumber(allLeads.length) })
              : undefined
          }
          to={SECTION_PATHS.leads}
        />
        <Metric
          icon={Eye}
          tint="bg-sky-50 text-sky-600"
          labelColor="text-sky-700"
          label={t("Visites")}
          value={stats.data ? formatNumber(views30) : stats.isError ? "—" : undefined}
          detail={t("vues ces 30 derniers jours")}
        />
        <Metric
          icon={Banknote}
          tint="bg-indigo-50 text-indigo-600"
          labelColor="text-indigo-700"
          label={t("Valeur du stock")}
          value={ready ? money(stockValue) : undefined}
          detail={
            ready
              ? t("pour {count}", { count: plural(priced.length, "prix affiché", "prix affichés") })
              : undefined
          }
        />
      </dl>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {/* What needs doing. */}
        <Panel title={t("À faire")} hint={t("Touchez une ligne pour vous en occuper")}>
          <TodoList cars={cars.data} leads={leads.data} />
        </Panel>

        {/* Stock split. */}
        <Panel
          title={t("Répartition du stock")}
          hint={ready ? plural(all.length, "véhicule", "véhicules") : " "}
        >
          {ready ? (
            <div className={fadeIn}>
              <StockDonut counts={counts} total={all.length} />
            </div>
          ) : (
            <StockSplitSkeleton />
          )}
        </Panel>

        {/* Prices of the vehicles for sale. */}
        <Panel title={t("Prix")} hint={t("Des véhicules en vente, prix affichés uniquement")}>
          {ready ? (
            <dl className={`grid grid-cols-2 gap-3 ${fadeIn}`}>
              <PriceFact
                label={t("Prix moyen")}
                value={
                  prices.length ? money(Math.round(stockValue / prices.length / 100) * 100) : "—"
                }
              />
              <PriceFact label={t("Valeur totale")} value={money(stockValue)} />
              <PriceFact
                label={t("Moins cher")}
                value={prices.length ? money(Math.min(...prices)) : "—"}
              />
              <PriceFact
                label={t("Plus cher")}
                value={prices.length ? money(Math.max(...prices)) : "—"}
              />
              <p className="col-span-2 text-xs text-muted">
                {t("{count} sur demande (prix masqué)", {
                  count: formatNumber(forSale.length - priced.length),
                })}
              </p>
            </dl>
          ) : (
            <div className="grid grid-cols-2 gap-3" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6">
        <Panel title={t("Les plus consultés")} hint={t("Vues des 30 derniers jours")}>
          {stats.isError ? (
            <LoadError message={t("Statistiques indisponibles.")} onRetry={() => stats.refetch()} />
          ) : cars.isPending || stats.isPending ? (
            <MostViewedSkeleton />
          ) : (
            <div className={fadeIn}>
              <MostViewed cars={all} views={views} />
            </div>
          )}
        </Panel>

        <Panel
          title={t("Dernières demandes")}
          hint={t("Messages reçus depuis le site")}
          action={
            <Link
              to={SECTION_PATHS.leads}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              {t("Tout voir")}
              <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          }
        >
          {leads.data ? (
            <RecentLeads leads={allLeads} cars={all} />
          ) : (
            <div className="grid gap-3" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="grid flex-1 gap-1.5">
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={t("Stock par carrosserie")} hint={t("Véhicules en vente sur le site")}>
        {cars.isPending ? (
          <BodyBreakdownSkeleton />
        ) : (
          <div className={`lg:max-w-2xl ${fadeIn}`}>
            <BodyBreakdown cars={forSale} hideEmpty />
          </div>
        )}
      </Panel>
    </div>
  );
}

function Metric({
  icon: Icon,
  tint,
  label,
  value,
  detail,
  progress,
  to,
  labelColor,
}: {
  icon: LucideIcon;
  tint: string;
  /** Darker shade of the card's colour, written out so Tailwind generates it. */
  labelColor: string;
  label: string;
  value: string | undefined;
  detail?: string | undefined;
  /** 0–1: thin bar under the figure. */
  progress?: number | undefined;
  to?: string;
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        {/* Label in a darker shade of the card's colour. */}
        <dt className={`text-sm font-semibold ${labelColor}`}>{label}</dt>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </span>
      <dd className="mt-3">
        {value === undefined ? (
          <Skeleton className="h-9 w-20 rounded-lg" />
        ) : (
          <span
            // Long values (amounts in words, e.g. "1,2 مليون د.ت") use a smaller size.
            className={`block font-semibold tracking-tight text-foreground tabular-nums ${
              value.length > 8 ? "text-xl leading-9 break-words" : "truncate text-3xl"
            } ${fadeIn}`}
          >
            {value}
          </span>
        )}
        {detail ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted">{detail}</span>
        ) : (
          <Skeleton className="mt-2 h-3 w-24 rounded" />
        )}
        {progress !== undefined && (
          <span
            className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-secondary"
            aria-hidden
          >
            <span
              className="block h-full rounded-full bg-red-500 transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        )}
      </dd>
    </>
  );
  const className =
    "block rounded-2xl border border-separator bg-surface p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] lg:p-5";
  return to ? (
    <Link
      to={to}
      className={`${className} outline-none transition-[background-color,box-shadow] hover:shadow-md active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
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
    <section className="min-w-0 rounded-2xl border border-separator bg-surface p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] lg:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {hint && <p className="min-h-4 text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * Thick ring with rounded ends: each part starts over the end of the previous one,
 * outlined in the card colour so they read as separate pieces. Total in the middle;
 * below, a legend box with one column per status (label and share, count on hover).
 */
function StockDonut({ counts, total }: { counts: Record<StatusKey, number>; total: number }) {
  const size = 188;
  const stroke = 28;
  const r = (size - stroke) / 2 - 4;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const share = (n: number) => (total ? n / total : 0);
  const parts = STATUS.filter((s) => counts[s.key] > 0);
  let start = 0;
  return (
    <div className="grid gap-4">
      <figure className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={STATUS.map(
            (s) => `${t(s.label)} : ${formatNumber(share(counts[s.key]), { style: "percent" })}`,
          ).join(", ")}
        >
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--surface-secondary)"
            strokeWidth={stroke}
          />
          {parts.map((s) => {
            const length = share(counts[s.key]) * circumference;
            const offset = -start;
            start += length;
            // A full ring (one status only) needs no caps.
            const dash =
              parts.length === 1 ? `${circumference} 0` : `${length} ${circumference - length}`;
            return (
              <g key={s.key}>
                {/* Card-coloured outline around the rounded start, over the previous part. */}
                <circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke="var(--surface)"
                  strokeWidth={stroke + 8}
                  strokeLinecap={parts.length === 1 ? "butt" : "round"}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
                <circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeLinecap={parts.length === 1 ? "butt" : "round"}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  className="transition-[stroke-dasharray] duration-700"
                />
              </g>
            );
          })}
        </svg>
        <figcaption className="absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl font-semibold leading-none tabular-nums text-foreground">
            {formatNumber(total)}
          </span>
          <span className="mt-1 text-xs text-muted">{t("véhicules")}</span>
        </figcaption>
      </figure>
      <ul className="grid grid-cols-3 divide-x divide-separator rounded-2xl bg-surface-secondary py-3">
        {STATUS.map((s) => (
          <li key={s.key} className="grid min-w-0 justify-items-center gap-0.5 px-2 text-center">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="truncate">{t(s.label)}</span>
            </span>
            <span className="text-xl font-bold tabular-nums text-foreground">
              {formatNumber(counts[s.key])}
            </span>
            <span className="text-[11px] tabular-nums text-muted">
              {formatNumber(share(counts[s.key]), { style: "percent" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-secondary px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold leading-snug tabular-nums text-foreground sm:text-lg lg:text-[15px] 2xl:text-lg">
        {value}
      </dd>
    </div>
  );
}

function RecentLeads({
  leads,
  cars,
}: {
  leads: {
    id: string;
    name: string;
    car_slug: string | null;
    handled: boolean;
    created_at: string;
    message: string | null;
  }[];
  cars: { slug: string; brand: string; name: string; images: string[] }[];
}) {
  const bySlug = new Map(cars.map((car) => [car.slug, car]));
  const latest = [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);
  if (!latest.length)
    return (
      <p className="py-6 text-center text-sm text-muted">
        {t("Aucune demande reçue pour l’instant.")}
      </p>
    );
  return (
    <ul className={`grid grid-cols-1 gap-1 ${fadeIn}`}>
      {latest.map((lead) => {
        const car = lead.car_slug ? bySlug.get(lead.car_slug) : undefined;
        return (
          <li key={lead.id}>
            <Link
              to={SECTION_PATHS.leads}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
            >
              {car ? (
                <img
                  src={carImage(car as Parameters<typeof carImage>[0])}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid aspect-[4/3] w-12 shrink-0 place-items-center rounded-lg bg-surface-secondary text-muted">
                  <Inbox className="size-4" aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span dir="auto" className="truncate text-sm font-medium text-foreground">
                    {lead.name}
                  </span>
                  {!lead.handled && (
                    <span
                      className="size-2 shrink-0 rounded-full bg-accent"
                      aria-label={t("À traiter")}
                    />
                  )}
                </span>
                <span dir="auto" className="block truncate text-xs text-muted rtl:text-right">
                  {car ? `${car.brand} ${car.name}` : lead.message || t("Demande de contact")}
                </span>
              </span>
              <time dateTime={lead.created_at} className="shrink-0 text-xs text-muted">
                {formatDate(new Date(lead.created_at), { day: "numeric", month: "short" })}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
