// Production-build HTTP test against the configured Supabase project.
// Skipped unless SUPABASE_URL and SUPABASE_ANON_KEY are set. With
// TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD it also signs in and runs CRUD on a
// temporary draft car (removed at the end). Writes nothing else.
import type { Car } from "../src/lib/cars.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { toJSON, fromCrossJSON } from "seroval";

const configured = Boolean(process.env["SUPABASE_URL"] && process.env["SUPABASE_ANON_KEY"]);
const adminEmail = process.env["TEST_ADMIN_EMAIL"];
const adminPassword = process.env["TEST_ADMIN_PASSWORD"];

test(
  "production HTTP against Supabase: public reads, authorization, CSRF, admin CRUD",
  { timeout: 60000, skip: !configured && "set SUPABASE_URL and SUPABASE_ANON_KEY to run" },
  async () => {
    const ids: Record<string, string> = {};
    for (const file of readdirSync(".output/server/_ssr").filter((f) =>
      /^(auth|catalog)\.functions-/.test(f),
    ))
      for (const match of readFileSync(join(".output/server/_ssr", file), "utf8").matchAll(
        /id: "([a-f0-9]+)",\s*name: "([^"]+)"/g,
      ))
        ids[match[2]!] = match[1]!;

    const origin = "http://127.0.0.1:4319";
    const server = spawn(process.execPath, [".output/server/index.mjs"], {
      env: {
        ...process.env,
        APP_ORIGIN: origin,
        PORT: "4319",
        HOST: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: "pipe",
    });
    let logs = "";
    server.stderr.on("data", (data) => (logs += data));
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
      let decoded: { result?: unknown; error?: unknown };
      try {
        decoded = fromCrossJSON(JSON.parse(text), { refs: new Map() }) as typeof decoded;
      } catch (error) {
        decoded = { error: String(error) + text };
      }
      return {
        response,
        text,
        failed: !response.ok || Boolean(decoded.error),
        json: <T = unknown>() => {
          assert.ok(!decoded.error, `${name}: ${String(decoded.error).slice(0, 500)}${logs}`);
          return decoded.result as T;
        },
      };
    }
    const sessionCookies = (response: Response) =>
      response.headers
        .getSetCookie()
        .filter((value) => /^sb-[^=]+-auth-token/.test(value))
        .map((value) => value.split(";")[0])
        .join("; ");

    try {
      for (
        let i = 0;
        i < 100 &&
        !(await fetch(origin).then(
          (r) => r.ok,
          () => false,
        ));
        i++
      )
        await delay(100);

      // Public, anonymous.
      assert.ok(Array.isArray((await rpc("listPublicCars")).json<Car[]>()));
      assert.equal((await rpc("getSession")).json(), null);
      for (const name of ["listAllCars", "listLeads", "listSiteContent"])
        assert.ok((await rpc(name)).failed, name);
      assert.ok((await rpc("deleteCar", { id: "00000000-0000-0000-0000-000000000000" })).failed);
      assert.ok(
        (await rpc("createUploadUrl", { kind: "vehicle", contentType: "image/jpeg", size: 1000 }))
          .failed,
      );
      assert.ok((await rpc("submitLead", { name: "", phone: "1" })).failed, "validation");
      assert.ok(
        (await rpc("signIn", { email: "nobody@example.test", password: "wrong-password" })).failed,
      );

      if (!adminEmail || !adminPassword) return;

      // CSRF: a foreign origin cannot sign in even with the right password.
      assert.ok(
        (
          await rpc(
            "signIn",
            { email: adminEmail, password: adminPassword },
            { origin: "https://attacker.example" },
          )
        ).failed,
      );
      const login = await rpc("signIn", { email: adminEmail, password: adminPassword });
      assert.equal(login.failed, false, login.text);
      const setCookies = login.response.headers.getSetCookie().filter((v) => v.startsWith("sb-"));
      assert.ok(setCookies.length > 0, "session cookie set");
      for (const value of setCookies) {
        assert.match(value, /HttpOnly/i);
        assert.match(value, /Secure/i);
        assert.match(value, /SameSite=Strict/i);
      }
      cookie = sessionCookies(login.response);
      assert.equal(
        (await rpc("getSession")).json<{ email: string }>().email,
        adminEmail.toLowerCase(),
      );
      assert.ok(Array.isArray((await rpc("listLeads")).json()));

      const draft = {
        slug: `test-${Date.now()}`,
        name: "Test",
        brand: "BMW",
        model: "Test",
        version: "",
        country: "Germany",
        year: 2024,
        price: 1000,
        price_on_request: false,
        km: "0 km",
        km_value: 0,
        fuel: "Essence",
        gearbox: "Auto",
        body: "Berline",
        state: "Neuf",
        images: [],
        description: "",
        published: false,
        sort_order: 0,
      };
      assert.ok((await rpc("saveCar", draft, { origin: "https://attacker.example" })).failed);
      const { id } = (await rpc("saveCar", draft)).json<{ id: string }>();
      try {
        assert.ok(
          !(await rpc("listPublicCars")).json<Car[]>().some((car) => car.id === id),
          "draft hidden",
        );
        assert.ok(
          (await rpc("saveCar", { ...draft, id, images: ["https://attacker.example/x.jpg"] }))
            .failed,
          "foreign image URL refused",
        );
        assert.equal((await rpc("setCarPublished", { id, published: true })).failed, false);
        assert.ok(
          (await rpc("listPublicCars")).json<Car[]>().some((car) => car.id === id),
          "published",
        );
      } finally {
        assert.equal((await rpc("deleteCar", { id })).failed, false);
      }
      assert.equal((await rpc("signOut", {})).failed, false);
    } finally {
      server.kill();
      await new Promise<void>((resolve) => server.once("exit", () => resolve()));
    }
  },
);
