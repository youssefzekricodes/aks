import { openDatabase } from "../src/server/db/database.ts";
import { hashPassword } from "../src/server/auth/password.ts";

const email = "aks@demo.admin";
const password = "AutoKontor2026!";

if (password.length < 12 || password.length > 256)
  throw new Error("Password must contain 12-256 characters.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid e-mail.");

const db = openDatabase();
const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(email);
if (!existing) throw new Error("No admin found with this e-mail.");

const hash = await hashPassword(password);
db.exec("BEGIN IMMEDIATE");
db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(
  hash,
  String(existing["id"]),
);
db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(String(existing["id"]));
db.exec("COMMIT");
db.prepare("DELETE FROM rate_limits WHERE key = ?").run(`login:${email}`);
db.close();
console.log("Password reset. Existing sessions for this account were revoked.");
