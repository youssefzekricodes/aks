import { adminCarsQuery } from "@/features/admin/model";
import { createFileRoute } from "@tanstack/react-router";
import { CarsTab } from "@/features/admin/CarsTab";

export const Route = createFileRoute("/_authenticated/admin/vehicules")({
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Véhicules — Administration" }] }),
  component: CarsTab,
});
