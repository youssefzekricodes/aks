import { createFileRoute } from "@tanstack/react-router";
import { DashboardTab } from "@/features/admin/DashboardTab";
import { MobileDashboard } from "@/features/admin/MobileDashboard";
import { adminCarsQuery, dashboardStatsQuery, leadsQueryOptions } from "@/features/admin/model";

/** Statistics page of the phone app (opened from the home screen). Computers show the same data. */
export const Route = createFileRoute("/_authenticated/admin/tableau-de-bord")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
    void context.queryClient.prefetchQuery(dashboardStatsQuery);
    void context.queryClient.prefetchQuery(leadsQueryOptions);
  },
  head: () => ({ meta: [{ title: "Tableau de bord — Administration" }] }),
  component: () => (
    <>
      <div className="lg:hidden">
        <MobileDashboard />
      </div>
      <div className="hidden lg:block">
        <DashboardTab />
      </div>
    </>
  ),
});
