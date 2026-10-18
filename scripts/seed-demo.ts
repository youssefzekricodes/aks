// Development fixtures: uploads the demo photos in public/images to R2 and
// creates six published demo cars. Refuses to run if cars already exist.
//   npm run seed:demo
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { r2, serviceClient } from "./lib/service.ts";

const demo = [
  {
    slug: "bmw-serie-4-coupe",
    brand: "BMW",
    model: "Série 4",
    version: "Coupé 420i M Sport",
    country: "Germany",
    year: 2022,
    price: 189000,
    km_value: 28000,
    fuel: "Essence",
    gearbox: "Auto",
    body: "Coupé",
    state: "Occasion",
    transmission: "Propulsion",
    doors: 2,
    seats: 4,
    fiscal_power: 8,
    photos: "bmw",
    description:
      "BMW Série 4 Coupé en parfait état, entretien complet, pack M Sport, sièges cuir et toit ouvrant.",
  },
  {
    slug: "mercedes-classe-c",
    brand: "Mercedes-Benz",
    model: "Classe C",
    version: "220d",
    country: "Germany",
    year: 2021,
    price: 165000,
    km_value: 45000,
    fuel: "Diesel",
    gearbox: "Auto",
    body: "Berline",
    state: "Occasion",
    transmission: "Propulsion",
    doors: 4,
    seats: 5,
    fiscal_power: 8,
    photos: "mercedes",
    description:
      "Mercedes Classe C 220d, première main, carnet d'entretien complet, finition AMG Line.",
  },
  {
    slug: "alfa-romeo-giulia",
    brand: "Alfa Romeo",
    model: "Giulia",
    version: "Veloce",
    country: "Italy",
    year: 2023,
    price: 210000,
    km_value: 12000,
    fuel: "Essence",
    gearbox: "Auto",
    body: "Berline",
    state: "Occasion",
    transmission: "Intégrale",
    doors: 4,
    seats: 5,
    fiscal_power: 11,
    photos: "alfa",
    description:
      "Alfa Romeo Giulia Veloce, comportement sportif, intérieur cuir rouge, état impeccable.",
  },
  {
    slug: "renault-clio",
    brand: "Renault",
    model: "Clio",
    version: "V",
    country: "France",
    year: 2020,
    price: 62000,
    km_value: 78000,
    fuel: "Diesel",
    gearbox: "Manuelle",
    body: "Citadine",
    state: "Occasion",
    transmission: "Traction",
    doors: 5,
    seats: 5,
    fiscal_power: 5,
    photos: "renault",
    description: "Renault Clio V économique, idéale en ville, très bon état général.",
  },
  {
    slug: "toyota-yaris-hybride",
    brand: "Toyota",
    model: "Yaris",
    version: "Hybride",
    country: "Japan",
    year: 2023,
    price: 89000,
    km_value: 15000,
    fuel: "Hybride",
    gearbox: "Auto",
    body: "Citadine",
    state: "Neuf",
    transmission: "Traction",
    doors: 5,
    seats: 5,
    fiscal_power: 5,
    photos: "yaris",
    description: "Toyota Yaris Hybride, consommation record, garantie constructeur.",
  },
  {
    slug: "toyota-gr86",
    brand: "Toyota",
    model: "GR86",
    version: "",
    country: "Japan",
    year: 2024,
    price: 235000,
    km_value: 5000,
    fuel: "Essence",
    gearbox: "Manuelle",
    body: "Coupé",
    state: "Neuf",
    transmission: "Propulsion",
    doors: 2,
    seats: 4,
    fiscal_power: 13,
    photos: "gr86",
    description: "Toyota GR86 boîte manuelle, coupé sportif propulsion, disponible immédiatement.",
  },
];

try {
  const supabase = serviceClient();
  const { count, error: countError } = await supabase
    .from("cars")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if (count)
    throw new Error(`${count} car(s) already exist; demo seed only runs on an empty database.`);

  const { client, bucketUrl } = r2();
  const month = new Date().toISOString().slice(0, 7).replace("-", "/");
  for (const [index, { photos, ...car }] of demo.entries()) {
    const keys: string[] = [];
    for (const view of ["front", "rear", "interior"]) {
      const key = `vehicles/${month}/${randomUUID()}.jpg`;
      const response = await client.fetch(`${bucketUrl}/${key}`, {
        method: "PUT",
        body: readFileSync(`public/images/${photos}-${view}.jpg`),
        headers: { "content-type": "image/jpeg" },
      });
      if (!response.ok) throw new Error(`Upload of ${key} failed: ${response.status}`);
      keys.push(key);
    }
    const name = [car.model, car.version].filter(Boolean).join(" ");
    const { data, error } = await supabase
      .from("cars")
      .insert({ ...car, name, published: true, sort_order: index + 1 })
      .select("id")
      .single();
    if (error) throw error;
    const { error: imageError } = await supabase
      .from("car_images")
      .insert(keys.map((object_key, position) => ({ car_id: data.id, object_key, position })));
    if (imageError) throw imageError;
    console.log(`✓ ${car.brand} ${name}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
