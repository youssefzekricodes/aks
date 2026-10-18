// Unit tests for the admin-users Edge Function logic (no Supabase needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, type AdminApi, type AuthUser } from "../supabase/functions/admin-users/handler.ts";

const token = (claims: Record<string, unknown>) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
const AAL2 = token({ aal: "aal2" });
const AAL1 = token({ aal: "aal1" });
const EMAIL_CONFIRMED = token({ aal: "aal1", session_id: "confirmed" });
const EMAIL_PENDING = token({ aal: "aal1", session_id: "other" });

function fakeApi(caller: AuthUser | null, users: AuthUser[]) {
  const calls: string[] = [];
  const api: AdminApi = {
    getUser: async () => caller,
    listUsers: async () => users,
    createUser: async (email, _password, role) => void calls.push(`create ${email} ${role}`),
    updateUser: async (id, changes) =>
      void calls.push(`update ${id} ${changes.password ? "password" : ""}${changes.role ?? ""}`),
    deleteUser: async (id) => void calls.push(`delete ${id}`),
    revokeSessions: async (id) => void calls.push(`revoke ${id}`),
    hasEmailSecondFactor: async (sessionId, userId) =>
      sessionId === "confirmed" && userId === caller?.id,
  };
  return { api, calls };
}

const superAdmin: AuthUser = {
  id: "s1",
  email: "boss@aks.tn",
  app_metadata: { role: "super_admin" },
  factors: [{ status: "verified", factor_type: "totp" }],
};
const admin: AuthUser = { id: "a1", email: "staff@aks.tn", app_metadata: { role: "admin" } };
const customer: AuthUser = { id: "c1", email: "someone@example.tn", app_metadata: {} };
const everyone = [superAdmin, admin, customer];

test("refuses missing sessions, non super admins and super admins without 2FA", async () => {
  assert.equal((await handle(null, { action: "list" }, fakeApi(null, everyone).api)).status, 401);
  assert.equal((await handle(AAL2, { action: "list" }, fakeApi(null, everyone).api)).status, 401);
  assert.equal((await handle(AAL2, { action: "list" }, fakeApi(admin, everyone).api)).status, 403);
  const noMfa = await handle(AAL1, { action: "list" }, fakeApi(superAdmin, everyone).api);
  assert.equal(noMfa.status, 403);
  assert.match(String((noMfa.body as { error: string }).error), /double authentification/);
});

test("lists only administrators, with their 2FA methods", async () => {
  const result = await handle(AAL2, { action: "list" }, fakeApi(superAdmin, everyone).api);
  assert.equal(result.status, 200);
  const admins = (result.body as { admins: { email: string; mfa: string[]; isSelf: boolean }[] })
    .admins;
  assert.deepEqual(
    admins.map((a) => a.email),
    ["boss@aks.tn", "staff@aks.tn"],
  );
  assert.deepEqual(admins[0]!.mfa, ["totp"]);
  assert.equal(admins[0]!.isSelf, true);
});

test("creates admins with validation", async () => {
  const { api, calls } = fakeApi(superAdmin, everyone);
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "create", email: "new@aks.tn", password: "short", role: "admin" },
        api,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "create", email: "STAFF@aks.tn", password: "a-long-password-1", role: "admin" },
        api,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "create", email: "new@aks.tn", password: "a-long-password-1", role: "owner" },
        api,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "create", email: "New@aks.tn", password: "a-long-password-1", role: "admin" },
        api,
      )
    ).status,
    200,
  );
  assert.deepEqual(calls, ["create new@aks.tn admin"]);
});

test("resetting another admin's password signs them out everywhere", async () => {
  const { api, calls } = fakeApi(superAdmin, everyone);
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "reset_password", userId: "c1", password: "a-long-password-1" },
        api,
      )
    ).status,
    404,
    "not an admin",
  );
  assert.equal(
    (
      await handle(
        AAL2,
        { action: "reset_password", userId: "a1", password: "a-long-password-1" },
        api,
      )
    ).status,
    200,
  );
  assert.deepEqual(calls, ["update a1 password", "revoke a1"]);
});

test("cannot demote or delete yourself, or remove the last super admin", async () => {
  const { api, calls } = fakeApi(superAdmin, everyone);
  assert.equal(
    (await handle(AAL2, { action: "set_role", userId: "s1", role: "admin" }, api)).status,
    400,
  );
  assert.equal((await handle(AAL2, { action: "delete", userId: "s1" }, api)).status, 400);
  const otherSuper: AuthUser = {
    id: "s2",
    email: "co@aks.tn",
    app_metadata: { role: "super_admin" },
  };
  const two = fakeApi(superAdmin, [...everyone, otherSuper]);
  assert.equal((await handle(AAL2, { action: "delete", userId: "s2" }, two.api)).status, 200);
  assert.deepEqual(two.calls, ["revoke s2", "delete s2"]);
  assert.equal(
    (await handle(AAL2, { action: "set_role", userId: "a1", role: "super_admin" }, api)).status,
    200,
  );
  assert.deepEqual(calls, ["update a1 super_admin", "revoke a1"]);
});

test("a session confirmed by e-mail code counts as the second factor", async () => {
  const ok = await handle(EMAIL_CONFIRMED, { action: "list" }, fakeApi(superAdmin, everyone).api);
  assert.equal(ok.status, 200);
  const pending = await handle(
    EMAIL_PENDING,
    { action: "list" },
    fakeApi(superAdmin, everyone).api,
  );
  assert.equal(pending.status, 403);
});
