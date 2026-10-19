import { createFileRoute } from "@tanstack/react-router";
import { adminCarsQuery } from "@/features/admin/model";
import { VitrinePage } from "@/features/admin/VitrinePage";

export const Route = createFileRoute("/_authenticated/admin/vitrine")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Vitrine — Administration" }] }),
  component: VitrinePage,
});
