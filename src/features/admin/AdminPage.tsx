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
  ImagePlus,
  FileText,
  Inbox,
  LogOut,
  Plug,
  ShieldCheck,
  RefreshCw,
  Store,
  Tags,
  UserCog,
  type LucideIcon,
} from "@/components/icons";
import { signOut as clearSession } from "@/features/auth/auth.functions";
import { useSiteText } from "@/lib/site-content";
import { brandInfo } from "@/features/catalog/brands";
import {
  ADMIN_SECTIONS,
  ROLE_LABELS,
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
import { AvatarDialog } from "./AvatarDialog";
import { AdminAvatar } from "./ui";

const SECTION_ICONS: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  cars: Car,
  showcase: Store,
  facebook: RefreshCw,
  brands: Tags,
  content: FileText,
  leads: Inbox,
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
function parentOf(pathname: string, from: unknown): { href: string; label: string } | null {
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
function pageTitle(pathname: string, section: AdminSection) {
  if (/^\/admin\/vehicules\/marque\//.test(pathname)) return "Ordre des véhicules";
  if (/^\/admin\/vehicules\/[^/]+\/?$/.test(pathname)) return "Fiche véhicule";
  return SECTION_LABELS[section];
}

const homeDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** A swipe that starts this close to the left edge (px) and goes this far goes back. */
const EDGE = 28;
const SWIPE_BACK = 90;

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
  const { pathname, from } = useLocation({
    select: (location) => ({
      pathname: location.pathname,
      from: (location.search as Record<string, unknown>)["from"],
    }),
  });
  const section = sectionAt(pathname);
  const parent = parentOf(pathname, from);

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

  // Back: to the previous page when that is the parent (keeps the history tidy),
  // otherwise straight to the parent.
  const previous = useRef<string | null>(null);
  const current = useRef(pathname);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [avatarOpen, setAvatarOpen] = useState(false);
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
    el.style.transform = dx ? `translateX(${dx}px)` : "";
    el.style.boxShadow = dx ? "-12px 0 24px rgb(0 0 0 / 0.12)" : "";
  };
  const touch = {
    onTouchStart: (event: React.TouchEvent) => {
      const t = event.touches[0];
      if (!parent || !t || window.innerWidth >= 1024 || t.clientX > EDGE) return;
      swipe.current = { x: t.clientX, y: t.clientY, dx: 0, active: false };
    },
    onTouchMove: (event: React.TouchEvent) => {
      const s = swipe.current;
      const t = event.touches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
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
    try {
      await clearSession();
    } catch {
      toast.danger("Déconnexion impossible. Veuillez réessayer.");
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    void navigate({ to: "/auth", replace: true });
  }

  const email = session.data?.email ?? "";

  const avatarUrl = session.data?.avatarUrl ?? null;
  /** Account button and menu; `large`: the bigger photo of the phone home screen. */
  const accountMenu = (large = false) => (
    <Dropdown>
      <Button
        variant="ghost"
        size={large ? "md" : "sm"}
        className={large ? "h-auto rounded-full p-0.5" : ""}
        aria-label={`Compte ${email}`.trim()}
      >
        <AdminAvatar
          email={email}
          url={avatarUrl}
          className={
            large
              ? "size-12 text-lg ring-[3px] ring-surface shadow-[0_4px_12px_-4px_rgb(15_23_42/0.25)]"
              : "size-7 text-xs"
          }
        />
        <span className="hidden max-w-56 truncate lg:inline">{email || "Compte"}</span>
        <ChevronDown className="size-4 text-muted max-lg:hidden" aria-hidden />
      </Button>
      <Dropdown.Popover placement="bottom end" className="min-w-60">
        <Dropdown.Menu
          aria-label="Compte"
          onAction={(key) => {
            if (key === "logout") void signOut();
            if (key === "avatar") setAvatarOpen(true);
            if (key === "security")
              void navigate({ to: "/admin/administrateurs", hash: "ma-securite" });
          }}
        >
          <Dropdown.Section>
            <Header>
              <span className="block text-xs text-muted">Connecté en tant que</span>
              <span className="block truncate text-sm text-foreground">
                {email || "Administrateur"}
              </span>
              {session.data && (
                <span className="mt-0.5 block text-xs text-muted">
                  {ROLE_LABELS[session.data.role]}
                </span>
              )}
            </Header>
            <Dropdown.Item id="avatar" textValue="Ma photo">
              <ImagePlus className="size-4 shrink-0 text-muted" aria-hidden />
              <Label>{avatarUrl ? "Changer ma photo" : "Ajouter ma photo"}</Label>
            </Dropdown.Item>
            {isSuperAdmin ? (
              <Dropdown.Item id="security" textValue="Ma sécurité">
                <ShieldCheck className="size-4 shrink-0 text-muted" aria-hidden />
                <Label>Ma sécurité</Label>
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item id="site" textValue="Voir le site" href="/" target="_blank">
              <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
              <Label>Voir le site</Label>
            </Dropdown.Item>
          </Dropdown.Section>
          <Separator />
          <Dropdown.Item id="logout" textValue="Déconnexion" variant="danger">
            <LogOut className="size-4 shrink-0 text-danger" aria-hidden />
            <Label>Déconnexion</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  return (
    <div className="admin-app min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      <aside className="vt-sidebar sticky top-0 hidden h-dvh flex-col border-r border-separator bg-surface lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SectionNav section={section} sections={sections} counts={counts} />
        </div>
        <div className="border-t border-separator p-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ExternalLink className="size-4" aria-hidden />
            Voir le site
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col overflow-x-clip">
        {/* Computer top bar (unchanged). */}
        <header className="vt-header dark sticky top-0 z-30 hidden border-b border-white/10 bg-[oklch(0.17_0.004_286)] text-foreground lg:block">
          <div className="flex h-16 items-center gap-2 px-8">
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="text-muted">Administration / </span>
              <span className="font-semibold text-foreground">{SECTION_LABELS[section]}</span>
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
                aria-label={`Retour : ${parent.label}`}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.08)] outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-base font-semibold text-foreground">
                {pageTitle(pathname, section)}
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
                  {homeDate.format(new Date())}
                </p>
                <h1 className="mt-0.5 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                  Bonjour !
                </h1>
              </div>
              {accountMenu(true)}
            </div>
          </div>
        )}
        <div ref={page} {...touch} onTouchCancel={touch.onTouchEnd} className="flex-1">
          <main
            id="admin-main"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            {/* Phones: each page slides in (from the left when going back). */}
            <div
              key={pathname}
              className={`max-lg:animate-in max-lg:fade-in-0 max-lg:duration-300 ${
                direction === "back"
                  ? "max-lg:slide-in-from-left-8"
                  : "max-lg:slide-in-from-right-8"
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      <AvatarDialog
        email={email}
        url={avatarUrl}
        isOpen={avatarOpen}
        onOpenChange={setAvatarOpen}
      />
    </div>
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
        <p className="truncate text-sm font-semibold">
          {text("identity.brand", "Auto Kontor")}{" "}
          <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
        </p>
        <p className="text-xs text-muted">Administration</p>
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
  section: AdminSection;
  sections: readonly AdminSection[];
  counts: Partial<Record<AdminSection, { value: number; label: string; highlight?: boolean }>>;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <nav aria-label="Sections de l’administration">
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
                <span className="flex-1 truncate">{SECTION_LABELS[id]}</span>
                {count && (
                  <span
                    className={`min-w-6 rounded-full px-2 text-center text-xs font-medium tabular-nums leading-5 ${
                      count.highlight ? "bg-accent text-accent-foreground" : "text-muted"
                    }`}
                  >
                    {count.value}
                    <span className="sr-only"> {count.label}</span>
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
