import { CAR_FILTERS, adminCarsQuery, type CarFilter } from "@/features/admin/model";
import { createFileRoute } from "@tanstack/react-router";
import { CarsTab } from "@/features/admin/CarsTab";

export const Route = createFileRoute("/_authenticated/admin/vehicules")({
  // Optional starting filter, e.g. "À compléter" from the dashboard's to-do list.
  validateSearch: (search: Record<string, unknown>): { filtre?: CarFilter } =>
    CAR_FILTERS.includes(search["filtre"] as CarFilter)
      ? { filtre: search["filtre"] as CarFilter }
      : {},
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Véhicules — Administration" }] }),
  component: CarsTab,
});
