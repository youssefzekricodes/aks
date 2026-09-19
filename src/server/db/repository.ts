import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { getDb, transaction, rateLimit } from "./database";
import { requireAdmin, checkOrigin } from "../auth/session";
import { DEMO_CARS, DEMO_SITE_CONTENT } from "./seed";
import type { Car } from "@/lib/cars";
import type { CarInput, Lead } from "@/features/catalog/types";
import {
  CONTENT_FIELDS,
  CONTENT_BY_KEY,
  validateContentValue,
} from "@/features/content/definition";

function db() {
  const database = getDb();
  if (!database.prepare("SELECT 1 FROM migrations WHERE version = 2").get())
    transaction(() => {
      for (const car of DEMO_CARS)
        database
          .prepare("INSERT INTO cars VALUES (?, ?, ?, ?, ?)")
          .run(car.id, car.slug, Number(car.published), car.sort_order, JSON.stringify(car));
      for (const row of DEMO_SITE_CONTENT)
        database
          .prepare("INSERT INTO site_content VALUES (?, ?, ?)")
          .run(row.key, row.label, row.value);
      database.prepare("INSERT INTO migrations VALUES (2)").run();
    });
  return database;
}
function authorize(write = false) {
  requireAdmin();
  if (write) checkOrigin();
}
export function cars(admin = false): Car[] {
  if (admin) authorize();
  return db()
    .prepare(`SELECT document FROM cars ${admin ? "" : "WHERE published = 1"} ORDER BY sort_order`)
    .all()
    .map((row) => JSON.parse(String(row["document"])) as Car);
}
export function content(admin = false) {
  if (admin) authorize();
  const saved = db().prepare("SELECT * FROM site_content ORDER BY key").all() as {
    key: string;
    label: string;
    value: string;
  }[];
  const values = new Map(saved.map((row) => [row.key, row.value]));
  return CONTENT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: values.get(field.key) ?? field.value,
  }));
}
export function saveCar(data: CarInput) {
  authorize(true);
  const id = data.id || randomUUID();
  if (data.id && !db().prepare("SELECT 1 FROM cars WHERE id = ?").get(id))
    throw new Error("Véhicule introuvable.");
  try {
    db()
      .prepare(
        `INSERT INTO cars VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, published=excluded.published, sort_order=excluded.sort_order, document=excluded.document`,
      )
      .run(id, data.slug, Number(data.published), data.sort_order, JSON.stringify({ ...data, id }));
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new Error("Ce lien de véhicule existe déjà.");
    throw error;
  }
  return { id };
}
export function publishCar(id: string, published: boolean) {
  authorize(true);
  db()
    .prepare(
      "UPDATE cars SET published = ?, document = json_set(document, '$.published', json(?)) WHERE id = ?",
    )
    .run(Number(published), JSON.stringify(published), id);
  return { ok: true };
}
export function deleteCar(id: string) {
  authorize(true);
  db().prepare("DELETE FROM cars WHERE id = ?").run(id);
  return { ok: true };
}
export function saveContent(entries: { key: string; value: string }[]) {
  authorize(true);
  for (const entry of entries) {
    const field = CONTENT_BY_KEY.get(entry.key);
    if (!field) throw new Error("Champ de contenu inconnu.");
    const error = validateContentValue(field, entry.value);
    if (error) throw new Error(error);
  }
  const database = db();
  transaction(() => {
    for (const row of entries)
      database
        .prepare(
          "INSERT INTO site_content VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .run(row.key, row.key, row.value);
  });
  return { ok: true };
}
export function createLead(data: {
  name: string;
  phone: string;
  email?: string | undefined;
  message?: string | undefined;
  car_slug?: string | undefined;
}) {
  checkOrigin();
  rateLimit("leads:global", 100, 60 * 60_000);
  rateLimit(`leads:${data.phone}`, 5, 60 * 60_000);
  db()
    .prepare("INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .run(
      randomUUID(),
      data.name,
      data.phone,
      data.email || null,
      data.message || null,
      data.car_slug || null,
      new Date().toISOString(),
    );
  return { ok: true };
}
export function leads(): Lead[] {
  authorize();
  return db()
    .prepare("SELECT * FROM leads ORDER BY created_at DESC")
    .all()
    .map((row) => ({ ...row, handled: Boolean(row["handled"]) })) as Lead[];
}
export function handleLead(id: string, handled: boolean) {
  authorize(true);
  db().prepare("UPDATE leads SET handled = ? WHERE id = ?").run(Number(handled), id);
  return { ok: true };
}
