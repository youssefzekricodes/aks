// Row Level Security checks for supabase/migrations, run against a throwaway
// Postgres: PG_TEST_URL=postgres://… node --experimental-strip-types --test tests/rls.test.ts
// The database must contain tests/supabase-stub.sql + the migrations (see README → Tests).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const url = process.env["PG_TEST_URL"];
const ADMIN = JSON.stringify({
  sub: "00000000-0000-0000-0000-00000000000a",
  role: "authenticated",
  app_metadata: { role: "admin" },
});
const SUPER_AAL1 = JSON.stringify({
  sub: "00000000-0000-0000-0000-00000000000c",
  role: "authenticated",
  aal: "aal1",
  app_metadata: { role: "super_admin" },
});
const SUPER_AAL2 = JSON.stringify({
  sub: "00000000-0000-0000-0000-00000000000c",
  role: "authenticated",
  aal: "aal2",
  app_metadata: { role: "super_admin" },
});
const USER = JSON.stringify({
  sub: "00000000-0000-0000-0000-00000000000b",
  role: "authenticated",
  app_metadata: {},
});

/** Runs SQL as a given role/JWT inside a transaction that is always rolled back. */
function sql(role: "anon" | "authenticated" | "postgres", claims: string, statement: string) {
  const script = `begin;
set local "request.jwt.claims" to '${claims.replaceAll("'", "''")}';
${role === "postgres" ? "" : `set local role ${role};`}
${statement}
rollback;`;
  try {
    // Via stdin so every statement's output is printed (psql -c only prints the last one).
    const out = execFileSync(
      "psql",
      [url!, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-f", "-"],
      {
        encoding: "utf8",
        input: script,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return { ok: true as const, out: out.trim() };
  } catch (error) {
    return { ok: false as const, out: String((error as { stderr?: string }).stderr ?? error) };
  }
}

const seed = `
insert into public.cars (id, slug, name, brand, country, year, fuel, gearbox, body, state, published)
values ('11111111-1111-1111-1111-111111111111', 'pub', 'Pub', 'BMW', 'Germany', 2022, 'Essence', 'Auto', 'Coupé', 'Occasion', true),
       ('22222222-2222-2222-2222-222222222222', 'draft', 'Draft', 'BMW', 'Germany', 2022, 'Essence', 'Auto', 'Coupé', 'Occasion', false);
insert into public.car_images (car_id, object_key, position) values
  ('11111111-1111-1111-1111-111111111111', 'vehicles/2026/10/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg', 0),
  ('22222222-2222-2222-2222-222222222222', 'vehicles/2026/10/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg', 0);
insert into public.leads (name, phone) values ('Client', '+21600000000');
`;
const asAdminSeeded = (statement: string, role: "anon" | "authenticated", claims = "{}") =>
  // Seed as owner, then switch role inside the same transaction.
  sql(
    "postgres",
    "{}",
    `${seed}
set local "request.jwt.claims" to '${claims.replaceAll("'", "''")}';
set local role ${role};
${statement}`,
  );

test("RLS policies", { skip: !url && "set PG_TEST_URL to run" }, async (t) => {
  await t.test("anon sees only published cars and their images", () => {
    assert.equal(
      asAdminSeeded("select string_agg(slug, ',' order by slug) from public.cars;", "anon").out,
      "pub",
    );
    assert.equal(asAdminSeeded("select count(*) from public.car_images;", "anon").out, "1");
  });

  await t.test("anon cannot read or write leads, cars or content", () => {
    assert.equal(asAdminSeeded("select count(*) from public.leads;", "anon").ok, false);
    assert.equal(
      asAdminSeeded("insert into public.leads (name, phone) values ('x', '12345');", "anon").ok,
      false,
    );
    assert.equal(asAdminSeeded("update public.cars set price = 1 returning id;", "anon").ok, false);
    assert.equal(
      asAdminSeeded("insert into public.site_content values ('k', 'v');", "anon").ok,
      false,
    );
    assert.equal(asAdminSeeded("select count(*) from public.rate_limits;", "anon").ok, false);
  });

  await t.test("a signed-in non-admin has no extra rights", () => {
    assert.equal(
      asAdminSeeded("select string_agg(slug, ',') from public.cars;", "authenticated", USER).out,
      "pub",
    );
    assert.equal(
      asAdminSeeded("select count(*) from public.leads;", "authenticated", USER).out,
      "0",
    );
    const update = asAdminSeeded(
      "update public.cars set price = 1 where slug = 'pub' returning id;",
      "authenticated",
      USER,
    );
    assert.equal(update.out, "", "no row updated");
    assert.equal(
      asAdminSeeded("select * from public.save_car('{}'::jsonb, '{}');", "authenticated", USER).ok,
      false,
    );
  });

  await t.test("admins read drafts and leads and save cars with photos atomically", () => {
    assert.equal(
      asAdminSeeded("select count(*) from public.cars;", "authenticated", ADMIN).out,
      "2",
    );
    assert.equal(
      asAdminSeeded("select count(*) from public.leads;", "authenticated", ADMIN).out,
      "1",
    );
    const saved = asAdminSeeded(
      `select array_to_string(removed_keys, ',') from public.save_car(
        '{"id":"11111111-1111-1111-1111-111111111111","slug":"pub","name":"Pub","brand":"BMW","country":"Germany","year":2023,"fuel":"Essence","gearbox":"Auto","body":"Coupé","state":"Occasion","published":true}'::jsonb,
        array['vehicles/2026/10/cccccccc-cccc-cccc-cccc-cccccccccccc.jpg']);
       select year || ':' || (select string_agg(object_key, ',') from public.car_images where car_id = '11111111-1111-1111-1111-111111111111') from public.cars where slug = 'pub';`,
      "authenticated",
      ADMIN,
    );
    assert.equal(saved.ok, true, saved.out);
    const [removed, after] = saved.out.split("\n");
    assert.equal(removed, "vehicles/2026/10/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg");
    assert.equal(after, "2023:vehicles/2026/10/cccccccc-cccc-cccc-cccc-cccccccccccc.jpg");
  });

  await t.test("object keys outside the agreed structure are rejected", () => {
    const bad = asAdminSeeded(
      "insert into public.car_images (car_id, object_key, position) values ('11111111-1111-1111-1111-111111111111', '../secret.jpg', 1);",
      "authenticated",
      ADMIN,
    );
    assert.equal(bad.ok, false);
  });

  await t.test("submit_lead validates and rate-limits per phone", () => {
    const five = Array.from(
      { length: 5 },
      () => "select public.submit_lead('Client', '+21611111111', null, 'Bonjour', null);",
    ).join("\n");
    assert.equal(sql("anon", "{}", five).ok, true);
    assert.equal(
      sql("anon", "{}", `${five}\nselect public.submit_lead('Client', '+21611111111');`).ok,
      false,
    );
    assert.equal(sql("anon", "{}", "select public.submit_lead('', '12');").ok, false);
  });

  await t.test("a super admin needs a second factor (aal2) before any admin access", () => {
    assert.equal(
      asAdminSeeded("select count(*) from public.leads;", "authenticated", SUPER_AAL1).out,
      "0",
      "aal1: no leads",
    );
    assert.equal(
      asAdminSeeded("select string_agg(slug, ',') from public.cars;", "authenticated", SUPER_AAL1)
        .out,
      "pub",
      "aal1: public view only",
    );
    assert.equal(
      asAdminSeeded("select count(*) from public.leads;", "authenticated", SUPER_AAL2).out,
      "1",
      "aal2: full admin",
    );
  });

  await t.test("only the service role can revoke sessions", () => {
    const call = "select public.revoke_user_sessions('00000000-0000-0000-0000-00000000000b');";
    assert.equal(sql("anon", "{}", call).ok, false);
    assert.equal(sql("authenticated", ADMIN, call).ok, false);
    assert.equal(sql("authenticated", SUPER_AAL2, call).ok, false);
  });

  await t.test("e-mail second factor: password session confirms a fresh code session", () => {
    const SUPER_ID = "00000000-0000-0000-0000-00000000000c";
    const PASSWORD_SESSION = "aaaaaaaa-0000-0000-0000-000000000001";
    const CODE_SESSION = "aaaaaaaa-0000-0000-0000-000000000002";
    const claims = (session: string) =>
      JSON.stringify({
        sub: SUPER_ID,
        role: "authenticated",
        aal: "aal1",
        session_id: session,
        app_metadata: { role: "super_admin" },
      });
    const setup = `
insert into auth.sessions (id, user_id) values ('${PASSWORD_SESSION}', '${SUPER_ID}'), ('${CODE_SESSION}', '${SUPER_ID}');
insert into auth.mfa_amr_claims (session_id, authentication_method) values ('${PASSWORD_SESSION}', 'password'), ('${CODE_SESSION}', 'otp');
${seed}`;
    const as = (session: string, statement: string) =>
      sql(
        "postgres",
        "{}",
        `${setup}
set local "request.jwt.claims" to '${claims(session).replaceAll("'", "''")}';
set local role authenticated;
${statement}`,
      );
    const confirm = (target: string) => `select public.confirm_email_second_factor('${target}');`;
    assert.equal(as(CODE_SESSION, "select count(*) from public.leads;").out, "0", "unconfirmed");
    assert.equal(
      as(CODE_SESSION, confirm(CODE_SESSION)).ok,
      false,
      "the code session cannot confirm itself",
    );
    assert.equal(
      as(PASSWORD_SESSION, confirm(PASSWORD_SESSION)).ok,
      false,
      "the password session cannot confirm itself",
    );
    const confirmed = as(
      PASSWORD_SESSION,
      `${confirm(CODE_SESSION)}
set local "request.jwt.claims" to '${claims(CODE_SESSION).replaceAll("'", "''")}';
select count(*) from public.leads;`,
    );
    assert.equal(confirmed.ok, true, confirmed.out);
    assert.equal(confirmed.out.split("\n").pop(), "1", "confirmed session has admin access");
    assert.equal(sql("anon", "{}", "select count(*) from public.admin_second_factor;").ok, false);
  });

  await t.test("sold cars, discounts, ordering and page views", () => {
    const PUB = "11111111-1111-1111-1111-111111111111";
    const DRAFT = "22222222-2222-2222-2222-222222222222";
    // Anonymous views count for published, unsold cars only; anon cannot read them.
    const viewed = asAdminSeeded(
      `select public.record_car_view('pub'); select public.record_car_view('pub');
select public.record_car_view('draft');
reset role;
select string_agg(views::text, ',') from public.car_views;`,
      "anon",
    );
    assert.equal(viewed.ok, true, viewed.out);
    assert.equal(viewed.out.split("\n").pop(), "2");
    assert.equal(asAdminSeeded("select count(*) from public.car_views;", "anon").ok, false);
    const soldView = asAdminSeeded(
      `reset role; update public.cars set sold = true where slug = 'pub';
set local role anon; select public.record_car_view('pub');
reset role; select count(*) from public.car_views;`,
      "anon",
    );
    assert.equal(soldView.out.split("\n").pop(), "0", "sold cars are not counted");
    // sold_at follows sold.
    assert.equal(
      asAdminSeeded(
        "update public.cars set sold = true where slug = 'pub' returning sold_at is not null;",
        "authenticated",
        ADMIN,
      ).out,
      "t",
    );
    // A discount must be below the price.
    assert.equal(
      asAdminSeeded(
        "update public.cars set discount_price = price where slug = 'pub';",
        "authenticated",
        ADMIN,
      ).ok,
      false,
    );
    // Reordering: admins only.
    const order = `select public.reorder_cars(array['${DRAFT}', '${PUB}']::uuid[]);
select string_agg(slug, ',' order by sort_order) from public.cars;`;
    assert.equal(asAdminSeeded(order, "authenticated", ADMIN).out.split("\n").pop(), "draft,pub");
    assert.equal(asAdminSeeded(order, "authenticated", USER).ok, false);
  });

  await t.test("social posts: admins read, nobody writes directly, once per network", () => {
    const PUB = "11111111-1111-1111-1111-111111111111";
    const insert = `insert into public.social_posts (car_id, platform) values ('${PUB}', 'facebook');`;
    assert.equal(asAdminSeeded("select count(*) from public.social_posts;", "anon").ok, false);
    assert.equal(
      asAdminSeeded(insert, "authenticated", ADMIN).ok,
      false,
      "writes: service role only",
    );
    const owner = sql(
      "postgres",
      "{}",
      `${seed}
${insert}
${insert}`,
    );
    assert.equal(owner.ok, false, "a second pending post on the same network is refused");
    assert.equal(
      asAdminSeeded(
        `reset role; ${insert}
set local role authenticated; select count(*) from public.social_posts;`,
        "authenticated",
        ADMIN,
      )
        .out.split("\n")
        .pop(),
      "1",
    );
  });

  await t.test("brand settings: seeded, public to read, admins only to change", () => {
    assert.equal(sql("anon", "{}", "select count(*) from public.brand_settings;").out, "67");
    const hide =
      "update public.brand_settings set hidden = true where slug = 'bmw' returning slug;";
    assert.equal(sql("anon", "{}", hide).ok, false, "anon: no write privilege");
    assert.equal(sql("authenticated", USER, hide).out, "", "non-admin: no row updated");
    assert.equal(sql("authenticated", ADMIN, hide).out, "bmw");
    assert.equal(
      sql(
        "authenticated",
        ADMIN,
        "insert into public.brand_settings (slug, favorite_rank) values ('audi', 1) on conflict (slug) do update set favorite_rank = 1 returning favorite_rank;",
      ).out,
      "1",
    );
  });
});
