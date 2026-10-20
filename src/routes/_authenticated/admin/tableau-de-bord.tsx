import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/admin/Dashboard";
import { adminCarsQuery, dashboardStatsQuery, leadsQueryOptions } from "@/features/admin/model";

/** Statistics page of the phone app (opened from the home screen). Computers show the same data. */
export const Route = createFileRoute("/_authenticated/admin/tableau-de-bord")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
    void context.queryClient.prefetchQuery(dashboardStatsQuery);
    void context.queryClient.prefetchQuery(leadsQueryOptions);
  },
  head: () => ({ meta: [{ title: "Tableau de bord — Administration" }] }),
  component: Dashboard,
});
