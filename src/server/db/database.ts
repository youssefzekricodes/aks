import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function openDatabase(filename = process.env["DATABASE_PATH"] || "./data/aks.sqlite") {
  if (filename !== ":memory:") mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);
  `);
  if (!db.prepare("SELECT 1 FROM migrations WHERE version = 1").get()) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE cars (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, published INTEGER NOT NULL CHECK(published IN (0,1)), sort_order INTEGER NOT NULL, document TEXT NOT NULL CHECK(json_valid(document)));
      CREATE TABLE site_content (key TEXT PRIMARY KEY, label TEXT NOT NULL, value TEXT NOT NULL);
      CREATE TABLE leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, message TEXT, car_slug TEXT, handled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE TABLE admins (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE TABLE rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE INDEX cars_public ON cars(published, sort_order);
      INSERT INTO migrations VALUES (1);
      COMMIT;`);
  }
  return db;
}

let database: DatabaseSync | undefined;
export function getDb() {
  return (database ??= openDatabase());
}

export function transaction<T>(work: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function rateLimit(key: string, max: number, windowMs: number) {
  const db = getDb();
  const now = Date.now();
  db.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").run(now);
  const row = db
    .prepare(
      `INSERT INTO rate_limits VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`,
    )
    .get(key, now + windowMs);
  if (Number(row?.["attempts"]) > max)
    throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
}
