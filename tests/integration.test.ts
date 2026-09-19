import type { Car } from "../src/lib/cars.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { toJSON, fromCrossJSON } from "seroval";
import { openDatabase } from "../src/server/db/database.ts";
import { hashPassword } from "../src/server/auth/password.ts";

test(
  "production HTTP: authorization, login, CSRF, CRUD, persistence, expiry and logout",
  { timeout: 30000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "aks-http-test-"));
    const dbPath = join(directory, "test.sqlite");
    const db = openDatabase(dbPath);
    const password = "integration-test-password";
    db.prepare("INSERT INTO admins VALUES (?, ?, ?)").run(
      "test-admin",
      "admin@example.test",
      await hashPassword(password),
    );
    const ids: Record<string, string> = {};
    for (const file of readdirSync(".output/server/_ssr").filter((f) =>
      /^(auth|catalog)\.functions-/.test(f),
    )) {
      for (const match of readFileSync(join(".output/server/_ssr", file), "utf8").matchAll(
        /id: "([a-f0-9]+)",\s*name: "([^"]+)"/g,
      ))
        ids[match[2]!] = match[1]!;
    }
    const origin = "http://127.0.0.1:4319";
    const server = spawn(process.execPath, [".output/server/index.mjs"], {
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        APP_ORIGIN: origin,
        PORT: "4319",
        HOST: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: "pipe",
      windowsHide: true,
    });
    let logs = "";
    server.stderr.on("data", (data) => {
      logs += data;
    });
    let cookie = "";
    async function rpc(
      name: string,
      data?: unknown,
      settings: { cookie?: string; origin?: string } = {},
    ) {
      assert.ok(ids[name], `missing RPC ${name}`);
      const post = data !== undefined;
      const response = await fetch(`${origin}/_serverFn/${ids[name]}`, {
        method: post ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          "x-tsr-serverFn": "true",
          Origin: settings.origin ?? origin,
          Cookie: settings.cookie ?? cookie,
        },
        ...(post ? { body: JSON.stringify(toJSON({ data })) } : {}),
      });
      const text = await response.text();
      let decoded;
      try {
        decoded = fromCrossJSON(JSON.parse(text), { refs: new Map() }) as {
          result?: unknown;
          error?: unknown;
        };
      } catch (error) {
        decoded = { error: String(error) + text };
      }
      return {
        response,
        text,
        failed: !response.ok || !!decoded.error,
        json: <T = unknown>() => {
          assert.ok(!decoded.error, name + ": " + String(decoded.error).slice(0, 500) + logs);
          return decoded.result as T;
        },
      };
    }
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin)).ok) {
            ready = true;
            break;
          }
        } catch {
          /* starting */
        }
        await delay(100);
      }
      assert.ok(ready, logs);
      assert.ok((await rpc("listPublicCars")).json<Car[]>().length > 0);
      assert.equal((await rpc("getSession")).json(), null);
      for (const name of ["listAllCars", "listLeads", "listSiteContent"]) {
        assert.doesNotMatch((await rpc(name)).text, /demo-bmw|inventory_title/);
        assert.ok((await rpc(name)).failed);
      }
      assert.ok((await rpc("deleteCar", { id: "demo-bmw-serie-4" })).failed);
      assert.ok((await rpc("signIn", { email: "admin@example.test", password: "wrong" })).failed);
      assert.ok(
        (
          await rpc(
            "signIn",
            { email: "admin@example.test", password },
            { origin: "https://attacker.example" },
          )
        ).failed,
      );
      const login = await rpc("signIn", { email: "admin@example.test", password });
      assert.equal(login.response.status, 200, login.text);
      const setCookie = login.response.headers
        .getSetCookie()
        .find((value) => value.startsWith("aks_session=") && !value.startsWith("aks_session=;"))!;
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /Secure/i);
      assert.match(setCookie, /SameSite=Strict/i);
      cookie = setCookie.split(";")[0]!;
      assert.equal((await rpc("getSession")).json<{ email: string }>().email, "admin@example.test");
      // The editor receives the complete catalog, including defaults on existing databases.
      const allContent = (await rpc("listSiteContent")).json<{ key: string; value: string }[]>();
      assert.ok(allContent.length > 140);
      assert.ok(allContent.some((row) => row.key === "showroom.items"));
      const contentChanges = [
        { key: "hero.text_26", value: "Bienvenue dans notre nouveau showroom" },
        { key: "hero.text_27", value: "" },
        { key: "seo.home_title", value: "Mon showroom personnalisé" },
        { key: "identity.logo", value: "/images/aks-logo.png" },
        { key: "testimonials.items", value: "[]" },
        {
          key: "services.items",
          value: JSON.stringify([
            {
              icon: "ShieldCheck",
              title: "Service sur mesure",
              text: "Votre service personnalisé.",
            },
          ]),
        },
      ];
      assert.ok((await rpc("saveSiteContent", { entries: contentChanges }, { cookie: "" })).failed);
      assert.ok(
        (
          await rpc(
            "saveSiteContent",
            { entries: contentChanges },
            { origin: "https://attacker.example" },
          )
        ).failed,
      );
      assert.equal((await rpc("saveSiteContent", { entries: contentChanges })).failed, false);
      const publicContent = (await rpc("listPublicSiteContent")).json<Record<string, string>>();
      assert.equal(publicContent["hero.text_27"], "");
      assert.equal(publicContent["testimonials.items"], "[]");
      assert.equal(
        db.prepare("SELECT value FROM site_content WHERE key = ?").get("hero.text_26")?.["value"],
        contentChanges[0]!.value,
      );
      let homepage = await (await fetch(origin)).text();
      assert.match(homepage, /<title>Mon showroom personnalisé<\/title>/);
      assert.match(homepage, /Bienvenue dans notre nouveau showroom/);
      assert.match(homepage, /Service sur mesure/);
      assert.doesNotMatch(homepage, /id="avis"/);
      assert.equal(
        (await rpc("saveSiteContent", { entries: [{ key: "sections.services", value: "false" }] }))
          .failed,
        false,
      );
      homepage = await (await fetch(origin)).text();
      assert.doesNotMatch(homepage, /id="services"/);
      for (const invalid of [
        { key: "unknown.field", value: "bad" },
        { key: "identity.logo", value: 'data:image/svg+xml,<svg onload="alert(1)"/>' },
        { key: "contact.link_1", value: "javascript:alert(1)" },
        { key: "showroom.map_1", value: "https://attacker.example/embed" },
        { key: "sections.hero", value: "yes" },
        {
          key: "testimonials.items",
          value: JSON.stringify([{ name: "Test", city: "Sfax", stars: 7, text: "Avis" }]),
        },
        {
          key: "navbar.items",
          value: JSON.stringify([{ href: "javascript:alert(1)", label: "Test" }]),
        },
      ]) {
        assert.ok(
          (
            await rpc("saveSiteContent", {
              entries: [{ key: "hero.text_26", value: "Must not persist" }, invalid],
            })
          ).failed,
          invalid.key,
        );
      }
      assert.equal(
        (await rpc("listPublicSiteContent")).json<Record<string, string>>()["hero.text_26"],
        contentChanges[0]!.value,
      );
      const car = (await rpc("listAllCars")).json<Car[]>()[0]!;
      assert.ok(
        (
          await rpc(
            "setCarPublished",
            { id: car.id, published: false },
            { origin: "https://attacker.example" },
          )
        ).failed,
      );
      assert.equal(
        (await rpc("setCarPublished", { id: car.id, published: false })).response.status,
        200,
      );
      assert.ok(
        !(await rpc("listPublicCars"))
          .json<Car[]>()
          .some((item: { id: string }) => item.id === car.id),
      );
      assert.equal((await rpc("saveCar", { ...car, name: "Updated car" })).response.status, 200);
      assert.match(
        String(db.prepare("SELECT document FROM cars WHERE id = ?").get(car.id)?.["document"]),
        /Updated car/,
      );
      assert.ok((await rpc("saveCar", { ...car, price: -1 })).failed);
      assert.equal(
        (
          await rpc(
            "submitLead",
            { name: "Visitor", phone: "12345678", message: "Test inquiry" },
            { cookie: "" },
          )
        ).response.status,
        200,
      );
      assert.equal((await rpc("listLeads")).json<{ name: string }[]>()[0]!.name, "Visitor");
      assert.equal((await rpc("signOut", {})).response.status, 200);
      assert.equal((await rpc("getSession")).json(), null);
      const nextLogin = await rpc("signIn", { email: "admin@example.test", password });
      cookie = nextLogin.response.headers
        .getSetCookie()
        .find((value) => value.startsWith("aks_session=") && !value.startsWith("aks_session=;"))!
        .split(";")[0]!;
      db.prepare("UPDATE sessions SET expires_at = 0").run();
      assert.equal((await rpc("getSession")).json(), null);
      assert.ok((await rpc("listAllCars")).failed);
    } finally {
      server.kill();
      await new Promise<void>((resolve) => server.once("exit", () => resolve()));
      db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
