import "@tanstack/react-start/server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequest,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { getDb, rateLimit } from "../db/database";
import { verifyPassword } from "./password";

const cookieName = "aks_session";
const duration = 8 * 60 * 60;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export function checkOrigin() {
  const request = getRequest();
  const expected = process.env["APP_ORIGIN"] || new URL(request.url).origin;
  if (process.env["NODE_ENV"] === "production" && !process.env["APP_ORIGIN"])
    throw new Error("APP_ORIGIN is required in production.");
  if (request.headers.get("origin") !== expected) throw new Error("Origine non autorisée.");
}
export function currentAdmin() {
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie(cookieName);
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT admins.id, admins.email FROM sessions JOIN admins ON admins.id = sessions.admin_id
    WHERE token_hash = ? AND expires_at > ?`,
    )
    .get(digest(token), Date.now());
  return row ? { id: String(row["id"]), email: String(row["email"]) } : null;
}
export function requireAdmin() {
  const admin = currentAdmin();
  if (!admin) throw new Error("Connexion administrateur requise.");
  return admin;
}
export async function login(email: string, password: string) {
  checkOrigin();
  rateLimit("login:global", 100, 15 * 60_000);
  rateLimit(`login:${email}`, 5, 15 * 60_000);
  const db = getDb();
  const row = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
  const dummy = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
  const valid = await verifyPassword(password, row ? String(row["password_hash"]) : dummy);
  if (!row || !valid) throw new Error("E-mail ou mot de passe incorrect.");
  logout(false);
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
    digest(token),
    String(row["id"]),
    Date.now() + duration * 1000,
  );
  setCookie(cookieName, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
    maxAge: duration,
  });
  setResponseHeader("Cache-Control", "no-store");
  return { ok: true };
}
export function logout(validate = true) {
  if (validate) checkOrigin();
  const token = getCookie(cookieName);
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
  deleteCookie(cookieName, { path: "/" });
  return { ok: true };
}
