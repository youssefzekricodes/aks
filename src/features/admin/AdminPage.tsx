import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  Outlet,
  getRouteApi,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Header, Label, Separator, toast } from "@heroui/react";
import {
  Car,
  ChevronDown,
  ChevronLeft,
  LayoutDashboard,
  ExternalLink,
  Globe,
  UserRound,
  FileText,
  Inbox,
  LogOut,
  Mail,
  Plug,
  ShieldCheck,
  RefreshCw,
  Store,
  Tags,
  UserCog,
  type LucideIcon,
} from "@/components/icons";
import { signOut as clearSession } from "@/features/auth/auth.functions";
import { mailStatusQuery } from "@/features/mailbox/queries";
import { clearAdminCache, persistAdminCache } from "./persist";
import { disablePush, pushSupported } from "./push";
import { useSiteText } from "@/lib/site-content";
import { brandInfo } from "@/features/catalog/brands";
import { hideSplash, SITE_FROM_ADMIN } from "@/lib/splash";
import { markAdminDevice } from "@/components/aks/AdminBar";
import {
  ADMIN_SECTIONS,
  PROFILE_PATH,
  ROLE_LABELS,
  displayName,
  SECTION_LABELS,
  SECTION_PATHS,
  SUPER_ADMIN_SECTIONS,
  adminCarsQuery,
  leadsQueryOptions,
  sectionAt,
  sessionQuery,
  type AdminSection,
  type Session,
} from "./model";
import { AdminAvatar, BottomSheet, SheetOption, useIsPhone } from "./ui";
import { formatDate, intlLocale, setLocale, t, useLocale } from "./i18n";
import { I18nProvider } from "react-aria-components";

/** IBM Plex Sans Arabic (Arabic glyphs only), fetched the first time Arabic is used. */
let arabicFont: Promise<unknown> | null = null;
const loadArabicFont = () =>
  (arabicFont ??= Promise.all([
    import("@fontsource/ibm-plex-sans-arabic/arabic-400.css"),
    import("@fontsource/ibm-plex-sans-arabic/arabic-500.css"),
    import("@fontsource/ibm-plex-sans-arabic/arabic-600.css"),
    import("@fontsource/ibm-plex-sans-arabic/arabic-700.css"),
  ]));

const SECTION_ICONS: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  cars: Car,
  showcase: Store,
  facebook: RefreshCw,
  brands: Tags,
  content: FileText,
  leads: Inbox,
  mail: Mail,
  connectors: Plug,
  admins: UserCog,
};

const authenticatedRoute = getRouteApi("/_authenticated");

/**
 * Admin shell: sidebar, top bar and the current section (child route). Each
 * section's code loads when it is opened (or hovered in the menu).
 */
export function AdminLayout() {
  // The route guard already loaded the session; the query keeps it fresh after 2FA changes.
  const context = authenticatedRoute.useRouteContext();
  return (
    <AdminShell session={context.session}>
      <Outlet />
    </AdminShell>
  );
}

