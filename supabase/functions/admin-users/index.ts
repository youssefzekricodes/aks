// Supabase Edge Function `admin-users` (Deno). Deploy:
//   npx supabase functions deploy admin-users --project-ref <project-ref>
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle, type AdminApi, type AuthUser, type Role } from "./handler.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const api: AdminApi = {
  async getUser(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : (data.user as AuthUser);
  },
  async listUsers() {
    const all: AuthUser[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      all.push(...(data.users as AuthUser[]));
      if (data.users.length < 200) return all;
    }
  },
  async createUser(email, password, role: Role, name) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      ...(name ? { user_metadata: { full_name: name } } : {}),
    });
    if (error) throw error;
  },
  async updateUser(id, changes) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ...(changes.password ? { password: changes.password } : {}),
      ...(changes.role ? { app_metadata: { role: changes.role } } : {}),
      // Merged with the rest of the profile (the photo is kept).
      ...(changes.name !== undefined ? { user_metadata: { full_name: changes.name } } : {}),
    });
    if (error) throw error;
  },
  async deleteUser(id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  },
  async revokeSessions(id) {
    const { error } = await admin.rpc("revoke_user_sessions", { p_user_id: id });
    if (error) throw error;
  },
  async hasEmailSecondFactor(sessionId, userId) {
    const { data, error } = await admin
      .from("admin_second_factor")
      .select("session_id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  try {
    const result = await handle(token, await request.json().catch(() => ({})), api);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && /weak|password/i.test(error.message)
        ? "Mot de passe refusé par la politique de sécurité de Supabase."
        : "Opération impossible.";
    return Response.json({ error: message }, { status: 500 });
  }
});
