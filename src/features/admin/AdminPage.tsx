import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, getRouteApi, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Dropdown, Header, Label, Separator, toast } from "@heroui/react";
import {
  Car,
  ChevronDown,
  LayoutDashboard,
  ExternalLink,
  FileText,
  Inbox,
  LogOut,
  Plug,
  Menu,
  ShieldCheck,
  Tags,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { signOut as clearSession } from "@/features/auth/auth.functions";
import { useSiteText } from "@/lib/site-content";
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
} from "./model";
import { IconButton } from "./ui";

const SECTION_ICONS: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  cars: Car,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  // The route guard already loaded the session; the query keeps it fresh after 2FA changes.
  const context = authenticatedRoute.useRouteContext();
  const session = useQuery({ ...sessionQuery, initialData: context.session });
  const isSuperAdmin = session.data?.role === "super_admin";
  const sections = ADMIN_SECTIONS.filter(
    (id) => isSuperAdmin || !SUPER_ADMIN_SECTIONS.includes(id),
  );
  const section = sectionAt(useLocation({ select: (location) => location.pathname }));

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
  const nav = (onNavigate?: () => void) => (
    <SectionNav section={section} sections={sections} counts={counts} onNavigate={onNavigate} />
  );

  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-separator bg-surface lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto px-4 py-4">{nav()}</div>
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

      <div className="flex min-w-0 flex-col">
        <header className="dark sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/10 bg-[oklch(0.17_0.004_286)] px-4 text-foreground sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <IconButton label="Ouvrir le menu" icon={Menu} onPress={() => setMenuOpen(true)} />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="hidden text-muted sm:inline">Administration / </span>
            <span className="font-semibold text-foreground">{SECTION_LABELS[section]}</span>
          </p>
          <Dropdown>
            <Button variant="ghost" size="sm" aria-label={`Compte ${email}`.trim()}>
              <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent"
              >
                {email.charAt(0) || "A"}
              </span>
              <span className="hidden max-w-56 truncate sm:inline">{email || "Compte"}</span>
              <ChevronDown className="size-4 text-muted" aria-hidden />
            </Button>
            <Dropdown.Popover placement="bottom end" className="min-w-60">
              <Dropdown.Menu
                aria-label="Compte"
                onAction={(key) => {
                  if (key === "logout") void signOut();
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
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>

      <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog className="w-72 max-w-[85vw]">
            <Brand inDrawer>
              <Drawer.CloseTrigger aria-label="Fermer le menu" />
            </Brand>
            <Drawer.Body className="grid content-start gap-4">
              {nav(() => setMenuOpen(false))}
              <Separator />
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
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}

/**
 * Site logo on a dark band, like the public header, so the white-and-red logo
 * keeps its colours. In the drawer the name is the dialog's heading.
 */
function Brand({ inDrawer = false, children }: { inDrawer?: boolean; children?: ReactNode }) {
  const text = useSiteText();
  const logo = text("identity.logo", "/images/aks-logo.png");
  const Title = inDrawer ? Drawer.Heading : "p";
  return (
    <div className="dark relative flex h-16 shrink-0 items-center gap-3 bg-[oklch(0.17_0.004_286)] px-5 text-foreground">
      <img src={logo} alt="" width={96} height={32} className="h-8 w-auto shrink-0" />
      <div className="min-w-0">
        <Title className="truncate text-sm font-semibold">
          {text("identity.brand", "Auto Kontor")}{" "}
          <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
        </Title>
        <p className="text-xs text-muted">Administration</p>
      </div>
      {children}
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
                className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
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
