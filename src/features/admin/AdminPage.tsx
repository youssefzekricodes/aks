import { ContentEditor } from "@/features/content/ContentEditor";
import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Plus, Trash2, UploadCloud, LoaderCircle } from "lucide-react";
import { signOut as clearSession } from "@/features/auth/auth.functions";
import {
  CAR_BODIES,
  CAR_COUNTRIES,
  CAR_FUELS,
  CAR_GEARBOXES,
  CAR_STATES,
  carImage,
  type Car,
} from "@/lib/cars";
import {
  deleteCar,
  listAllCars,
  listLeads,
  saveCar,
  setCarPublished,
  setLeadHandled,
  readVehicleImageAsDataUrl,
  type CarInput,
} from "@/lib/data";

const emptyCar: CarInput = {
  slug: "",
  name: "",
  brand: "",
  country: "Germany",
  year: new Date().getFullYear(),
  price: 0,
  km: "0 km",
  km_value: 0,
  fuel: "Essence",
  gearbox: "Auto",
  body: "Berline",
  state: "Occasion",
  images: [],
  description: "",
  published: false,
  sort_order: 0,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const tabs = [
  { id: "cars", label: "Véhicules" },
  { id: "content", label: "Contenu du site" },
  { id: "leads", label: "Demandes" },
] as const;

export function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("cars");

  async function signOut() {
    try {
      await clearSession();
    } catch {
      toast.error("Déconnexion impossible. Veuillez réessayer.");
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voir le site
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Tableau de bord</h1>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "cars" && <CarsTab />}
          <div hidden={tab !== "content"}>
            <ContentEditor />
          </div>
          {tab === "leads" && <LeadsTab />}
        </div>
      </main>
    </div>
  );
}

function CarsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CarInput | null>(null);

  const cars = useQuery({ queryKey: ["admin-cars"], queryFn: () => listAllCars() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-cars"] });
    queryClient.invalidateQueries({ queryKey: ["public-cars"] });
  };

  const save = useMutation({
    mutationFn: (data: CarInput) => saveCar({ data }),
    onSuccess: () => {
      toast.success("Véhicule enregistré.");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (data: { id: string; published: boolean }) => setCarPublished({ data }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCar({ data: { id } }),
    onSuccess: () => {
      toast.success("Véhicule supprimé.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (editing) {
    return (
      <CarForm
        value={editing}
        onChange={setEditing}
        onCancel={() => setEditing(null)}
        onSave={() => save.mutate(editing)}
        saving={save.isPending}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing({ ...emptyCar })}
        className="btn-3d btn-3d-primary inline-flex items-center gap-2 px-6 py-3 text-sm"
      >
        <Plus className="h-4 w-4" />
        Ajouter un véhicule
      </button>

      <div className="mt-8 grid gap-4">
        {(cars.data ?? []).map((car) => (
          <div
            key={car.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <img src={carImage(car)} alt={car.name} className="h-16 w-24 rounded object-cover" />
            <div className="min-w-40 flex-1">
              <p className="font-semibold">
                {car.brand} {car.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {car.year} · {car.km} · {car.price.toLocaleString("fr-FR")} DT
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${car.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {car.published ? "Publié" : "Brouillon"}
            </span>
            <button
              type="button"
              onClick={() => publish.mutate({ id: car.id, published: !car.published })}
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary"
            >
              {car.published ? "Dépublier" : "Publier"}
            </button>
            <button
              type="button"
              onClick={() => setEditing({ ...(car as Car) })}
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Supprimer ${car.brand} ${car.name} ?`)) remove.mutate(car.id);
              }}
              className="rounded-md border border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {cars.data?.length === 0 && (
          <p className="text-muted-foreground">Aucun véhicule pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function CarForm({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  value: CarInput;
  onChange: (v: CarInput) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CarInput>(key: K, v: CarInput[K]) =>
    onChange({ ...value, [key]: v });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (value.images.length + files.length > 12) {
      toast.error("Maximum 12 photos par véhicule.");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await readVehicleImageAsDataUrl(file));
      }
      onChange({ ...value, images: [...value.images, ...urls] });
      toast.success("Photos ajoutées.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="grid gap-5 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Marque
          <input
            className={inputClass}
            value={value.brand}
            onChange={(e) => set("brand", e.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Modèle
          <input
            className={inputClass}
            value={value.name}
            onChange={(e) => {
              const name = e.target.value;
              onChange({ ...value, name, slug: value.slug || slugify(`${value.brand} ${name}`) });
            }}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Identifiant d'URL
          <input
            className={inputClass}
            value={value.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Prix (DT)
          <input
            type="number"
            className={inputClass}
            value={value.price}
            onChange={(e) => set("price", Number(e.target.value))}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Année
          <input
            type="number"
            className={inputClass}
            value={value.year}
            onChange={(e) => set("year", Number(e.target.value))}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Kilométrage (km)
          <input
            type="number"
            className={inputClass}
            value={value.km_value}
            onChange={(e) => {
              const km_value = Number(e.target.value);
              onChange({ ...value, km_value, km: `${km_value.toLocaleString("fr-FR")} km` });
            }}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Origine
          <select
            className={inputClass}
            value={value.country}
            onChange={(e) => set("country", e.target.value)}
          >
            {CAR_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Carrosserie
          <select
            className={inputClass}
            value={value.body}
            onChange={(e) => set("body", e.target.value)}
          >
            {CAR_BODIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Carburant
          <select
            className={inputClass}
            value={value.fuel}
            onChange={(e) => set("fuel", e.target.value)}
          >
            {CAR_FUELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Boîte
          <select
            className={inputClass}
            value={value.gearbox}
            onChange={(e) => set("gearbox", e.target.value)}
          >
            {CAR_GEARBOXES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          État
          <select
            className={inputClass}
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
          >
            {CAR_STATES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Ordre d'affichage
          <input
            type="number"
            className={inputClass}
            value={value.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value))}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Description
        <textarea
          rows={5}
          className={inputClass}
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Photos du véhicule</p>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {value.images.length} / 12 photos
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {value.images.map((img, i) => (
            <div key={img} className="relative">
              <img src={img} alt={`Photo ${i + 1}`} className="h-20 w-28 rounded object-cover" />
              <button
                type="button"
                aria-label="Retirer la photo"
                onClick={() =>
                  set(
                    "images",
                    value.images.filter((x) => x !== img),
                  )
                }
                className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={async (e) => {
            const input = e.currentTarget;
            await handleFiles(input.files);
            input.value = "";
          }}
          disabled={uploading || saving || value.images.length >= 12}
          className="hidden"
          aria-label="Choisir les photos du véhicule"
        />
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          disabled={uploading || saving || value.images.length >= 12}
          aria-busy={uploading}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-8 w-8 text-primary" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold">
            {uploading
              ? "Ajout des photos…"
              : value.images.length >= 12
                ? "Limite de 12 photos atteinte"
                : "Cliquez ici pour ajouter des photos"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG ou WebP · 2 Mo maximum par photo · Recadrage automatique au format 4:3
          </span>
        </button>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={value.published}
          onChange={(e) => set("published", e.target.checked)}
        />
        Publier sur le site
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="btn-3d btn-3d-primary px-6 py-3 text-sm"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-6 py-3 text-sm font-semibold"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function LeadsTab() {
  const queryClient = useQueryClient();
  const leads = useQuery({ queryKey: ["admin-leads"], queryFn: () => listLeads() });
  const handled = useMutation({
    mutationFn: (data: { id: string; handled: boolean }) => setLeadHandled({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (leads.data?.length === 0)
    return <p className="text-muted-foreground">Aucune demande reçue pour l'instant.</p>;

  return (
    <div className="grid gap-4">
      {(leads.data ?? []).map((lead) => (
        <div key={lead.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{lead.name}</p>
            <button
              type="button"
              onClick={() => handled.mutate({ id: lead.id, handled: !lead.handled })}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-primary"
            >
              {lead.handled ? "Marquer à traiter" : "Marquer traitée"}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {lead.phone} {lead.email && `· ${lead.email}`} ·{" "}
            {new Date(lead.created_at).toLocaleString("fr-FR")}
          </p>
          {lead.car_slug && <p className="mt-1 text-sm text-primary">Véhicule : {lead.car_slug}</p>}
          {lead.message && <p className="mt-3 whitespace-pre-line text-sm">{lead.message}</p>}
        </div>
      ))}
    </div>
  );
}
