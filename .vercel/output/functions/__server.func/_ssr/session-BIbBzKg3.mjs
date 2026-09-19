import { c as getCookie, d as setResponseHeader, l as getRequest, s as deleteCookie$1, u as setCookie$1 } from "./server-B7tKpuFj.mjs";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/session-BIbBzKg3.js
function openDatabase(filename = process.env["DATABASE_PATH"] || "./data/aks.sqlite") {
	if (filename !== ":memory:") mkdirSync(dirname(resolve(filename)), { recursive: true });
	const db = new DatabaseSync(filename);
	db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);
  `);
	if (!db.prepare("SELECT 1 FROM migrations WHERE version = 1").get()) db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE cars (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, published INTEGER NOT NULL CHECK(published IN (0,1)), sort_order INTEGER NOT NULL, document TEXT NOT NULL CHECK(json_valid(document)));
      CREATE TABLE site_content (key TEXT PRIMARY KEY, label TEXT NOT NULL, value TEXT NOT NULL);
      CREATE TABLE leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, message TEXT, car_slug TEXT, handled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE TABLE admins (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE TABLE rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE INDEX cars_public ON cars(published, sort_order);
      INSERT INTO migrations VALUES (1);
      COMMIT;`);
	return db;
}
var database;
function getDb() {
	return database ??= openDatabase();
}
function transaction(work) {
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
function rateLimit(key, max, windowMs) {
	const db = getDb();
	const now = Date.now();
	db.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").run(now);
	const row = db.prepare(`INSERT INTO rate_limits VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).get(key, now + windowMs);
	if (Number(row?.["attempts"]) > max) throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
}
function derive(password, salt) {
	return new Promise((resolve, reject) => scrypt(password, salt, 64, {
		N: 32768,
		r: 8,
		p: 1,
		maxmem: 67108864
	}, (error, key) => error ? reject(error) : resolve(key)));
}
async function verifyPassword(password, encoded) {
	const [algorithm, salt, hex] = encoded.split(":");
	if (algorithm !== "scrypt" || !salt || !hex) return false;
	const actual = await derive(password, salt);
	const expected = Buffer.from(hex, "hex");
	return expected.length === actual.length && timingSafeEqual(actual, expected);
}
var cookieName = "aks_session";
var duration = 28800;
var digest = (token) => createHash("sha256").update(token).digest("hex");
function checkOrigin() {
	const request = getRequest();
	const expected = process.env["APP_ORIGIN"] || new URL(request.url).origin;
	if (!process.env["APP_ORIGIN"]) throw new Error("APP_ORIGIN is required in production.");
	if (request.headers.get("origin") !== expected) throw new Error("Origine non autorisée.");
}
function currentAdmin() {
	setResponseHeader("Cache-Control", "no-store");
	const token = getCookie(cookieName);
	if (!token) return null;
	const row = getDb().prepare(`SELECT admins.id, admins.email FROM sessions JOIN admins ON admins.id = sessions.admin_id
    WHERE token_hash = ? AND expires_at > ?`).get(digest(token), Date.now());
	return row ? {
		id: String(row["id"]),
		email: String(row["email"])
	} : null;
}
function requireAdmin() {
	const admin = currentAdmin();
	if (!admin) throw new Error("Connexion administrateur requise.");
	return admin;
}
async function login(email, password) {
	checkOrigin();
	rateLimit("login:global", 100, 9e5);
	rateLimit(`login:${email}`, 5, 9e5);
	const db = getDb();
	const row = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
	const dummy = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
	const valid = await verifyPassword(password, row ? String(row["password_hash"]) : dummy);
	if (!row || !valid) throw new Error("E-mail ou mot de passe incorrect.");
	logout(false);
	const token = randomBytes(32).toString("hex");
	db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
	db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(digest(token), String(row["id"]), Date.now() + duration * 1e3);
	setCookie$1(cookieName, token, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		path: "/",
		maxAge: duration
	});
	setResponseHeader("Cache-Control", "no-store");
	return { ok: true };
}
function logout(validate = true) {
	if (validate) checkOrigin();
	const token = getCookie(cookieName);
	if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
	deleteCookie$1(cookieName, { path: "/" });
	return { ok: true };
}
//#endregion
export { checkOrigin, currentAdmin, login, logout, rateLimit as n, transaction as r, requireAdmin, getDb as t };
