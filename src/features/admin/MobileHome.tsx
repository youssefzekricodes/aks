import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import {
  ArrowUpRight,
  Banknote,
  Car,
  Eye,
  FileText,
  Inbox,
  LayoutDashboard,
  Plug,
  Plus,
  RefreshCw,
  Star,
  Store,
  Tags,
  UserCog,
  type LucideIcon,
} from "@/components/icons";
import { carTitle, salePrice } from "@/lib/cars";
import { SITE_FROM_ADMIN } from "@/lib/splash";
import { Notch } from "./Notch";
import { TodoList, todoItems } from "./TodoList";
import { formatNumber, t } from "./i18n";
import { socialStatusQuery } from "./SocialCard";
import {
  SECTION_LABELS,
  SECTION_PATHS,
  adminCarsQuery,
  dashboardStatsQuery,
  leadsQueryOptions,
  plural,
  type AdminSection,
  type StockStatus,
} from "./model";
import { onSale } from "./VitrinePage";

/*
 * Phone / installed-app home screen of the admin, written for people who are not
 * at ease with computers: the stock at a glance with the main action, what is
 * waiting (plain sentences, one tap to the right list), two figures, then every
 * section as a tile saying what it is for. The statistics have their own page
 * (/admin/tableau-de-bord); computers keep the sidebar and the dashboard at /admin.
 */

/** Phone address of the statistics (the computer shows them at /admin). */
export const MOBILE_DASHBOARD_PATH = "/admin/tableau-de-bord";

type Tile = {
  id: AdminSection;
  icon: LucideIcon;
  /** Icon square colour (written out for Tailwind). */
  tint: string;
  short?: string;
};

const GROUPS: { title: string; hint: string; tiles: Tile[] }[] = [
  {
    title: "Catalogue",
    hint: "Vos véhicules et leur présentation",
    tiles: [
      { id: "cars", icon: Car, tint: "bg-red-500" },
      { id: "showcase", icon: Store, tint: "bg-amber-500" },
      { id: "brands", icon: Tags, tint: "bg-violet-500" },
    ],
  },
  {
    title: "Activité",
    hint: "Clients, visites et Facebook",
    tiles: [
      { id: "leads", icon: Inbox, tint: "bg-emerald-500" },
      {
        id: "dashboard",
        icon: LayoutDashboard,
        tint: "bg-indigo-500",
        short: "Statistiques",
      },
      { id: "facebook", icon: RefreshCw, tint: "bg-blue-500", short: "Facebook" },
    ],
  },
  {
    title: "Réglages",
    hint: "Le site, les réseaux et les accès",
    tiles: [
      { id: "content", icon: FileText, tint: "bg-teal-500", short: "Contenu" },
      { id: "connectors", icon: Plug, tint: "bg-sky-500" },
      { id: "admins", icon: UserCog, tint: "bg-slate-500", short: "Comptes" },
    ],
  },
];

