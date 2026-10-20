import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchField, Skeleton, Spinner } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { Car, CheckCircle2, Inbox, Mail, Phone, RotateCcw } from "@/components/icons";
import { LEAD_REPLY_SUBJECT, mailToSearch } from "@/features/mailbox/queries";
import { WhatsAppLogo } from "@/components/aks/SocialLogos";
import { carImage } from "@/lib/cars";
import type { Lead } from "@/lib/data";
import { formatDate, t, useLocale } from "./i18n";
import { adminCarsQuery } from "./model";
import { RowMenu, type RowAction } from "./ui";
import { fadeIn, LeadCardsSkeleton } from "./skeletons";

/*
 * Phone view of the contact requests: status tabs with counts, a search bar and
 * quick periods, then the requests grouped by day as conversation cards with the
 * three things one does with them (call, WhatsApp, mark handled).
 */

export type LeadFilter = "open" | "handled" | "all";
export type Period = "all" | "7" | "30";

const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

/** Calm, distinct tints for the initials (picked from the name, so stable). */
const TINTS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];
const tintOf = (name: string) =>
  TINTS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length]!;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

/** "Aujourd’hui", "Hier", or the date. */
function groupTitle(date: Date) {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(date)) / 86_400_000);
  if (days === 0) return t("Aujourd’hui");
  if (days === 1) return t("Hier");
  const label = formatDate(date, DAY_LABEL);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function LeadsMobile({
  all,
  filtered,
  isPending,
  error,
  filter,
  onFilter,
  search,
  onSearch,
  period,
  onPeriod,
  pending,
  telOf,
  whatsappUrl,
  menu,
  onToggle,
  onReset,
}: {
  all: Lead[];
  filtered: Lead[];
  isPending: boolean;
  error: React.ReactNode;
  filter: LeadFilter;
  onFilter: (filter: LeadFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  period: Period;
  onPeriod: (period: Period) => void;
  pending: ReadonlySet<string>;
  telOf: (lead: Lead) => string;
  whatsappUrl: (phone: string) => string;
  menu: (lead: Lead) => (RowAction | false)[];
  onToggle: (lead: Lead) => void;
  onReset: () => void;
}) {
  const locale = useLocale();
  const cars = useQuery(adminCarsQuery);
  const bySlug = useMemo(
    () => new Map((cars.data ?? []).map((car) => [car.slug, car])),
    [cars.data],
  );
  const counts = {
    open: all.filter((lead) => !lead.handled).length,
    handled: all.filter((lead) => lead.handled).length,
    all: all.length,
  };
  // Newest first, one group per day.
  const groups = useMemo(() => {
    const out: { title: string; leads: Lead[] }[] = [];
    for (const lead of [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      const title = groupTitle(new Date(lead.created_at));
      const last = out[out.length - 1];
      if (last?.title === title) last.leads.push(lead);
      else out.push({ title, leads: [lead] });
    }
    return out;
    // The day titles follow the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, locale]);

  const tabs: { id: LeadFilter; label: string }[] = [
    { id: "open", label: "À traiter" },
    { id: "handled", label: "Traitées" },
    { id: "all", label: "Toutes" },
  ];
  const periods: { id: Period; label: string }[] = [
    { id: "all", label: "Toutes dates" },
    { id: "7", label: "7 jours" },
    { id: "30", label: "30 jours" },
  ];

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("Demandes")}</h1>
        <p className="text-sm text-muted">
          {isPending
            ? t("Chargement…")
            : counts.open
              ? t("{count} en attente de réponse", { count: String(counts.open) })
              : t("Toutes les demandes sont traitées")}
        </p>
      </header>

      {/* Status: segmented control with counts. */}
      <div
        role="tablist"
        aria-label={t("Statut")}
        className="admin-card grid grid-cols-3 gap-1 p-1"
      >
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(tab.id)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-[1.1rem] text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                active ? "bg-foreground text-background" : "text-muted active:bg-surface-secondary"
              }`}
            >
              {t(tab.label)}
              <span
                className={`min-w-5 rounded-full px-1.5 text-[11px] font-semibold leading-5 tabular-nums ${
                  active
                    ? "bg-background/20 text-background"
                    : tab.id === "open" && counts.open
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-secondary text-muted"
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <SearchField
        value={search}
        onChange={onSearch}
        aria-label={t("Rechercher une demande")}
        fullWidth
      >
        <SearchField.Group className="h-12 rounded-full bg-surface px-1 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t("Nom, téléphone ou message…")} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t("Période")}>
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => onPeriod(p.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
              period === p.id
                ? "bg-accent-soft text-accent ring-1 ring-accent/30"
                : "bg-surface text-muted shadow-[0_1px_2px_rgb(15_23_42/0.05)]"
            }`}
          >
            {t(p.label)}
          </button>
        ))}
      </div>

      {error ? (
        error
      ) : isPending ? (
        <LeadCardsSkeleton />
      ) : groups.length === 0 ? (
        <div className="admin-card grid justify-items-center gap-2 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Inbox className="size-6" aria-hidden />
          </span>
          <p className="mt-1 font-semibold text-foreground">
            {t(
              all.length === 0
                ? "Aucune demande reçue pour l’instant"
                : filter === "open" && !search && period === "all"
                  ? "Tout est traité"
                  : "Aucune demande ne correspond",
            )}
          </p>
          <p className="text-sm text-muted">
            {t(
              all.length === 0
                ? "Les messages du formulaire de contact apparaîtront ici."
                : "Changez de statut, de recherche ou de période.",
            )}
          </p>
          {all.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="mt-2 h-10 rounded-full bg-surface-secondary px-4 text-sm font-medium text-foreground active:bg-[oklch(0.95_0.008_285)]"
            >
              {t("Afficher toutes les demandes")}
            </button>
          )}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.title} aria-label={group.title} className={`grid gap-3 ${fadeIn}`}>
            <h2 className="px-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">
              {group.title}
            </h2>
            <ul className="grid gap-3">
              {group.leads.map((lead) => (
                <LeadItem
                  key={lead.id}
                  lead={lead}
                  car={lead.car_slug ? bySlug.get(lead.car_slug) : undefined}
                  pending={pending.has(lead.id)}
                  tel={telOf(lead)}
                  whatsapp={whatsappUrl(lead.phone)}
                  menu={menu(lead)}
                  onToggle={() => onToggle(lead)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function LeadItem({
  lead,
  car,
  pending,
  tel,
  whatsapp,
  menu,
  onToggle,
}: {
  lead: Lead;
  car: { brand: string; name: string; images: string[]; slug: string } | undefined;
  pending: boolean;
  tel: string;
  whatsapp: string;
  menu: (RowAction | false)[];
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const message = lead.message?.trim() ?? "";
  const long = message.length > 140 || message.includes("\n");
  return (
    <li className={`admin-card grid gap-3 p-4 ${lead.handled ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${tintOf(lead.name)}`}
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-foreground">{lead.name}</span>
            {lead.handled && (
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-600"
                aria-label={t("Traitée")}
              />
            )}
          </p>
          <p className="truncate text-xs text-muted">
            <time dateTime={lead.created_at}>{formatDate(new Date(lead.created_at), TIME)}</time>
            {" · "}
            <bdi dir="ltr">{lead.phone}</bdi>
          </p>
        </div>
        {pending ? (
          <Spinner size="sm" aria-label={t("Mise à jour")} />
        ) : (
          <div className="-me-1">
            <RowMenu
              label={t("Actions pour la demande de {name}", { name: lead.name })}
              actions={menu}
              large
            />
          </div>
        )}
      </div>

      {(lead.car_slug || car) && (
        <a
          href={`/vehicule/${lead.car_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl bg-surface-secondary p-2 pe-3 outline-none active:bg-[oklch(0.95_0.008_285)] focus-visible:ring-2 focus-visible:ring-focus"
        >
          {car ? (
            <img
              src={carImage(car as Parameters<typeof carImage>[0])}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="grid aspect-[4/3] w-14 shrink-0 place-items-center rounded-xl bg-surface text-muted">
              <Car className="size-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
              {t("Véhicule demandé")}
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">
              {car ? `${car.brand} ${car.name}` : lead.car_slug}
            </span>
          </span>
          <span className="sr-only">{t("(nouvel onglet)")}</span>
        </a>
      )}

      {message && (
        <div className="rounded-2xl rounded-ss-md bg-surface-secondary px-3.5 py-2.5">
          <p
            id={`lead-m-${lead.id}`}
            className={`text-sm leading-relaxed text-foreground ${expanded ? "whitespace-pre-line" : "line-clamp-3"}`}
          >
            {message}
          </p>
          {long && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`lead-m-${lead.id}`}
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-sm font-medium text-accent"
            >
              {t(expanded ? "Réduire" : "Lire la suite")}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <a
          href={tel}
          aria-label={t("Appeler {name}", { name: lead.name })}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-700 outline-none active:bg-sky-100 focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Phone className="size-5" aria-hidden />
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Écrire à {name} sur WhatsApp", { name: lead.name })}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#25D366]/12 outline-none active:bg-[#25D366]/20 focus-visible:ring-2 focus-visible:ring-focus"
        >
          <WhatsAppLogo className="size-5" />
        </a>
        {lead.email && (
          // Opens the shop's mailbox, ready to write to this client.
          <Link
            to="/admin/messagerie"
            search={mailToSearch(lead.email, LEAD_REPLY_SUBJECT)}
            aria-label={t("Répondre à {name} par e-mail", { name: lead.name })}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-700 outline-none active:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Mail className="size-5" aria-hidden />
          </Link>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={onToggle}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60 ${
            lead.handled
              ? "bg-surface-secondary text-foreground active:bg-[oklch(0.95_0.008_285)]"
              : "bg-foreground text-background active:opacity-90"
          }`}
        >
          {lead.handled ? (
            <RotateCcw className="size-4" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden />
          )}
          {t(lead.handled ? "Remettre à traiter" : "Marquer traitée")}
        </button>
      </div>
    </li>
  );
}