/** Where "back" leads on a phone (back arrow and swipe from the left edge). */
function parentOf(
  pathname: string,
  from: unknown,
  mail?: { message: unknown; folder: unknown },
): { href: string; label: string } | null {
  // A message open in the mailbox: back to its folder.
  if (pathname.startsWith("/admin/messagerie") && mail?.message)
    return {
      href:
        typeof mail.folder === "string"
          ? `/admin/messagerie?dossier=${encodeURIComponent(mail.folder)}`
          : "/admin/messagerie",
      label: "Messagerie",
    };
  if (/^\/admin\/vehicules\/marque\//.test(pathname))
    return { href: "/admin/vehicules", label: "Véhicules" };
  if (/^\/admin\/vehicules\/[^/]+\/?$/.test(pathname)) {
    if (typeof from === "string" && from.startsWith("marque:")) {
      const brand = from.slice("marque:".length);
      return { href: `/admin/vehicules/marque/${brand}`, label: brandInfo(brand).name };
    }
    if (from === "vitrine") return { href: "/admin/vitrine", label: "Vitrine" };
    if (from === "accueil") return { href: "/admin", label: "Accueil" };
    return { href: "/admin/vehicules", label: "Véhicules" };
  }
  return pathname.replace(/\/$/, "") === "/admin" ? null : { href: "/admin", label: "Accueil" };
}

/** Title of the phone top bar. */
function pageTitle(pathname: string, section: AdminSection, mailOpen = false) {
  if (mailOpen) return "Message";
  if (/^\/admin\/vehicules\/marque\//.test(pathname)) return "Ordre des véhicules";
  if (/^\/admin\/vehicules\/[^/]+\/?$/.test(pathname)) return "Fiche véhicule";
  if (pathname.startsWith(PROFILE_PATH)) return "Mon profil";
  return SECTION_LABELS[section];
}

/** Longest the launch splash waits for the first screen's data. */
const SPLASH_MAX_MS = 6000;

/** A swipe that starts this close to the left edge (px) and goes this far goes back. */
const EDGE = 28;
const SWIPE_BACK = 90;
/** Pull-to-refresh: distance (px, after resistance) that triggers it, hold position, limit. */
const PULL_REFRESH = 76;
const PULL_HOLD = 56;
const PULL_MAX = 120;
/** Finger travel before the pull starts, and how long the page must have been still at the top. */
const PULL_START = 22;
const PULL_REST_MS = 450;
/** Touches starting here never pull: drag handles and draggable cards, fields, sheets. */
const NO_PULL =
  "[aria-roledescription='sortable'], [data-no-pull], input, textarea, select, [role='dialog']";

/**
 * Computer: sidebar + top bar (unchanged). Phone and the installed "AKS Admin" app:
 * a home screen of tiles (/admin); each section opens full screen with a back arrow,
 * and a swipe from the left edge returns to where it was opened from.
 */
export function AdminShell({
  session: initialSession,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useQuery({ ...sessionQuery, initialData: initialSession });
  const isSuperAdmin = session.data?.role === "super_admin";
  const sections = ADMIN_SECTIONS.filter(
    (id) => isSuperAdmin || !SUPER_ADMIN_SECTIONS.includes(id),
  );
  const { pathname, from, mailMessage, mailFolder } = useLocation({
    select: (location) => {
      const search = location.search as Record<string, unknown>;
      return {
        pathname: location.pathname,
        from: search["from"],
        mailMessage: search["message"],
        mailFolder: search["dossier"],
      };
    },
  });
  const section = sectionAt(pathname);
  const mailOpen = pathname.startsWith("/admin/messagerie") && Boolean(mailMessage);
  const parent = parentOf(pathname, from, { message: mailMessage, folder: mailFolder });

  // Signed out elsewhere, or 2FA no longer satisfied (password reset, factor removed).
  const lost = session.isSuccess && (!session.data || session.data.mfa !== "ok");
  useEffect(() => {
    if (lost) void navigate({ to: "/auth", replace: true });
  }, [lost, navigate]);
  const cars = useQuery(adminCarsQuery);
  const leads = useQuery(leadsQueryOptions);
  const counts: Partial<
    Record<AdminSection, { value: number; label: string; highlight?: boolean }>
  > = {};
  if (cars.data) counts.cars = { value: cars.data.length, label: "véhicules" };
  const openLeads = (leads.data ?? []).filter((lead) => !lead.handled).length;
  if (openLeads > 0) counts.leads = { value: openLeads, label: "à traiter", highlight: true };
  // Unread e-mails (checked every two minutes; nothing when the mailbox is not set up).
  const mail = useQuery(mailStatusQuery);
  const unreadMail = mail.data?.configured ? mail.data.unread : 0;
  if (unreadMail > 0) counts.mail = { value: unreadMail, label: "non lus", highlight: true };

  // Back: to the previous page when that is the parent (keeps the history tidy),
  // otherwise straight to the parent.
  const previous = useRef<string | null>(null);
  const current = useRef(pathname);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [accountOpen, setAccountOpen] = useState(false);
  const phone = useIsPhone();
  const locale = useLocale();
  const rtl = locale === "ar";
  // Language of the admin: direction and language of the page (dialogs and sheets
  // included), and the Arabic font, loaded only when Arabic is chosen.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = rtl ? "ar" : "fr";
    root.dir = rtl ? "rtl" : "ltr";
    if (rtl) void loadArabicFont();
    return () => {
      root.lang = "fr";
      root.dir = "ltr";
    };
  }, [rtl]);
  /** Close the account sheet, then run what was chosen (dialogs open after it). */
  const fromSheet = (action: () => void) => {
    setAccountOpen(false);
    window.setTimeout(action, 180);
  };
  useEffect(() => {
    if (current.current === pathname) return;
    previous.current = current.current;
    current.current = pathname;
  }, [pathname]);
  const goBack = useCallback(() => {
    if (!parent) return;
    setDirection("back");
    if (previous.current === parent.href) router.history.back();
    else void navigate({ href: parent.href });
  }, [parent, navigate, router]);
  useEffect(() => {
    // The next page opened slides in from the right again.
    if (direction !== "back") return undefined;
    const id = window.setTimeout(() => setDirection("forward"), 400);
    return () => window.clearTimeout(id);
  }, [direction, pathname]);

  // Swipe from the left edge (phones): the page follows the finger, and goes back
  // when released far enough.
  const page = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);
  const setShift = (dx: number, animate: boolean) => {
    const el = page.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms cubic-bezier(0.2, 0, 0, 1)" : "none";
    el.style.transform = dx ? `translateX(${rtl ? -dx : dx}px)` : "";
    el.style.boxShadow = dx ? "-12px 0 24px rgb(0 0 0 / 0.12)" : "";
  };
  // Pull down at the top of a page (phones): the refresh icon follows the finger,
  // and releasing far enough reloads every piece of data on screen.
  const indicator = useRef<HTMLDivElement>(null);
  const pull = useRef<{ x: number; y: number; d: number; active: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const showPull = (d: number, animate: boolean) => {
    const el = page.current;
    const ind = indicator.current;
    const ease = animate ? "transform 220ms cubic-bezier(0.2, 0, 0, 1)" : "none";
    if (el) {
      el.style.transition = ease;
      el.style.transform = d ? `translateY(${d}px)` : "";
    }
    if (ind) {
      ind.style.transition = animate ? `${ease}, opacity 220ms` : "none";
      ind.style.transform = `translateY(${d - 48}px)`;
      ind.style.opacity = String(Math.min(1, d / PULL_REFRESH));
      const icon = ind.firstElementChild as HTMLElement | null;
      if (icon) icon.style.transform = `rotate(${d * 3}deg)`;
    }
  };
  async function refresh() {
    setRefreshing(true);
    showPull(PULL_HOLD, true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
      showPull(0, true);
    }
  }
  // Saved copy of the admin's data on this device: instant start, then refreshed.
  useEffect(() => persistAdminCache(queryClient), [queryClient]);

  // Notifications: one arriving while the app is open refreshes what it is about,
  // and tapping one while the app is open goes to its page.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { kind?: string; type?: string; url?: string } | null;
      if (data?.kind === "admin-push") {
        if (data.type === "mail") {
          void queryClient.invalidateQueries({ queryKey: ["mail-list"] });
          void queryClient.invalidateQueries({ queryKey: ["mail-status"] });
        }
        if (data.type === "lead") void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      }
      if (data?.kind === "admin-open" && data.url) {
        const url = new URL(data.url);
        void navigate({ href: url.pathname + url.search });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient, navigate]);

  // This device belongs to an admin: the public site may then show its admin strip.
  useEffect(() => markAdminDevice(true), []);

  // Launch splash: it stays until the first screen is complete (its data loaded,
  // no loading placeholder left), so the app opens straight onto a finished page.
  // Never longer than SPLASH_MAX_MS (slow network, error).
  useEffect(() => {
    const started = performance.now();
    let timer = 0;
    const check = () => {
      if (performance.now() - started > SPLASH_MAX_MS || firstScreenReady()) {
        // Next frame: the finished page is painted under the splash first.
        requestAnimationFrame(() => hideSplash());
        return;
      }
      timer = window.setTimeout(check, 60);
    };
    const firstScreenReady = () => {
      const main = document.getElementById("admin-main");
      if (!main?.textContent?.trim()) return false;
      // Data shown from the device's saved copy counts as ready (it refreshes behind).
      if (queryClient.isFetching({ type: "active" }) > 0 && performance.now() - started < 400)
        return false;
      // Placeholders on screen (those of the computer layout are hidden on phones).
      return ![...main.querySelectorAll(".skeleton, [aria-busy='true']")].some(
        (el) => el.getClientRects().length > 0,
      );
    };
    check();
    return () => window.clearTimeout(timer);
    // Once, at launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every section's code (and data) loads in the background once the app is idle,
  // so switching screens never waits on the network with the old screen still showing.
  useEffect(() => {
    const preload = () => {
      for (const id of sections)
        void router.preloadRoute({ to: SECTION_PATHS[id] }).catch(() => undefined);
      void router.preloadRoute({ to: "/admin/tableau-de-bord" }).catch(() => undefined);
    };
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1200));
    const handle = idle(preload);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
    // Once per admin session (sections only change with the role).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sections.length]);

  // Last time the page scrolled: a pull only starts once it has rested at the top
  // (so the end of a fling up, or a scroll back to the top, never refreshes).
  const lastScroll = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      lastScroll.current = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // The browser's own pull-to-refresh / bounce would compete with this one.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "none";
    return () => {
      root.style.overscrollBehaviorY = before;
    };
  }, []);

  const touch = {
    onTouchStart: (event: React.TouchEvent) => {
      const t = event.touches[0];
      if (!t || window.innerWidth >= 1024) return;
      const fromEdge = rtl ? t.clientX >= window.innerWidth - EDGE : t.clientX <= EDGE;
      if (parent && fromEdge) {
        swipe.current = { x: t.clientX, y: t.clientY, dx: 0, active: false };
        return;
      }
      const resting = performance.now() - lastScroll.current > PULL_REST_MS;
      const target = event.target as HTMLElement;
      if (window.scrollY <= 0 && resting && !refreshing && !target.closest(NO_PULL))
        pull.current = { x: t.clientX, y: t.clientY, d: 0, active: false };
    },
    onTouchMove: (event: React.TouchEvent) => {
      const t = event.touches[0];
      if (!t) return;
      const p = pull.current;
      if (p) {
        const dx = t.clientX - p.x;
        const dy = t.clientY - p.y;
        if (!p.active) {
          // Upwards, sideways or the page moved: not a pull.
          if (dy < 0 || Math.abs(dx) * 2 > Math.abs(dy) || window.scrollY > 0) {
            pull.current = null;
            return;
          }
          if (dy > PULL_START) p.active = true;
        }
        if (p.active) {
          // Resistance: the page moves less than the finger, up to a limit.
          p.d = Math.min(PULL_MAX, Math.max(0, (dy - PULL_START) * 0.45));
          showPull(p.d, false);
        }
        return;
      }
      const s = swipe.current;
      if (!s) return;
      // Towards "back": rightwards in French, leftwards in Arabic (mirrored screen).
      const dx = (t.clientX - s.x) * (rtl ? -1 : 1);
      const dy = t.clientY - s.y;
      if (!s.active) {
        if (Math.abs(dy) > Math.abs(dx)) {
          swipe.current = null; // vertical scroll
          return;
        }
        if (dx > 8) s.active = true;
      }
      if (s.active) {
        s.dx = Math.max(0, dx);
        setShift(s.dx, false);
      }
    },
    onTouchEnd: () => {
      const p = pull.current;
      pull.current = null;
      if (p?.active) {
        if (p.d >= PULL_REFRESH) void refresh();
        else showPull(0, true);
        return;
      }
      const s = swipe.current;
      swipe.current = null;
      if (!s?.active) return;
      if (s.dx < SWIPE_BACK) return setShift(0, true);
      setShift(window.innerWidth, true);
      window.setTimeout(() => {
        goBack();
        setShift(0, false);
      }, 180);
    },
  };

  async function signOut() {
    // A signed-out device stops receiving the admin's notifications.
    if (pushSupported()) await disablePush().catch(() => undefined);
    try {
      await clearSession();
    } catch {
      toast.danger(t("Déconnexion impossible. Veuillez réessayer."));
      return;
    }
    markAdminDevice(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await clearAdminCache();
    void navigate({ to: "/auth", replace: true });
  }

  const email = session.data?.email ?? "";
  const name = session.data?.name ?? null;
  /** Name shown for the account (its display name, or else the e-mail). */
  const shownName = session.data ? displayName(session.data) : "";
  const onProfile = pathname.startsWith(PROFILE_PATH);

  const avatarUrl = session.data?.avatarUrl ?? null;
  /** Account button and menu; `large`: the bigger photo of the phone home screen. */
  const accountMenu = (large = false) =>
    phone ? (
      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        aria-label={`${t("Compte")} ${shownName}`.trim()}
        aria-haspopup="dialog"
        className="rounded-full outline-none active:opacity-80 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <AdminAvatar
          email={shownName}
          url={avatarUrl}
          className={
            large
              ? "size-12 text-lg ring-[3px] ring-surface shadow-[0_4px_12px_-4px_rgb(15_23_42/0.25)]"
              : "size-8 text-xs"
          }
        />
      </button>
    ) : (
      <Dropdown>
        <Button
          variant="ghost"
          size={large ? "md" : "sm"}
          className={large ? "h-auto rounded-full p-0.5" : ""}
          aria-label={`${t("Compte")} ${shownName}`.trim()}
        >
          <AdminAvatar
            email={shownName}
            url={avatarUrl}
            className={
              large
                ? "size-12 text-lg ring-[3px] ring-surface shadow-[0_4px_12px_-4px_rgb(15_23_42/0.25)]"
                : "size-7 text-xs"
            }
          />
          <span className="hidden max-w-56 truncate lg:inline">{shownName || t("Compte")}</span>
          <ChevronDown className="size-4 text-muted max-lg:hidden" aria-hidden />
        </Button>
        <Dropdown.Popover placement="bottom end" className="min-w-60">
          <Dropdown.Menu
            aria-label={t("Compte")}
            onAction={(key) => {
              if (key === "logout") void signOut();
              if (key === "language") setLocale(locale === "ar" ? "fr" : "ar");
              if (key === "profile") void navigate({ to: PROFILE_PATH });
              if (key === "security")
                void navigate({ to: "/admin/administrateurs", hash: "ma-securite" });
            }}
          >
            <Dropdown.Section>
              <Header>
                <span className="block text-xs text-muted">{t("Connecté en tant que")}</span>
                {name && (
                  <span dir="auto" className="block truncate text-sm font-semibold text-foreground">
                    {name}
                  </span>
                )}
                <span className="block truncate text-sm text-foreground">
                  {email || t("Administrateur")}
                </span>
                {session.data && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {t(ROLE_LABELS[session.data.role])}
                  </span>
                )}
              </Header>
              <Dropdown.Item id="profile" textValue={t("Mon profil")}>
                <UserRound className="size-4 shrink-0 text-muted" aria-hidden />
                <Label>{t("Mon profil")}</Label>
              </Dropdown.Item>
              {isSuperAdmin ? (
                <Dropdown.Item id="security" textValue={t("Ma sécurité")}>
                  <ShieldCheck className="size-4 shrink-0 text-muted" aria-hidden />
                  <Label>{t("Ma sécurité")}</Label>
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item
                id="site"
                textValue={t("Voir le site")}
                href={SITE_FROM_ADMIN}
                target="_blank"
              >
                <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
                <Label>{t("Voir le site")}</Label>
              </Dropdown.Item>
              <Dropdown.Item id="language" textValue={locale === "ar" ? "Français" : "العربية"}>
                <Globe className="size-4 shrink-0 text-muted" aria-hidden />
                <Label>{locale === "ar" ? "Français" : "العربية"}</Label>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Item id="logout" textValue={t("Déconnexion")} variant="danger">
              <LogOut className="size-4 shrink-0 text-danger" aria-hidden />
              <Label>{t("Déconnexion")}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    );

  return (
    // react-aria widgets (selects, switches, calendars) follow the admin's language.
    <I18nProvider locale={intlLocale()}>
      <div className="admin-app min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <a
          href="#admin-main"
          className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t("Aller au contenu")}
        </a>

        <aside className="vt-sidebar sticky top-0 hidden h-dvh flex-col border-r border-separator bg-surface lg:flex">
          <Brand />
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <SectionNav section={onProfile ? null : section} sections={sections} counts={counts} />
          </div>
          <div className="border-t border-separator p-4">
            <a
              href={SITE_FROM_ADMIN}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ExternalLink className="size-4" aria-hidden />
              {t("Voir le site")}
              <span className="sr-only">{t("(nouvel onglet)")}</span>
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col overflow-x-clip">
          {/* Computer top bar (unchanged). */}
          <header className="vt-header dark sticky top-0 z-30 hidden border-b border-white/10 bg-[oklch(0.17_0.004_286)] text-foreground lg:block">
            <div className="flex h-16 items-center gap-2 px-8">
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="text-muted">{t("Administration")} / </span>
                <span className="font-semibold text-foreground">
                  {t(onProfile ? "Mon profil" : SECTION_LABELS[section])}
                </span>
              </p>
              {accountMenu()}
            </div>
          </header>

          {/* Phone: light bar with a round back button and the page title. */}
          {parent && (
            <header className="sticky top-0 z-30 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
              <div className="flex h-14 items-center gap-3 px-4">
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={t("Retour : {page}", { page: t(parent.label) })}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.08)] outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden />
                </button>
                <p className="min-w-0 flex-1 truncate text-center text-base font-semibold text-foreground">
                  {t(pageTitle(pathname, section, mailOpen))}
                </p>
                <span className="grid size-10 shrink-0 place-items-center">{accountMenu()}</span>
              </div>
            </header>
          )}

          {/* Phone home screen: greeting and the account photo, no bar. */}
          {!parent && (
            <div className="pt-[env(safe-area-inset-top)] lg:hidden">
              <div className="flex items-center justify-between gap-4 px-4 pt-6 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm text-muted first-letter:uppercase">
                    {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <h1 className="mt-0.5 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                    {name
                      ? t("Bonjour {name} !", { name: name.split(" ")[0] ?? name })
                      : t("Bonjour !")}
                  </h1>
                </div>
                {accountMenu(true)}
              </div>
            </div>
          )}
          {/* Pull-to-refresh indicator (phones), moved by the touch handlers. */}
          <div
            ref={indicator}
            aria-hidden
            className="pointer-events-none fixed inset-x-0 z-40 flex justify-center opacity-0 lg:hidden"
            style={{
              top: `calc(env(safe-area-inset-top) + ${parent ? "3.75rem" : "0.75rem"})`,
              transform: "translateY(-48px)",
            }}
          >
            <span className="grid size-10 place-items-center rounded-full bg-surface text-accent shadow-[0_4px_14px_-4px_rgb(15_23_42/0.25)]">
              <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
            </span>
          </div>
          <p role="status" className="sr-only">
            {refreshing ? t("Actualisation des données…") : ""}
          </p>
          <div ref={page} {...touch} onTouchCancel={touch.onTouchEnd} className="flex-1">
            <main
              id="admin-main"
              tabIndex={-1}
              className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-8 lg:py-8"
            >
              {/* Phones: each page slides in (from the left when going back). */}
              <div
                key={`${pathname}|${locale}`}
                className={`max-lg:animate-in max-lg:fade-in-0 max-lg:duration-300 ${
                  (direction === "back") !== rtl
                    ? "max-lg:slide-in-from-left-8"
                    : "max-lg:slide-in-from-right-8"
                }`}
              >
                {children}
              </div>
            </main>
          </div>
        </div>

        <BottomSheet
          isOpen={accountOpen}
          onOpenChange={setAccountOpen}
          title={shownName || t("Compte")}
          description={
            session.data
              ? name
                ? `${email} · ${t(ROLE_LABELS[session.data.role])}`
                : t(ROLE_LABELS[session.data.role])
              : undefined
          }
        >
          <div className="grid gap-0.5">
            <SheetOption
              icon={UserRound}
              onPress={() => fromSheet(() => void navigate({ to: PROFILE_PATH }))}
            >
              {t("Mon profil")}
            </SheetOption>
            {isSuperAdmin && (
              <SheetOption
                icon={ShieldCheck}
                onPress={() =>
                  fromSheet(
                    () => void navigate({ to: "/admin/administrateurs", hash: "ma-securite" }),
                  )
                }
              >
                {t("Ma sécurité")}
              </SheetOption>
            )}
            <SheetOption
              icon={ExternalLink}
              href={SITE_FROM_ADMIN}
              external
              onPress={() => setAccountOpen(false)}
            >
              {t("Voir le site")}
            </SheetOption>
            <SheetOption
              icon={Globe}
              onPress={() => {
                setAccountOpen(false);
                setLocale(locale === "ar" ? "fr" : "ar");
              }}
            >
              {locale === "ar" ? "Français" : "العربية"}
            </SheetOption>
            <Separator className="my-1.5" />
            <SheetOption icon={LogOut} danger onPress={() => fromSheet(() => void signOut())}>
              {t("Déconnexion")}
            </SheetOption>
          </div>
        </BottomSheet>
      </div>
    </I18nProvider>
  );
}

