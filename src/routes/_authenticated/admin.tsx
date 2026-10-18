import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/features/admin/AdminPage";
import { isAdminSection, type AdminSection } from "@/features/admin/model";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (search: Record<string, unknown>): { section?: AdminSection } =>
    isAdminSection(search["section"]) ? { section: search["section"] } : {},
  head: () => ({
    meta: [
      { title: "Tableau de bord — Auto Kontor Sfax" },
      { name: "description", content: "Espace d'administration du site Auto Kontor Sfax." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { section = "dashboard" } = Route.useSearch();
  return <AdminPage section={section} />;
}
