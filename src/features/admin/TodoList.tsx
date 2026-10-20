import { Link } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import {
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  FileClock,
  Inbox,
  Mail,
  type LucideIcon,
} from "@/components/icons";
import type { Lead } from "@/features/catalog/types";
import { formatNumber, t } from "./i18n";
import { SECTION_PATHS, missingFields, type AdminCar, type CarFilter } from "./model";
import { fadeIn } from "./skeletons";

/*
 * "À faire": what is waiting for the admin, written as plain sentences
 * ("3 clients attendent une réponse"). Each line opens the list concerned, already
 * filtered. Lines with nothing to do are left out; when everything is done, a
 * single reassuring line says so. Shared by the phone home screen and the dashboard.
 */

type Item = {
  key: string;
  count: number;
  icon: LucideIcon;
  /** Icon square colour (written out for Tailwind). */
  tint: string;
  title: string;
  hint: string;
  to: string;
  filter?: CarFilter;
};

export function todoItems(cars: AdminCar[], leads: Lead[], unreadMail = 0): Item[] {
  const openLeads = leads.filter((lead) => !lead.handled).length;
  const toFill = cars.filter((car) => missingFields(car).length > 0).length;
  const drafts = cars.filter((car) => !car.published && !car.sold).length;
  const items: Item[] = [
    {
      key: "leads",
      count: openLeads,
      icon: Inbox,
      tint: "bg-emerald-500",
      title:
        openLeads > 1
          ? t("{count} clients attendent une réponse", { count: formatNumber(openLeads) })
          : t("1 client attend une réponse"),
      hint: t("Rappelez-les ou répondez par WhatsApp"),
      to: SECTION_PATHS.leads,
    },
    {
      key: "mail",
      count: unreadMail,
      icon: Mail,
      tint: "bg-indigo-500",
      title:
        unreadMail > 1
          ? t("{count} e-mails non lus", { count: formatNumber(unreadMail) })
          : t("1 e-mail non lu"),
      hint: t("Dans la boîte de la boutique"),
      to: SECTION_PATHS.mail,
    },
    {
      key: "fill",
      count: toFill,
      icon: ClipboardList,
      tint: "bg-amber-500",
      title:
        toFill > 1
          ? t("{count} véhicules à compléter", { count: formatNumber(toFill) })
          : t("1 véhicule à compléter"),
      hint: t("Photos, prix ou caractéristiques manquants"),
      to: SECTION_PATHS.cars,
      filter: "incomplete",
    },
    {
      key: "drafts",
      count: drafts,
      icon: FileClock,
      tint: "bg-sky-500",
      title:
        drafts > 1
          ? t("{count} véhicules pas encore publiés", { count: formatNumber(drafts) })
          : t("1 véhicule pas encore publié"),
      hint: t("Invisibles pour les clients tant qu’ils ne sont pas publiés"),
      to: SECTION_PATHS.cars,
      filter: "draft",
    },
  ];
  return items.filter((item) => item.count > 0);
}

export function TodoList({
  cars,
  leads,
  unreadMail = 0,
}: {
  cars: AdminCar[] | undefined;
  leads: Lead[] | undefined;
  /** Unread e-mails of the shop's mailbox (0 when it is not set up). */
  unreadMail?: number;
}) {
  if (!cars || !leads)
    return (
      <div className="grid gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[4.25rem] rounded-2xl" />
        ))}
      </div>
    );
  const items = todoItems(cars, leads, unreadMail);
  if (!items.length)
    return (
      <p
        className={`flex items-center gap-3 rounded-2xl bg-emerald-50 px-3 py-3 text-emerald-800 ${fadeIn}`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-600">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <span className="grid">
          <span className="text-[15px] font-semibold">{t("Tout est à jour")}</span>
          <span className="text-xs opacity-80">{t("Rien ne vous attend pour le moment.")}</span>
        </span>
      </p>
    );
  return (
    <ul className={`grid grid-cols-1 gap-2 ${fadeIn}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.key}>
            <Link
              to={item.to}
              search={item.filter ? { filtre: item.filter } : {}}
              className="flex items-center gap-3 rounded-2xl bg-surface-secondary px-3 py-3 outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--surface-secondary)_70%,var(--foreground)_6%)] active:bg-[color-mix(in_oklab,var(--surface-secondary)_70%,var(--foreground)_6%)] focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] ${item.tint}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="text-[15px] font-semibold leading-snug text-foreground">
                  {item.title}
                </span>
                <span className="text-xs leading-snug text-muted">{item.hint}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
