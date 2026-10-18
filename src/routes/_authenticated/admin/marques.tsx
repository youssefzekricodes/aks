import { adminCarsQuery } from "@/features/admin/model";
import { brandLogosQuery, brandSettingsQuery } from "@/lib/queries";
import { createFileRoute } from "@tanstack/react-router";
import { BrandsTab } from "@/features/admin/BrandsTab";

export const Route = createFileRoute("/_authenticated/admin/marques")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
    void context.queryClient.prefetchQuery(brandLogosQuery);
    void context.queryClient.prefetchQuery(brandSettingsQuery);
  },
  head: () => ({ meta: [{ title: "Marques — Administration" }] }),
  component: BrandsTab,
});
