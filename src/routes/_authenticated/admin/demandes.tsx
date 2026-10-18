import { leadsQueryOptions } from "@/features/admin/model";
import { createFileRoute } from "@tanstack/react-router";
import { LeadsTab } from "@/features/admin/LeadsTab";

export const Route = createFileRoute("/_authenticated/admin/demandes")({
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(leadsQueryOptions);
  },
  head: () => ({ meta: [{ title: "Demandes — Administration" }] }),
  component: LeadsTab,
});
