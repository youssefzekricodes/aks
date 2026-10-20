import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import {
  ArrowUpRight,
  Banknote,
  Car,
  FileText,
  Inbox,
  LayoutDashboard,
  Plug,
  Plus,
  RefreshCw,
  Store,
  Tags,
  UserCog,
  type LucideIcon,
} from "@/components/icons";
import { salePrice } from "@/lib/cars";
import { Notch } from "./Notch";
import { formatNumber, t } from "./i18n";
import { socialStatusQuery } from "./SocialCard";
import {
  SECTION_LABELS,
  SECTION_PATHS,
  adminCarsQuery,
  leadsQueryOptions,
  plural,
  type AdminSection,
} from "./model";
import { onSale } from "./VitrinePage";

/*
 * Phone / installed-app home screen of the admin: an overview card with the main
 * action, two key figures, then the sections as grouped shortcut tiles. The
 * statistics have their own page (/admin/tableau-de-bord). Computers keep the
 * sidebar and the dashboard at /admin.
 */

/** Phone address of the statistics (the computer shows them at /admin). */
export const MOBILE_DASHBOARD_PATH = "/admin/tableau-de-bord";

type Tile = { id: AdminSection; icon: LucideIcon; color: string; short?: string };

const GROUPS: { title: string; tiles: Tile[]; more?: { label: string; to: string } }[] = [
  {
    title: "Catalogue",
    more: { label: "Tout voir", to: SECTION_PATHS.cars },
    tiles: [
      { id: "cars", icon: Car, color: "text-red-600" },
      { id: "showcase", icon: Store, color: "text-amber-600" },
      { id: "brands", icon: Tags, color: "text-violet-600" },
    ],
  },
  {
    title: "Activité",
    more: { label: "Statistiques", to: MOBILE_DASHBOARD_PATH },
    tiles: [
      { id: "dashboard", icon: LayoutDashboard, color: "text-indigo-600", short: "Statistiques" },
      { id: "leads", icon: Inbox, color: "text-emerald-600" },
      { id: "facebook", icon: RefreshCw, color: "text-blue-600", short: "Facebook" },
    ],
  },
  {
    title: "Réglages",
    tiles: [
      { id: "content", icon: FileText, color: "text-teal-600", short: "Contenu" },
      { id: "connectors", icon: Plug, color: "text-sky-600" },
      { id: "admins", icon: UserCog, color: "text-slate-600", short: "Comptes" },
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

  const all = cars.data ?? [];
  const forSale = all.filter(onSale);
  const drafts = all.filter((car) => !car.published && !car.sold).length;
  const sold = all.filter((car) => car.sold).length;
  const priced = forSale.filter((car) => !car.price_on_request && car.price > 0);
  const stockValue = priced.reduce((sum, car) => sum + salePrice(car), 0);
  const openLeads = (leads.data ?? []).filter((lead) => !lead.handled).length;
  const showcase = forSale.filter((car) => car.featured_rank != null).length;
  const share = all.length ? Math.round((forSale.length / all.length) * 100) : 0;

  const meta: Partial<Record<AdminSection, string>> = {
    cars: cars.data ? t("{count} au total", { count: all.length }) : t("Stock"),
    showcase: cars.data ? t("{count} en avant", { count: showcase }) : t("Accueil"),
    brands: t("Logos"),
    dashboard: t("Visites"),
    leads: leads.data
      ? openLeads
        ? t("{count} à traiter", { count: openLeads })
        : t("À jour")
      : t("Contacts"),
    facebook: t("Annonces"),
    content: t("Textes"),
    connectors: t("Réseaux"),
    admins: t("Accès"),
  };

  return (
    <div className="grid gap-5">
      {/* Overview, with the main action in the cut-out corner. */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[oklch(0.94_0.03_20)] p-5 pb-[5.25rem]">
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
        {/* Stock split as small bars: for sale / drafts / sold. */}
        <div className="absolute bottom-5 end-5 grid justify-items-center gap-1.5" aria-hidden>
          <span className="flex items-end gap-1.5">
            {[forSale.length, drafts, sold, all.length].map((value, i) => (
              <span
                key={i}
                className={`w-3 rounded-full ${i === 0 ? "bg-accent" : "bg-white/80"}`}
                style={{ height: `${12 + (all.length ? (value / all.length) * 40 : 0)}px` }}
              />
            ))}
          </span>
          <span className="whitespace-nowrap text-xs font-semibold text-[oklch(0.45_0.12_25)]">
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
            className="flex h-12 items-center gap-2 rounded-full border-b-[3px] border-r-[3px] border-[oklch(0.4_0.16_27)] bg-gradient-to-br from-[oklch(0.6_0.21_27)] to-[oklch(0.52_0.21_27)] pe-5 ps-2 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_oklch(0.5_0.2_27/0.8)] outline-none transition-[transform,border-width] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:border-b active:border-r focus-visible:ring-4 focus-visible:ring-focus/40"
          >
            <span className="grid size-8 place-items-center rounded-full bg-white/20">
              <Car className="size-[18px]" aria-hidden />
            </span>
            {t("Ajouter un véhicule")}
            <Plus className="size-4" aria-hidden />
          </button>
        </Notch>
      </section>

      {/* Two key figures. */}
      <div className="grid grid-cols-2 gap-3">
        <FigureCard
          to={SECTION_PATHS.leads}
          icon={Inbox}
          tint="bg-emerald-50 text-emerald-600"
          title="Demandes"
          subtitle="En attente de réponse"
          value={leads.data ? String(openLeads) : undefined}
          unit="à traiter"
          color="text-emerald-600"
          titleColor="text-emerald-700"
          footer={leads.data ? t("{count} au total", { count: leads.data.length }) : undefined}
        />
        <FigureCard
          to={MOBILE_DASHBOARD_PATH}
          icon={Banknote}
          tint="bg-indigo-50 text-indigo-600"
          title="Stock"
          subtitle="Valeur en vente"
          value={
            cars.data
              ? formatNumber(stockValue, { notation: "compact", maximumFractionDigits: 1 })
              : undefined
          }
          unit="DT"
          color="text-indigo-600"
          titleColor="text-indigo-700"
          footer={cars.data ? plural(forSale.length, "véhicule", "véhicules") : undefined}
        />
      </div>

      {GROUPS.map((group) => {
        const tiles = group.tiles.filter((tile) => sections.includes(tile.id));
        if (!tiles.length) return null;
        return (
          <section key={group.title} className="admin-card relative p-3 pt-0">
            <h2 className="px-2 pb-3 pt-4 text-base font-semibold text-foreground">
              {t(group.title)}
            </h2>
            {group.more && (
              <Notch corner="top-right">
                <Link
                  to={group.more.to}
                  className="flex h-10 items-center gap-1 rounded-full bg-surface px-4 text-sm font-medium text-muted shadow-[0_1px_2px_rgb(15_23_42/0.06)] outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {t(group.more.label)}
                </Link>
              </Notch>
            )}
            <ul className="grid grid-cols-3 gap-2">
              {tiles.map((tile) => (
                <li key={tile.id}>
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
        href="/"
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

/** Shortcut tile: icon in a white circle, name, and a short figure or purpose. */
function TileLink({ tile, meta, badge }: { tile: Tile; meta: string; badge: number }) {
  const Icon = tile.icon;
  return (
    <Link
      to={tile.id === "dashboard" ? MOBILE_DASHBOARD_PATH : SECTION_PATHS[tile.id]}
      preload="intent"
      className="relative flex flex-col items-center rounded-2xl bg-surface-secondary px-1 pb-3 pt-4 text-center outline-none transition-colors active:bg-[oklch(0.95_0.008_285)] focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.06)]">
        <Icon className={`size-[22px] ${tile.color}`} aria-hidden />
      </span>
      <span dir="auto" className="mt-2 w-full truncate text-sm font-semibold text-foreground">
        {t(tile.short ?? SECTION_LABELS[tile.id])}
      </span>
      <span className={`w-full truncate text-xs font-medium opacity-80 ${tile.color}`}>{meta}</span>
      {badge > 0 && (
        <span className="absolute end-2 top-2 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-accent-foreground tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

/** Key figure: big coloured number, an arrow in the cut-out corner opens the details. */
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
  /** Darker shade of the card's colour for its title. */
  titleColor: string;
  icon: LucideIcon;
  tint: string;
  title: string;
  subtitle: string;
  value: string | undefined;
  unit: string;
  color: string;
  footer: ReactNode;
}) {
  return (
    <div className="admin-card relative flex min-w-0 flex-col p-3 pt-4">
      <Notch corner="top-left" radius="1.25rem">
        <Link
          to={to}
          aria-label={t("Ouvrir : {title}", { title: t(title) })}
          className="grid size-10 place-items-center rounded-full bg-surface text-muted shadow-[0_1px_2px_rgb(15_23_42/0.08)] outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </Notch>
      <span className={`ms-auto grid size-10 place-items-center rounded-full ${tint}`}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <p className={`mt-2.5 px-1 text-[15px] font-semibold ${titleColor}`}>{t(title)}</p>
      <p className="px-1 text-xs text-muted">{t(subtitle)}</p>
      {/* The unit goes under the figure when both don't fit on one line. */}
      <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 px-1">
        {value === undefined ? (
          <Skeleton className="h-10 w-16 rounded-lg" />
        ) : (
          <span
            // Amounts in words ("1,2 مليون") get a smaller size so the unit stays visible.
            className={`font-bold leading-tight tracking-tight tabular-nums animate-in fade-in-0 duration-300 ${
              value.length <= 3
                ? "text-[2.25rem]"
                : value.length <= 6
                  ? "text-[1.75rem]"
                  : "text-[1.375rem]"
            } ${color}`}
          >
            {value}
          </span>
        )}
        <span className={`text-xs font-semibold opacity-80 ${color}`}>{t(unit)}</span>
      </div>
      <p className="mt-3 truncate rounded-full bg-surface-secondary px-3 py-1.5 text-xs text-muted">
        {footer ?? "…"}
      </p>
    </div>
  );
}
