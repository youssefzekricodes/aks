import { createFileRoute } from "@tanstack/react-router";
import { CarEditPage } from "@/features/admin/CarEditPage";
import { adminCarsQuery } from "@/features/admin/model";

/** Vehicle editor: /admin/vehicules/<id>, or /admin/vehicules/nouveau. `from` = where to go back. */
export const Route = createFileRoute("/_authenticated/admin/vehicules_/$carId")({
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search["from"] === "string" && /^(marque:[a-z0-9-]+|vitrine)$/.test(search["from"])
      ? { from: search["from"] }
      : {},
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Véhicule — Administration" }] }),
  component: function CarEditRoute() {
    const { carId } = Route.useParams();
    const { from } = Route.useSearch();
    return <CarEditPage carId={carId} from={from} />;
  },
});
