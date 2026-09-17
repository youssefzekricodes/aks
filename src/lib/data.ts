/**
 * Frontend-only data layer.
 *
 * There is no backend: cars, site texts and leads live in the browser's
 * localStorage, seeded with demo content. Everything is async so the existing
 * React Query calls keep working unchanged.
 */
import type { Car } from "./cars";
import { DEMO_CARS, DEMO_SITE_CONTENT } from "./demo-data";

export type CarInput = Omit<Car, "id"> & { id?: string };

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  car_slug: string | null;
  handled: boolean;
  created_at: string;
};

type Store = {
  cars: Car[];
  siteContent: { key: string; label: string; value: string }[];
  leads: Lead[];
};

const STORAGE_KEY = "aks-local-store-v1";

function seed(): Store {
  return {
    cars: DEMO_CARS.map((c) => ({ ...c })),
    siteContent: DEMO_SITE_CONTENT.map((c) => ({ ...c })),
    leads: [],
  };
}

function read(): Store {
  if (typeof localStorage === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      cars: parsed.cars ?? seed().cars,
      siteContent: parsed.siteContent ?? seed().siteContent,
      leads: parsed.leads ?? [],
    };
  } catch {
    return seed();
  }
}

function write(store: Store) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded (large photos) — ignore, data stays for this session only.
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortCars(cars: Car[]) {
  return [...cars].sort((a, b) => a.sort_order - b.sort_order);
}

/* ---------------------------------- public --------------------------------- */

export async function listPublicCars(): Promise<Car[]> {
  return sortCars(read().cars.filter((c) => c.published));
}

export async function getPublicCar(slug: string): Promise<Car | null> {
  return read().cars.find((c) => c.slug === slug && c.published) ?? null;
}

export async function listPublicSiteContent(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const row of read().siteContent) map[row.key] = row.value;
  return map;
}

export async function createLead(input: {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  car_slug?: string;
}) {
  const store = read();
  store.leads.unshift({
    id: uid(),
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    message: input.message ?? null,
    car_slug: input.car_slug ?? null,
    handled: false,
    created_at: new Date().toISOString(),
  });
  write(store);
  return { ok: true };
}

/* ---------------------------------- admin ---------------------------------- */

export async function adminStatus() {
  return { isAdmin: true, adminExists: true };
}

export async function listAllCars(): Promise<Car[]> {
  return sortCars(read().cars);
}

export async function saveCar({ data }: { data: CarInput }) {
  const store = read();
  if (data.id) {
    store.cars = store.cars.map((c) => (c.id === data.id ? ({ ...c, ...data } as Car) : c));
    write(store);
    return { id: data.id };
  }
  const id = uid();
  store.cars.push({ ...(data as Omit<Car, "id">), id });
  write(store);
  return { id };
}

export async function setCarPublished({ data }: { data: { id: string; published: boolean } }) {
  const store = read();
  store.cars = store.cars.map((c) => (c.id === data.id ? { ...c, published: data.published } : c));
  write(store);
  return { ok: true };
}

export async function deleteCar({ data }: { data: { id: string } }) {
  const store = read();
  store.cars = store.cars.filter((c) => c.id !== data.id);
  write(store);
  return { ok: true };
}

/** Reads a picked file into a data URL that can be stored locally. */
export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export async function listSiteContent() {
  return read().siteContent;
}

export async function saveSiteContent({ data }: { data: { entries: { key: string; value: string }[] } }) {
  const store = read();
  for (const entry of data.entries) {
    const row = store.siteContent.find((r) => r.key === entry.key);
    if (row) row.value = entry.value;
    else store.siteContent.push({ key: entry.key, label: entry.key, value: entry.value });
  }
  write(store);
  return { ok: true };
}

export async function listLeads(): Promise<Lead[]> {
  return read().leads;
}

export async function setLeadHandled({ data }: { data: { id: string; handled: boolean } }) {
  const store = read();
  store.leads = store.leads.map((l) => (l.id === data.id ? { ...l, handled: data.handled } : l));
  write(store);
  return { ok: true };
}
