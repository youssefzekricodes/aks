import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, rateLimit } from "../src/server/db/database.ts";
import { hashPassword, verifyPassword } from "../src/server/auth/password.ts";

test("passwords use unique salts and reject incorrect passwords", async () => {
  const a = await hashPassword("a long test password");
  const b = await hashPassword("a long test password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("a long test password", a), true);
  assert.equal(await verifyPassword("incorrect password", a), false);
  assert.equal(await verifyPassword("password", "invalid"), false);
});
test("SQLite persists records, applies migrations once, and enforces constraints", () => {
  const directory = mkdtempSync(join(tmpdir(), "aks-db-test-"));
  const path = join(directory, "test.sqlite");
  try {
    let db = openDatabase(path);
    db.prepare("INSERT INTO admins VALUES (?, ?, ?)").run("admin", "admin@example.test", "hash");
    assert.throws(() =>
      db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run("token", "missing", Date.now()),
    );
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run("token", "admin", Date.now());
    db.close();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT count(*) AS count FROM admins").get()?.["count"], 1);
    assert.equal(db.prepare("SELECT count(*) AS count FROM migrations").get()?.["count"], 1);
    db.prepare("DELETE FROM admins").run();
    assert.equal(db.prepare("SELECT count(*) AS count FROM sessions").get()?.["count"], 0);
    db.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("rate limits reject repeated attempts", () => {
  process.env["DATABASE_PATH"] = ":memory:";
  rateLimit("test", 2, 60000);
  rateLimit("test", 2, 60000);
  assert.throws(() => rateLimit("test", 2, 60000), /Trop de tentatives/);
});
