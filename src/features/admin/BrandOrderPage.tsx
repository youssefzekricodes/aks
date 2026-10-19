import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Car as CarIcon } from "@/components/icons";
import { BrandLogo } from "@/components/aks/BrandLogo";
import { brandInfo } from "@/features/catalog/brands";
import { adminCarsQuery, plural } from "./model";
import { SortableCarsSkeleton } from "./skeletons";
import { SortableCarGrid, useReorderWithin } from "./SortableCarGrid";
import { AdminBreadcrumbs, EmptyState, LoadError, PageHeader } from "./ui";

/**
 * One brand's vehicles as cards like on the site: drag to set their display order
 * (they swap places among themselves; other brands keep theirs), click to edit.
 */
export function BrandOrderPage({ brand }: { brand: string }) {
  const cars = useQuery(adminCarsQuery);
  const navigate = useNavigate();
  const reorderWithin = useReorderWithin();

  const all = cars.data ?? [];
  const mine = all.filter((car) => brandInfo(car.brand).slug === brand);
  const name = mine[0]?.brand ?? brandInfo(brand).name;
  const live = mine.filter((car) => car.published && !car.sold).length;

  return (
    <div className="grid gap-6">
      <AdminBreadcrumbs items={[{ label: "Véhicules", to: "/admin/vehicules" }, { label: name }]} />
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <BrandLogo brand={name} wordmark={false} size={28} />
            Véhicules {name}
          </span>
        }
        description={
          cars.data
            ? `${plural(mine.length, "véhicule", "véhicules")} · ${plural(live, "en vente", "en vente")}. Glissez les cartes pour l’ordre d’affichage sur le site ; cliquez pour modifier.`
            : undefined
        }
      />

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <SortableCarsSkeleton />
      ) : mine.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title={`Aucun véhicule ${name}.`}
          description="Les véhicules de cette marque apparaîtront ici."
        />
      ) : (
        <SortableCarGrid
          cars={mine}
          onReorder={(ids) => reorderWithin(all, ids)}
          onEdit={(car) =>
            void navigate({
              to: "/admin/vehicules/$carId",
              params: { carId: car.id },
              search: { from: `marque:${brand}` },
            })
          }
        />
      )}
    </div>
  );
}
