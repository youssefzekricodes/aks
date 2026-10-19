import { createFileRoute } from "@tanstack/react-router";
import { BrandOrderPage } from "@/features/admin/BrandOrderPage";
import { adminCarsQuery } from "@/features/admin/model";

/** Display order of one brand's vehicles (opened from the brand in the vehicle list). */
export const Route = createFileRoute("/_authenticated/admin/vehicules_/marque/$brand")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Ordre des véhicules — Administration" }] }),
  component: function BrandOrderRoute() {
    const { brand } = Route.useParams();
    return <BrandOrderPage brand={brand} />;
  },
});
