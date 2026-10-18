// Supabase Edge Function `social-publish` (Deno). Deploy:
//   npx supabase functions deploy social-publish --project-ref <project-ref>
// Secrets (Edge Functions → Secrets): META_APP_ID and META_APP_SECRET (Meta app),
// then connect the Page from the admin (Connecteurs). Optional: META_GRAPH_VERSION
// (default v23.0); META_PAGE_ID / META_PAGE_TOKEN / META_IG_USER_ID as a manual
// alternative to the admin connection. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle, type Graph, type SocialDb } from "./handler.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const version = Deno.env.get("META_GRAPH_VERSION") || "v23.0";

const graph: Graph = async (path, params, method = "POST") => {
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [key, value] of Object.entries(params))
      if (value !== undefined) url.searchParams.set(key, String(value));
  } else {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(params);
  }
  const response = await fetch(url, init);
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const error = json["error"] as { message?: string } | undefined;
  if (!response.ok || error) throw new Error(error?.message ?? `Meta : erreur ${response.status}`);
  return json;
};

/** Same rules as public.is_admin(): admins, or super admins after their second factor. */
async function adminUser(token: string) {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const role = data.user.app_metadata?.["role"];
  if (role === "admin") return data.user.id;
  if (role !== "super_admin") return null;
  const claims = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  if (claims.aal === "aal2") return data.user.id;
  const { data: factor } = await admin
    .from("admin_second_factor")
    .select("session_id")
    .eq("session_id", claims.session_id ?? "")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return factor ? data.user.id : null;
}

const db: SocialDb = {
  adminUser,
  async connection() {
    const { data } = await admin.from("social_connection").select("*").maybeSingle();
    if (!data) return null;
    return {
      pageId: data.page_id,
      pageName: data.page_name,
      pagePicture: data.page_picture,
      pageToken: data.page_token,
      igUserId: data.ig_user_id,
      igUsername: data.ig_username,
      igPicture: data.ig_picture,
    };
  },
  async saveConnection(c, userId) {
    const { error } = await admin.from("social_connection").upsert({
      id: true,
      page_id: c.pageId,
      page_name: c.pageName,
      page_picture: c.pagePicture,
      page_token: c.pageToken,
      ig_user_id: c.igUserId,
      ig_username: c.igUsername,
      ig_picture: c.igPicture,
      connected_by: userId,
      connected_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
  async deleteConnection() {
    await admin.from("social_connection").delete().eq("id", true);
  },
  async setPending(userId, userToken) {
    const { error } = await admin.from("social_oauth_pending").upsert({
      user_id: userId,
      user_token: userToken,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    if (error) throw error;
  },
  async takePending(userId) {
    const { data } = await admin
      .from("social_oauth_pending")
      .delete()
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .select("user_token")
      .maybeSingle();
    return (data?.user_token as string | undefined) ?? null;
  },
  async carState(carId) {
    const { data } = await admin
      .from("cars")
      .select("published, sold")
      .eq("id", carId)
      .maybeSingle();
    return data ? { published: data.published as boolean, sold: data.sold as boolean } : null;
  },
  async claim(carId, platform) {
    const { data, error } = await admin
      .from("social_posts")
      .insert({ car_id: carId, platform })
      .select("id")
      .single();
    if (error?.code === "23505") return null; // already pending or published
    if (error) throw error;
    return data.id as string;
  },
  async finish(rowId, result) {
    const { error } = await admin
      .from("social_posts")
      .update(
        result.status === "published"
          ? { status: "published", external_id: result.externalId, permalink: result.permalink }
          : { status: "failed", error: result.error },
      )
      .eq("id", rowId);
    if (error) console.error(error);
  },
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  try {
    const result = await handle(token, await request.json().catch(() => ({})), {
      db,
      graph,
      config: {
        pageId: Deno.env.get("META_PAGE_ID"),
        pageToken: Deno.env.get("META_PAGE_TOKEN"),
        igUserId: Deno.env.get("META_IG_USER_ID"),
      },
      app: {
        appId: Deno.env.get("META_APP_ID"),
        appSecret: Deno.env.get("META_APP_SECRET"),
        loginConfigId: Deno.env.get("META_LOGIN_CONFIG_ID"),
      },
      background: (work) => EdgeRuntime.waitUntil(work),
    });
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Opération impossible." }, { status: 500 });
  }
});
