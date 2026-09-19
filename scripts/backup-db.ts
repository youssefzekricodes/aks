import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { openDatabase } from "../src/server/db/database.ts";

mkdirSync("data/backups", { recursive: true });
const target = resolve(
  "data/backups",
  `aks-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
const db = openDatabase();
db.prepare("VACUUM INTO ?").run(target);
db.close();
console.log(`Consistent SQLite backup saved to ${target}`);
