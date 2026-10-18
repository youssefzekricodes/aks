import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardTab } from "@/features/admin/DashboardTab";
import {
  isAdminSection,
  SECTION_PATHS,
  adminCarsQuery,
  dashboardStatsQuery,
  leadsQueryOptions,
} from "@/features/admin/model";

export const Route = createFileRoute("/_authenticated/admin/")({
  // Links from before the section routes (/admin?section=cars…) keep working.
  validateSearch: (search: Record<string, unknown>): { section?: string } =>
    typeof search["section"] === "string" ? { section: search["section"] } : {},
  beforeLoad: ({ search }) => {
    if (isAdminSection(search.section) && search.section !== "dashboard")
      throw redirect({ to: SECTION_PATHS[search.section], replace: true });
  },
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
    void context.queryClient.prefetchQuery(dashboardStatsQuery);
    void context.queryClient.prefetchQuery(leadsQueryOptions);
  },
  head: () => ({ meta: [{ title: "Tableau de bord — Administration" }] }),
  component: DashboardTab,
});
