import "@tanstack/react-start/server-only";

/**
 * Server configuration, read lazily so a missing variable fails the request that
 * needs it with a clear message instead of crashing the whole server at boot.
 * Only public keys live here: the Supabase service-role key is used by the
 * maintenance scripts, never by the web server.
 */
function required(name: string) {
  const value = process.env[name];
  if (!value) {
    const message = `Configuration manquante : ${name}`;
    console.error(`${message} — renseignez-la dans .env (voir .env.example et README).`);
    throw new Error(message);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  /** Anon / publishable key: safe for the browser, RLS decides what it can do. */
  get supabaseAnonKey() {
    return required("SUPABASE_ANON_KEY");
  },
  get r2() {
    return {
      accountId: required("R2_ACCOUNT_ID"),
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      bucket: required("R2_BUCKET"),
      publicUrl: required("R2_PUBLIC_URL").replace(/\/+$/, ""),
    };
  },
  get appOrigin() {
    return process.env["APP_ORIGIN"] || null;
  },
  get production() {
    return process.env["NODE_ENV"] === "production";
  },
};
