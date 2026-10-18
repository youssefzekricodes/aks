import "@tanstack/react-start/server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { env } from "./env";

/**
 * No generated database types: rows are mapped explicitly in repository.ts and
 * the schema itself (constraints + RLS) is the source of truth.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, "public", any>;

/**
 * Client bound to the visitor's session cookies (admin requests). The JWT it
 * carries is what RLS checks; cookies are HttpOnly because no browser code
 * talks to Supabase directly.
 */
export function sessionClient(): Db {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies)
          setCookie(name, value, {
            ...options,
            httpOnly: true,
            secure: env.production,
            sameSite: "strict",
            path: "/",
          });
      },
    },
  });
}

let anon: Db | undefined;
/** Session-less client for public reads and the public inquiry RPC. */
export function publicClient(): Db {
  return (anon ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}

/** One-off anonymous client for a sign-in whose session must not leak into `publicClient`. */
export function isolatedClient(): Db {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Supabase/PostgREST errors carry French messages raised by our SQL; keep those, hide the rest. */
export function failure(
  error: { message?: string; code?: string } | null,
  fallback: string,
): never {
  const message = error?.message ?? "";
  const ours = error?.code === "P0001" || error?.code === "P0002" || error?.code === "22023";
  if (error?.code === "23505") throw new Error("Cet identifiant d’URL est déjà utilisé.");
  if (error?.code === "42501") throw new Error("Connexion administrateur requise.");
  if (!ours) console.error(error);
  throw new Error(ours && message ? message : fallback);
}