/** Site logo on a dark band, like the public header, so the white-and-red logo keeps its colours. */
function Brand() {
  const text = useSiteText();
  const logo = text("identity.logo", "/images/aks-logo.png");
  return (
    <div className="dark relative flex h-16 shrink-0 items-center gap-3 bg-[oklch(0.17_0.004_286)] px-5 text-foreground">
      <img src={logo} alt="" width={96} height={32} className="h-8 w-auto shrink-0" />
      <div className="min-w-0">
        <p dir="ltr" className="truncate text-sm font-semibold">
          {text("identity.brand", "Auto Kontor")}{" "}
          <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
        </p>
        <p className="text-xs text-muted">{t("Administration")}</p>
      </div>
    </div>
  );
}

function SectionNav({
  section,
  sections,
  counts,
  onNavigate,
}: {
  /** Highlighted section; null on pages outside the sections ("Mon profil"). */
  section: AdminSection | null;
  sections: readonly AdminSection[];
  counts: Partial<Record<AdminSection, { value: number; label: string; highlight?: boolean }>>;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <nav aria-label={t("Sections de l’administration")}>
      <ul className="grid gap-1">
        {sections.map((id) => {
          const Icon = SECTION_ICONS[id];
          const active = id === section;
          const count = counts[id];
          return (
            <li key={id}>
              <Link
                to={SECTION_PATHS[id]}
                preload="intent"
                {...(onNavigate ? { onClick: onNavigate } : {})}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors lg:h-10 focus-visible:ring-2 focus-visible:ring-focus ${
                  active
                    ? "bg-surface-secondary text-foreground"
                    : "text-muted hover:bg-surface-secondary hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-accent" : ""}`} aria-hidden />
                <span className="flex-1 truncate">{t(SECTION_LABELS[id])}</span>
                {count && (
                  <span
                    className={`min-w-6 rounded-full px-2 text-center text-xs font-medium tabular-nums leading-5 ${
                      count.highlight ? "bg-accent text-accent-foreground" : "text-muted"
                    }`}
                  >
                    {count.value}
                    <span className="sr-only"> {t(count.label)}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