export function MobileHome({ sections }: { sections: readonly AdminSection[] }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  // The editor opens instantly from "Ajouter un véhicule": its code and the
  // network status are fetched in the background beforehand.
  useEffect(() => {
    void router
      .preloadRoute({ to: "/admin/vehicules/$carId", params: { carId: "nouveau" } })
      .catch(() => undefined);
    void queryClient.prefetchQuery(socialStatusQuery);
  }, [router, queryClient]);
  const cars = useQuery(adminCarsQuery);
  const leads = useQuery(leadsQueryOptions);
  const stats = useQuery(dashboardStatsQuery);

  const all = cars.data ?? [];
  const forSale = all.filter(onSale);
  const counts: Record<StockStatus, number> = {
    sale: forSale.length,
    draft: all.filter((car) => !car.published && !car.sold).length,
    sold: all.filter((car) => car.sold).length,
  };
  const priced = forSale.filter((car) => !car.price_on_request && car.price > 0);
  const stockValue = priced.reduce((sum, car) => sum + salePrice(car), 0);
  const openLeads = (leads.data ?? []).filter((lead) => !lead.handled).length;
  const showcase = forSale.filter((car) => car.featured_rank != null).length;
  const share = all.length ? Math.round((forSale.length / all.length) * 100) : 0;
  const views = stats.data?.views ?? [];
  const views30 = views.reduce((sum, v) => sum + v.last30, 0);
  const top = [...views].sort((a, b) => b.last30 - a.last30)[0];
  const topCar = top && top.last30 > 0 ? all.find((car) => car.id === top.carId) : undefined;
  const todoCount = cars.data && leads.data ? todoItems(all, leads.data).length : 0;

  // What each tile is for, with a figure when there is one.
  const meta: Partial<Record<AdminSection, string>> = {
    cars: cars.data ? t("{count} au total", { count: formatNumber(all.length) }) : t("Stock"),
    showcase: cars.data
      ? t("{count} sur l’accueil", { count: formatNumber(showcase) })
      : t("Page d’accueil"),
    brands: t("Logos et ordre"),
    dashboard: t("Visites et chiffres"),
    leads: leads.data
      ? openLeads
        ? t("{count} à traiter", { count: formatNumber(openLeads) })
        : t("Aucune en attente")
      : t("Messages clients"),
    facebook: t("Importer des annonces"),
    content: t("Textes du site"),
    connectors: t("Réseaux sociaux"),
    admins: t("Qui peut se connecter"),
  };

  return (
    <div className="grid gap-5">
      {/* Overview, with the main action in the cut-out corner. */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[oklch(0.94_0.03_20)] p-5 pb-[6.75rem]">
        {/* The public site, in the free top corner (opens behind the splash). */}
        <a
          href={SITE_FROM_ADMIN}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute end-4 top-4 inline-flex h-7 items-center gap-1 rounded-full bg-white/70 px-3 text-xs font-semibold text-[oklch(0.4_0.1_25)] outline-none transition-colors active:bg-white focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t("Voir le site")}
          <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
          <span className="sr-only">{t("(nouvel onglet)")}</span>
        </a>
        {cars.data && leads.data ? (
          <p className="animate-in fade-in-0 duration-300 max-w-[62%] text-[15px] font-medium leading-snug text-[oklch(0.3_0.06_20)]">
            {openLeads
              ? t("{cars} en vente et {leads} à traiter.", {
                  cars: plural(forSale.length, "véhicule", "véhicules"),
                  leads: plural(openLeads, "demande", "demandes"),
                })
              : t("{cars} en vente, aucune demande en attente.", {
                  cars: plural(forSale.length, "véhicule", "véhicules"),
                })}
          </p>
        ) : (
          // Two text lines, same height as the sentence.
          <div className="grid max-w-[62%] gap-2 py-0.5">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        )}
        {/* Stock split as small bars (for sale / drafts / sold), under "Voir le site",
            so the add button has the whole bottom row. */}
        <div className="absolute end-5 top-[3.5rem] grid justify-items-end gap-1" aria-hidden>
          <span className="flex items-end gap-1">
            {[counts.sale, counts.draft, counts.sold, all.length].map((value, i) => (
              <span
                key={i}
                className={`w-2.5 rounded-full ${i === 0 ? "bg-accent" : "bg-white/80"}`}
                style={{ height: `${8 + (all.length ? (value / all.length) * 22 : 0)}px` }}
              />
            ))}
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold leading-none text-[oklch(0.45_0.12_25)]">
            {t("{share} en vente", { share: formatNumber(share / 100, { style: "percent" }) })}
          </span>
        </div>
        <Notch corner="bottom-left" radius="1.75rem">
          {/* Raised key: darker right and bottom edges, pressed in on tap. */}
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/admin/vehicules/$carId",
                params: { carId: "nouveau" },
                // Back (arrow, swipe, Annuler, after saving) returns to this home screen.
                search: { from: "accueil" },
              })
            }
            className="flex h-14 items-center gap-2.5 rounded-full border-b-[3px] border-r-[3px] border-[oklch(0.4_0.16_27)] bg-gradient-to-br from-[oklch(0.6_0.21_27)] to-[oklch(0.52_0.21_27)] pe-6 ps-2 text-base font-semibold text-white shadow-[0_8px_18px_-8px_oklch(0.5_0.2_27/0.8)] outline-none transition-[transform,border-width] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:border-b active:border-r focus-visible:ring-4 focus-visible:ring-focus/40"
          >
            <span className="grid size-10 place-items-center rounded-full bg-white/20">
              <Car className="size-[22px]" aria-hidden />
            </span>
            {t("Ajouter un véhicule")}
            <Plus className="size-5" aria-hidden />
          </button>
        </Notch>
      </section>

      {/* What is waiting, in plain sentences. */}
      <section className="admin-card p-3 pt-0">
        <h2 className="flex items-center gap-2 px-2 pb-3 pt-4 text-base font-semibold text-foreground">
          {t("À faire")}
          {todoCount > 0 && (
            <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-bold leading-5 text-accent-foreground tabular-nums">
              {formatNumber(todoCount)}
            </span>
          )}
        </h2>
        <TodoList cars={cars.data} leads={leads.data} />
      </section>

      {/* Two key figures; each opens the statistics. */}
      <div className="grid grid-cols-2 gap-3">
        <FigureCard
          to={MOBILE_DASHBOARD_PATH}
          icon={Eye}
          tint="bg-sky-50 text-sky-600"
          title="Visites"
          subtitle="Ces 30 derniers jours"
          value={stats.data ? formatNumber(views30) : stats.isError ? "—" : undefined}
          unit="vues"
          color="text-sky-600"
          titleColor="text-sky-700"
          footer={
            stats.data ? (
              topCar ? (
                <>
                  <Star className="size-3.5 shrink-0 text-amber-500" aria-hidden />
                  <span className="sr-only">{t("Le plus vu :")}</span>
                  <span className="truncate">{carTitle(topCar)}</span>
                </>
              ) : (
                t("Pas encore de vues")
              )
            ) : undefined
          }
        />
        <FigureCard
          to={MOBILE_DASHBOARD_PATH}
          icon={Banknote}
          tint="bg-indigo-50 text-indigo-600"
          title="Valeur du stock"
          subtitle="Véhicules en vente"
          value={cars.data ? formatNumber(Math.round(stockValue)) : undefined}
          unit="DT"
          color="text-indigo-600"
          titleColor="text-indigo-700"
          footer={cars.data ? plural(priced.length, "prix affiché", "prix affichés") : undefined}
        />
      </div>

      {GROUPS.map((group) => {
        const tiles = group.tiles.filter((tile) => sections.includes(tile.id));
        if (!tiles.length) return null;
        return (
          <section key={group.title} className="admin-card p-3 pt-0">
            <header className="px-2 pb-3 pt-4">
              <h2 className="text-base font-semibold text-foreground">{t(group.title)}</h2>
              <p className="text-xs text-muted">{t(group.hint)}</p>
            </header>
            <ul className="grid grid-cols-3 gap-2">
              {tiles.map((tile) => (
                <li key={tile.id} className="grid">
                  <TileLink
                    tile={tile}
                    meta={meta[tile.id] ?? ""}
                    badge={tile.id === "leads" ? openLeads : 0}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <a
        href={SITE_FROM_ADMIN}
        target="_blank"
        rel="noopener noreferrer"
        className="admin-card flex items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-foreground outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
      >
        {t("Voir le site public")}
        <ArrowUpRight className="size-4 text-muted rtl:-scale-x-100" aria-hidden />
        <span className="sr-only">{t("(nouvel onglet)")}</span>
      </a>
    </div>
  );
}

/** Section tile: coloured icon, name, and what it is for (or a figure). */
function TileLink({ tile, meta, badge }: { tile: Tile; meta: string; badge: number }) {
  const Icon = tile.icon;
  return (
    <Link
      to={tile.id === "dashboard" ? MOBILE_DASHBOARD_PATH : SECTION_PATHS[tile.id]}
      preload="intent"
      className="relative flex flex-col items-center rounded-2xl bg-surface-secondary px-1.5 pb-3 pt-4 text-center outline-none transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-[oklch(0.95_0.008_285)] focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span
        className={`grid size-12 place-items-center rounded-[0.9rem] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_4px_10px_-4px_rgb(15_23_42/0.35)] ${tile.tint}`}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <span dir="auto" className="mt-2 w-full truncate text-sm font-semibold text-foreground">
        {t(tile.short ?? SECTION_LABELS[tile.id])}
      </span>
      <span className="mt-0.5 line-clamp-2 w-full text-xs leading-tight text-muted">{meta}</span>
      {badge > 0 && (
        <span className="absolute end-2 top-2 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-accent-foreground tabular-nums">
          {badge > 99 ? "99+" : formatNumber(badge)}
        </span>
      )}
    </Link>
  );
}

/** Key figure: big coloured number; the whole card opens the details. */
function FigureCard({
  to,
  icon: Icon,
  tint,
  title,
  subtitle,
  value,
  unit,
  color,
  titleColor,
  footer,
}: {
  to: string;
  icon: LucideIcon;
  tint: string;
  title: string;
  subtitle: string;
  value: string | undefined;
  unit: string;
  color: string;
  /** Darker shade of the card's colour for its title. */
  titleColor: string;
  footer: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="admin-card relative flex min-w-0 flex-col p-3 pt-4 outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus"
    >
      <Notch corner="top-left" radius="1.25rem">
        <span className="grid size-10 place-items-center rounded-full bg-surface text-muted shadow-[0_1px_2px_rgb(15_23_42/0.08)]">
          <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </span>
      </Notch>
      <span className={`ms-auto grid size-10 place-items-center rounded-full ${tint}`}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className={`mt-2.5 px-1 text-[15px] font-semibold leading-snug ${titleColor}`}>
        {t(title)}
      </span>
      <span className="px-1 text-xs text-muted">{t(subtitle)}</span>
      {/* The unit goes under the figure when both don't fit on one line. */}
      <span className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 px-1">
        {value === undefined ? (
          <Skeleton className="h-10 w-16 rounded-lg" />
        ) : (
          <span
            className={`font-bold leading-tight tracking-tight tabular-nums animate-in fade-in-0 duration-300 ${
              value.length <= 4
                ? "text-[2.25rem]"
                : value.length <= 7
                  ? "text-[1.75rem]"
                  : "text-[1.375rem]"
            } ${color}`}
          >
            {value}
          </span>
        )}
        <span className={`text-xs font-semibold opacity-80 ${color}`}>{t(unit)}</span>
      </span>
      <span className="mt-3 flex min-w-0 items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-xs text-muted">
        {typeof footer === "string" ? <span className="truncate">{footer}</span> : (footer ?? "…")}
      </span>
    </Link>
  );
}
