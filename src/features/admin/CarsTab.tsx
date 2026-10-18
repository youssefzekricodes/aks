import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Label, SearchField, Spinner, Table, toast } from "@heroui/react";
import { Car as CarIcon, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { carImage, formatKm, formatPrice } from "@/lib/cars";
import { deleteCar, saveCar, setCarPublished, type CarInput } from "@/lib/data";
import { CarForm } from "./CarForm";
import { useDialogTarget } from "./hooks";
import {
  adminCarsQuery,
  adminCarsQueryKey,
  dateFormat,
  emptyCar,
  normalize,
  plural,
  toDraft,
  toPayload,
  type AdminCar,
} from "./model";
import {
  ConfirmDialog,
  EmptyState,
  LoadError,
  PageHeader,
  RowMenu,
  SelectField,
  StatusChip,
  TableSkeleton,
  Toolbar,
} from "./ui";

type Status = "all" | "published" | "draft";
const STATUS_OPTIONS = [
  { id: "all", label: "Tous" },
  { id: "published", label: "Publiés" },
  { id: "draft", label: "Brouillons" },
];

type Sort = "order" | "updated" | "price-asc" | "price-desc" | "year" | "name";
const SORT_OPTIONS = [
  { id: "order", label: "Ordre d’affichage" },
  { id: "updated", label: "Dernière mise à jour" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "year", label: "Année (récente d’abord)" },
  { id: "name", label: "Marque et modèle (A–Z)" },
];

const COLUMNS = ["Photo", "Véhicule", "Prix", "Statut", "Mise à jour", ""];
const titleOf = (car: Pick<AdminCar, "brand" | "name">) => `${car.brand} ${car.name}`.trim();

function sortCars(cars: AdminCar[], sort: Sort) {
  if (sort === "order") return cars;
  const sorted = [...cars];
  const price = (car: AdminCar) => (car.price_on_request ? null : car.price);
  sorted.sort((a, b) => {
    switch (sort) {
      case "updated":
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      case "price-asc":
      case "price-desc": {
        const pa = price(a);
        const pb = price(b);
        // Hidden prices always come last.
        if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
        return sort === "price-asc" ? pa - pb : pb - pa;
      }
      case "year":
        return b.year - a.year;
      case "name":
        return titleOf(a).localeCompare(titleOf(b), "fr");
    }
  });
  return sorted;
}

type Editing = { draft: CarInput; original: string };

export function CarsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("order");
  const [publishing, setPublishing] = useState<ReadonlySet<string>>(new Set());
  const deletion = useDialogTarget<AdminCar>();

  const cars = useQuery(adminCarsQuery);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
    ]);

  const save = useMutation({
    mutationFn: (data: CarInput) => saveCar({ data: toPayload(data) }),
    onSuccess: () => {
      toast.success("Véhicule enregistré.");
      setEditing(null);
      return invalidate();
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const publish = useMutation({
    mutationFn: (data: { id: string; published: boolean }) => setCarPublished({ data }),
    onMutate: async ({ id, published }) => {
      setPublishing((current) => new Set(current).add(id));
      await queryClient.cancelQueries({ queryKey: adminCarsQueryKey });
      const previous = queryClient.getQueryData<AdminCar[]>(adminCarsQueryKey);
      queryClient.setQueryData<AdminCar[]>(adminCarsQueryKey, (list) =>
        list?.map((car) => (car.id === id ? { ...car, published } : car)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(adminCarsQueryKey, context.previous);
      toast.danger(e.message);
    },
    onSuccess: (_, { published }) =>
      toast.success(published ? "Véhicule publié sur le site." : "Véhicule retiré du site."),
    onSettled: (_data, _error, { id }) => {
      setPublishing((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCar({ data: { id } }),
    onSuccess: () => {
      toast.success("Véhicule supprimé.");
      return invalidate();
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const open = (car: CarInput) => {
    const draft = toDraft(car);
    setEditing({ draft, original: JSON.stringify(draft) });
  };

  if (editing) {
    return (
      <CarForm
        value={editing.draft}
        isDirty={JSON.stringify(editing.draft) !== editing.original}
        onChange={(update) =>
          setEditing((current) => current && { ...current, draft: update(current.draft) })
        }
        onCancel={() => setEditing(null)}
        onSave={() => save.mutate(editing.draft)}
        saving={save.isPending}
      />
    );
  }

  const all = cars.data ?? [];
  const query = normalize(search.trim());
  const filtered = all.filter(
    (car) =>
      (status === "all" || car.published === (status === "published")) &&
      (!query ||
        normalize(`${car.brand} ${car.name} ${car.model ?? ""} ${car.version ?? ""}`).includes(
          query,
        )),
  );
  const visible = sortCars(filtered, sort);
  const published = all.filter((car) => car.published).length;
  const filtersActive = query !== "" || status !== "all";

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Véhicules"
        description={
          cars.data
            ? `${plural(all.length, "véhicule", "véhicules")} · ${plural(published, "publié", "publiés")}`
            : "Gérez le stock affiché sur le site."
        }
        actions={
          <Button onPress={() => open(emptyCar)}>
            <Plus className="size-4" aria-hidden />
            Ajouter un véhicule
          </Button>
        }
      />

      <Toolbar label="Filtrer les véhicules">
        <SearchField
          value={search}
          onChange={setSearch}
          className="min-w-0 flex-1 basis-64"
          fullWidth
        >
          <Label>Rechercher</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Marque, modèle ou version…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <SelectField
          label="Statut"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setStatus(value as Status)}
          className="w-full sm:w-44"
        />
        <SelectField
          label="Trier par"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => setSort(value as Sort)}
          className="w-full sm:w-60"
        />
      </Toolbar>

      {cars.isError ? (
        <LoadError message="Impossible de charger les véhicules." onRetry={() => cars.refetch()} />
      ) : cars.isPending ? (
        <TableSkeleton label="Véhicules" columns={COLUMNS} minWidth="min-w-[760px]" />
      ) : (
        <>
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Véhicules" className="min-w-[760px]">
                <Table.Header>
                  <Table.Column className="w-24">Photo</Table.Column>
                  <Table.Column isRowHeader>Véhicule</Table.Column>
                  <Table.Column>Prix</Table.Column>
                  <Table.Column>Statut</Table.Column>
                  <Table.Column>Mise à jour</Table.Column>
                  <Table.Column className="w-14">
                    <span className="sr-only">Actions</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() =>
                    all.length ? (
                      <EmptyState
                        icon={CarIcon}
                        title="Aucun véhicule ne correspond."
                        description="Modifiez la recherche ou le filtre de statut."
                        action={
                          filtersActive && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onPress={() => {
                                setSearch("");
                                setStatus("all");
                              }}
                            >
                              Réinitialiser les filtres
                            </Button>
                          )
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={CarIcon}
                        title="Aucun véhicule pour le moment."
                        description="Ajoutez votre premier véhicule pour l’afficher sur le site."
                        action={
                          <Button size="sm" onPress={() => open(emptyCar)}>
                            <Plus className="size-4" aria-hidden />
                            Ajouter un véhicule
                          </Button>
                        }
                      />
                    )
                  }
                >
                  {visible.map((car) => (
                    <CarRow
                      key={car.id}
                      car={car}
                      publishing={publishing.has(car.id)}
                      onEdit={() => open(car)}
                      onTogglePublished={() =>
                        publish.mutate({ id: car.id, published: !car.published })
                      }
                      onDelete={() => deletion.open(car)}
                    />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          {visible.length > 0 && filtersActive && (
            <p className="text-sm text-muted" aria-live="polite">
              {plural(visible.length, "véhicule affiché", "véhicules affichés")} sur {all.length}
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deletion.isOpen}
        onOpenChange={deletion.onOpenChange}
        title="Supprimer ce véhicule ?"
        confirmLabel="Supprimer"
        onConfirm={() => deletion.target && remove.mutateAsync(deletion.target.id)}
      >
        <p>
          <strong>{deletion.target ? titleOf(deletion.target) : ""}</strong> et ses photos seront
          définitivement supprimés. Cette action est irréversible.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function CarRow({
  car,
  publishing,
  onEdit,
  onTogglePublished,
  onDelete,
}: {
  car: AdminCar;
  publishing: boolean;
  onEdit: () => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  const title = titleOf(car);
  return (
    <Table.Row id={car.id}>
      <Table.Cell>
        <img
          src={carImage(car)}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-16 rounded-lg border border-separator bg-surface-secondary object-cover"
        />
      </Table.Cell>
      <Table.Cell>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-sm text-start font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          {title}
        </button>
        <p className="text-sm text-muted">
          {car.year} · {formatKm(car.km_value)}
        </p>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm">
        {car.price_on_request ? (
          <span className="text-muted">Prix masqué</span>
        ) : (
          formatPrice(car.price)
        )}
      </Table.Cell>
      <Table.Cell>
        <span className="inline-flex items-center gap-2">
          <StatusChip tone={car.published ? "success" : "default"}>
            {car.published ? "Publié" : "Brouillon"}
          </StatusChip>
          {publishing && <Spinner size="sm" aria-label="Mise à jour du statut" />}
        </span>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-sm text-muted">
        {car.updated_at ? dateFormat.format(new Date(car.updated_at)) : "—"}
      </Table.Cell>
      <Table.Cell className="text-end">
        <RowMenu
          label={`Actions pour ${title}`}
          actions={[
            { id: "edit", label: "Modifier", icon: Pencil, onAction: onEdit },
            car.published && {
              id: "view",
              label: "Voir sur le site",
              icon: ExternalLink,
              href: `/vehicule/${car.slug}`,
              external: true,
            },
            {
              id: "publish",
              label: car.published ? "Dépublier" : "Publier",
              icon: car.published ? EyeOff : Eye,
              onAction: onTogglePublished,
            },
            { id: "delete", label: "Supprimer", icon: Trash2, onAction: onDelete, danger: true },
          ]}
        />
      </Table.Cell>
    </Table.Row>
  );
}
