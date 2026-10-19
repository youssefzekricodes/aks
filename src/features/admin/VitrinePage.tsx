import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, Label, Modal, SearchField, toast } from "@heroui/react";
import { Plus, Store, Trash2 } from "@/components/icons";
import { carImage, formatKm } from "@/lib/cars";
import { setVitrine } from "@/lib/data";
import { adminCarsQuery, adminCarsQueryKey, normalize, plural, type AdminCar } from "./model";
import { SortableCarGrid } from "./SortableCarGrid";
import { EmptyState, IconButton, LoadError, PageHeader } from "./ui";

/** Vehicles the home page shows at most (see Inventory). */
const HOME_LIMIT = 12;

/** "En vente": published and not sold — the only vehicles the showcase shows. */
export const onSale = (car: AdminCar) => car.published && !car.sold;

const inShowcase = (cars: AdminCar[]) =>
  cars
    .filter((car) => car.featured_rank != null)
    .sort((a, b) => a.featured_rank! - b.featured_rank!);

/** Saves the showcase (ids in order), updating the list at once. */
export function useVitrine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => setVitrine({ data: { ids } }),
    onMutate: async (ids) => {
      // New order applied in the same frame as the drop (no jump back), then
      // pending refetches cancelled so they cannot bring the old order back.
      const previous = queryClient.getQueryData<AdminCar[]>(adminCarsQueryKey);
      const rank = new Map(ids.map((id, index) => [id, index]));
      queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) =>
        list?.map((car) => ({ ...car, featured_rank: rank.get(car.id) ?? null })),
      );
      await queryClient.cancelQueries({ queryKey: adminCarsQueryKey });
      return { previous };
    },
    onError: (e: Error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(adminCarsQueryKey, context.previous);
      toast.danger(e.message);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
      ]),
  });
}

/** Ids of the showcase with these vehicles added at the end (or removed). */
export function showcaseWith(cars: AdminCar[], add: string[], remove: string[] = []) {
  const current = inShowcase(cars).map((car) => car.id);
  return [
    ...current.filter((id) => !remove.includes(id)),
    ...add.filter((id) => !current.includes(id)),
  ];
}

export function VitrinePage() {
  const cars = useQuery(adminCarsQuery);
  const navigate = useNavigate();
  const vitrine = useVitrine();
  const [picking, setPicking] = useState(false);

  const all = cars.data ?? [];
  // Only vehicles en vente are shown and ordered here. Featured ones that were
  // unpublished or sold keep their place (at the end) and come back if put on sale again.
  const featured = inShowcase(all);
  const showcase = featured.filter(onSale);
  const parked = featured.filter((car) => !onSale(car)).map((car) => car.id);
  const edit = (car: AdminCar) =>
    void navigate({
      to: "/admin/vehicules/$carId",
      params: { carId: car.id },
      search: { from: "vitrine" },
    });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Vitrine"
        description="Les véhicules mis en avant sur la page d’accueil, dans l’ordre où les visiteurs les voient."
        actions={
          <Button onPress={() => setPicking(true)}>
            <Plus className="size-4" aria-hidden />
            Ajouter à la vitrine
          </Button>
        }
      />

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <section className="grid gap-4">
          <p className="text-sm text-muted">
            {showcase.length
              ? `Ces véhicules s’affichent sur l’accueil dans cet ordre (${HOME_LIMIT} au maximum). Glissez les cartes pour changer l’ordre, cliquez pour modifier un véhicule.`
              : `Vitrine vide : l’accueil montre les 6 premiers véhicules de l’ordre du site.`}
          </p>
          {showcase.length > HOME_LIMIT && (
            <p className="text-sm text-warning">
              Seuls les {HOME_LIMIT} premiers véhicules visibles sont affichés sur l’accueil.
            </p>
          )}
          {showcase.length ? (
            <SortableCarGrid
              cars={showcase}
              onReorder={(ids) => vitrine.mutate([...ids, ...parked])}
              onEdit={edit}
              actions={(car) => (
                <IconButton
                  label={`Retirer ${car.brand} ${car.name} de la vitrine`}
                  icon={Trash2}
                  variant="danger-soft"
                  onPress={() => vitrine.mutate(showcaseWith(all, [], [car.id]))}
                />
              )}
            />
          ) : (
            <EmptyState
              icon={Store}
              title="Aucun véhicule en vitrine."
              description="Choisissez les véhicules à mettre en avant sur l’accueil."
              action={
                <Button size="sm" onPress={() => setPicking(true)}>
                  <Plus className="size-4" aria-hidden />
                  Ajouter à la vitrine
                </Button>
              }
            />
          )}
        </section>
      )}

      <ShowcasePicker
        isOpen={picking}
        onOpenChange={setPicking}
        cars={all.filter((car) => car.featured_rank == null && onSale(car))}
        onAdd={(ids) =>
          vitrine
            .mutateAsync(showcaseWith(all, ids))
            .then(() =>
              toast.success(
                `${plural(ids.length, "véhicule ajouté", "véhicules ajoutés")} à la vitrine.`,
              ),
            )
        }
      />
    </div>
  );
}

/** Choose vehicles en vente to add to the showcase. */
function ShowcasePicker({
  isOpen,
  onOpenChange,
  cars,
  onAdd,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cars: AdminCar[];
  onAdd: (ids: string[]) => Promise<unknown>;
}) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState(false);
  const query = normalize(search.trim());
  const list = cars.filter(
    (car) => !query || normalize(`${car.brand} ${car.name} ${car.year}`).includes(query),
  );
  const close = () => {
    onOpenChange(false);
    setChosen(new Set());
    setSearch("");
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && !pending && close()}>
      <Modal.Container placement="auto" scroll="inside">
        <Modal.Dialog className="sm:max-w-2xl">
          <Modal.CloseTrigger aria-label="Fermer" />
          <Modal.Header>
            <Modal.Heading>Ajouter à la vitrine</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              Les véhicules choisis s’ajoutent à la fin de la vitrine.
            </p>
          </Modal.Header>
          <Modal.Body className="grid gap-3">
            <SearchField value={search} onChange={setSearch} fullWidth>
              <Label className="sr-only">Rechercher</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Marque, modèle, année…" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ul className="grid gap-1">
              {list.map((car) => (
                <li key={car.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-secondary">
                    <input
                      type="checkbox"
                      checked={chosen.has(car.id)}
                      onChange={() =>
                        setChosen((current) => {
                          const next = new Set(current);
                          if (!next.delete(car.id)) next.add(car.id);
                          return next;
                        })
                      }
                      className="size-4 accent-[var(--accent)]"
                    />
                    <img
                      src={carImage(car)}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-14 shrink-0 rounded-lg bg-surface-secondary object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {car.brand} {car.name}
                      </span>
                      <span className="text-sm text-muted">
                        {car.year > 1900 ? car.year : "Année ?"} · {formatKm(car.km_value)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!list.length && (
                <li className="py-6 text-center text-sm text-muted">
                  Aucun véhicule en vente à ajouter. Publiez des véhicules depuis la liste
                  Véhicules.
                </li>
              )}
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <span className="me-auto text-sm text-muted">
              {plural(chosen.size, "sélectionné", "sélectionnés")}
            </span>
            <Button variant="tertiary" isDisabled={pending} onPress={close}>
              Annuler
            </Button>
            <Button
              isPending={pending}
              isDisabled={!chosen.size}
              onPress={async () => {
                setPending(true);
                try {
                  await onAdd([...chosen]);
                  close();
                } catch {
                  // Reported by the mutation (toast).
                } finally {
                  setPending(false);
                }
              }}
            >
              Ajouter
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
