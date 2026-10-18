import "@tanstack/react-start/server-only";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { env } from "./env";
import { isAllowedOrigin } from "./origin";
import { isolatedClient, sessionClient, type Db } from "./supabase";

/** Mutations must come from the site itself (CSRF defence in addition to SameSite cookies). */
export function checkOrigin() {
  const request = getRequest();
  const origin = request.headers.get("origin");
  const result = isAllowedOrigin(origin, {
    url: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    appOrigin: env.appOrigin,
  });
  if (!result.ok) {
    console.error(
      `Origine refusée : ${origin ?? "(aucune)"} — acceptées : ${result.allowed.join(", ")}`,
    );
    throw new Error("Origine non autorisée.");
  }
}

export type Role = "admin" | "super_admin";
/**
 * "ok": full access. Super admins also need a second factor:
 * "verify" (has a factor, must enter a code) or "enroll" (must set one up first).
 */
export type MfaState = "ok" | "verify" | "enroll";
export type Factor = { id: string; type: "email" | "totp" | "phone"; label: string };

/** The e-mail code is always available to a super admin (its id is not a Supabase factor). */
export const EMAIL_FACTOR_ID = "email";
const maskEmail = (email: string) =>
  email.replace(
    /^(.)(.*)(@.*)$/,
    (_, first: string, rest: string, domain: string) =>
      `${first}${"•".repeat(Math.min(rest.length, 6))}${domain}`,
  );
export type Admin = { id: string; email: string; role: Role; mfa: MfaState; factors: Factor[] };

const roleOf = (user: { app_metadata?: Record<string, unknown> } | null | undefined) => {
  const role = user?.app_metadata?.["role"];
  return role === "admin" || role === "super_admin" ? (role as Role) : null;
};

async function factorsOf(supabase: Db): Promise<Factor[]> {
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.all ?? [])
    .filter((f) => f.status === "verified")
    .map((f) => ({
      id: f.id,
      type: f.factor_type === "phone" ? "phone" : "totp",
      label:
        f.factor_type === "phone"
          ? `SMS ${String((f as { phone?: string }).phone ?? "").replace(/.(?=.{2})/g, "•")}`
          : f.friendly_name || "Application d’authentification",
    }));
}

/**
 * Sessions confirmed by an e-mail code, remembered briefly so each admin request
 * does not ask the database again (an ended session stops working within this delay).
 */
const CONFIRMED_TTL_MS = 5 * 60_000;
const confirmedSessions = new Map<string, number>();
async function emailConfirmed(supabase: Db, sessionId: string | undefined) {
  const now = Date.now();
  if (sessionId && (confirmedSessions.get(sessionId) ?? 0) > now) return true;
  const { data } = await supabase.rpc("has_email_second_factor");
  if (data === true && sessionId) {
    if (confirmedSessions.size > 500) confirmedSessions.clear();
    confirmedSessions.set(sessionId, now + CONFIRMED_TTL_MS);
  }
  return data === true;
}

/**
 * Signed-in administrator, or null. The session token is verified locally
 * (Supabase's asymmetric signing keys, cached), so no round trip to Supabase Auth
 * per request. `withFactors` also lists the super admin's 2FA methods (one call
 * to Supabase): needed by the login page and "Ma sécurité", not by data requests.
 * Pass the request's client so a token refreshed here is the one used afterwards.
 */
export async function currentAdmin(
  supabase: Db = sessionClient(),
  { withFactors = true } = {},
): Promise<Admin | null> {
  setResponseHeader("Cache-Control", "no-store");
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) return null;
  const role = roleOf({ app_metadata: claims.app_metadata as Record<string, unknown> });
  if (!role) return null;
  const email = typeof claims.email === "string" ? claims.email : "";
  let mfa: MfaState = "ok";
  let factors: Factor[] = [];
  if (role === "super_admin") {
    const verified =
      claims.aal === "aal2" ||
      (await emailConfirmed(supabase, claims.session_id as string | undefined));
    if (!verified) mfa = "verify";
    if (withFactors || !verified)
      factors = [
        { id: EMAIL_FACTOR_ID, type: "email", label: `E-mail ${maskEmail(email)}` },
        ...(await factorsOf(supabase)),
      ];
  }
  return { id: claims.sub, email, role, mfa, factors };
}

/** Session client for an admin request; throws unless fully signed in (incl. 2FA). */
export async function adminClient({ write = false } = {}) {
  if (write) checkOrigin();
  const supabase = sessionClient();
  const admin = await currentAdmin(supabase, { withFactors: false });
  if (!admin) throw new Error("Connexion administrateur requise.");
  if (admin.mfa !== "ok") throw new Error("Validez la double authentification pour continuer.");
  return supabase;
}

export async function login(email: string, password: string) {
  checkOrigin();
  const supabase = sessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Same message whatever failed, so the form does not reveal which accounts exist.
  if (error || !roleOf(data.user)) {
    if (data.session) await supabase.auth.signOut();
    throw new Error(
      error?.status === 429
        ? "Trop de tentatives. Veuillez réessayer plus tard."
        : "E-mail ou mot de passe incorrect.",
    );
  }
  setResponseHeader("Cache-Control", "no-store");
  const admin = await currentAdmin(supabase);
  return { mfa: admin?.mfa ?? "ok", factors: admin?.factors ?? [] };
}

export async function logout() {
  checkOrigin();
  await sessionClient().auth.signOut();
  return { ok: true };
}

/* ------------------------------------------------------------------ two-factor (Supabase MFA) */

/** Any signed-in administrator, before or after the second factor. */
async function signedIn() {
  checkOrigin();
  const supabase = sessionClient();
  const admin = await currentAdmin(supabase);
  if (!admin) throw new Error("Connexion administrateur requise.");
  return { supabase, admin };
}

function mfaError(
  error: { message?: string | undefined; status?: number | undefined } | null,
  fallback: string,
): never {
  const message = error?.message ?? "";
  if (/phone|sms|provider/i.test(message))
    throw new Error(
      "Les SMS ne sont pas activés sur le projet Supabase. Utilisez une application d’authentification ou activez un fournisseur SMS.",
    );
  if (/invalid|expired|code/i.test(message)) throw new Error("Code incorrect ou expiré.");
  if (error?.status === 429) throw new Error("Trop de tentatives. Patientez puis réessayez.");
  console.error(error);
  throw new Error(fallback);
}

/** Starts setting up a second factor. TOTP returns a QR code; phone sends nothing yet. */
export async function mfaEnroll(input: { type: "totp" } | { type: "phone"; phone: string }) {
  const { supabase } = await signedIn();
  // Abandoned set-ups block new ones with the same name: clear unverified factors first.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? [])
    if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });

  if (input.type === "totp") {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      // Names must be unique per user: date + time + random suffix.
      friendlyName: `Application ${new Date().toISOString().slice(0, 16).replace("T", " ")} ${crypto.randomUUID().slice(0, 4)}`,
      issuer: "Auto Kontor Sfax",
    });
    if (error || !data) mfaError(error, "Activation impossible.");
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  }
  const digits = (value: string | undefined) => (value ?? "").replace(/\D/g, "");
  if (
    (existing?.all ?? []).some(
      (f) =>
        f.status === "verified" &&
        f.factor_type === "phone" &&
        digits((f as { phone?: string }).phone) === digits(input.phone),
    )
  )
    throw new Error("Ce numéro est déjà configuré pour la double authentification.");
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "phone",
    phone: input.phone,
  });
  if (error || !data) mfaError(error, "Activation impossible.");
  return { factorId: data.id, qrCode: null, secret: null };
}

/** Creates a challenge; for a phone factor this sends the SMS. */
export async function mfaChallenge(factorId: string) {
  const { supabase } = await signedIn();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error || !data) mfaError(error, "Envoi du code impossible.");
  return { challengeId: data.id };
}

/** Verifies the code; on success the session is upgraded to aal2 (cookies updated). */
export async function mfaVerify(factorId: string, challengeId: string, code: string) {
  const { supabase } = await signedIn();
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) mfaError(error, "Vérification impossible.");
  return { ok: true };
}

/* E-mail code (see supabase/migrations/…_email_2fa.sql for the scheme). */

/** Sends a 6-digit code to the signed-in super admin's address (Supabase e-mail OTP). */
export async function emailCodeSend() {
  const { admin } = await signedIn();
  if (admin.role !== "super_admin" || !admin.email) throw new Error("Méthode indisponible.");
  const { error } = await isolatedClient().auth.signInWithOtp({
    email: admin.email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    // Supabase allows one code per minute: the previous code is still the valid one.
    if (error.status === 429) return { ok: true, alreadySent: true };
    console.error(error);
    throw new Error("Envoi de l’e-mail impossible. Vérifiez la configuration e-mail de Supabase.");
  }
  return { ok: true, alreadySent: false };
}

/**
 * Checks the code: it opens a second session (B) for the same user, which the
 * password session confirms as two-factor; the browser then keeps B only.
 */
export async function emailCodeVerify(code: string) {
  const { supabase, admin } = await signedIn();
  if (admin.role !== "super_admin" || !admin.email) throw new Error("Méthode indisponible.");
  const otp = isolatedClient();
  const { data, error } = await otp.auth.verifyOtp({
    email: admin.email,
    token: code,
    type: "email",
  });
  const session = data.session;
  if (error || !session) {
    console.error("Code e-mail refusé :", error?.status, error?.code, error?.message);
    if (error?.status === 429) throw new Error("Trop de tentatives. Patientez puis réessayez.");
    // Supabase answers "otp_expired" for a wrong code too ("expired or invalid").
    throw new Error(
      "Code refusé : vérifiez les chiffres et utilisez le code du dernier e-mail reçu (chaque nouvel envoi remplace le précédent).",
    );
  }
  const sessionId = jwtClaims(session.access_token)["session_id"];
  const { error: confirmError } = await supabase.rpc("confirm_email_second_factor", {
    p_session_id: sessionId,
  });
  if (confirmError) {
    await otp.auth.signOut({ scope: "local" });
    console.error(confirmError);
    if (confirmError.code === "PGRST202")
      throw new Error(
        "Double authentification non installée : exécutez la migration 20261018190000_email_2fa.sql dans Supabase.",
      );
    throw new Error("Vérification impossible. Reconnectez-vous puis réessayez.");
  }
  // Swap the cookies to the confirmed session and end the password-only one.
  await supabase.auth.signOut({ scope: "local" });
  const { error: swapError } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (swapError) throw new Error("Vérification impossible. Reconnectez-vous puis réessayez.");
  return { ok: true };
}

/** Payload of a JWT that Supabase just issued (not used for any trust decision here). */
function jwtClaims(token: string): Record<string, unknown> {
  try {
    return JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Removes one of your factors (only after 2FA, and never the last one of a super admin). */
export async function mfaRemove(factorId: string) {
  const { supabase, admin } = await signedIn();
  if (admin.mfa !== "ok") throw new Error("Validez la double authentification pour continuer.");
  if (factorId === EMAIL_FACTOR_ID) throw new Error("Le code par e-mail ne peut pas être retiré.");
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) mfaError(error, "Suppression impossible.");
  return { ok: true };
}

/* ------------------------------------------------------------------ administrator management */

/**
 * Calls a Supabase Edge Function with the signed-in administrator's access token;
 * the function re-checks the role itself. Errors carry the function's message.
 */
export async function callEdgeFunction(
  name: string,
  payload: Record<string, unknown>,
  { superAdmin = false, write = true } = {},
) {
  if (write) checkOrigin();
  const supabase = sessionClient();
  const admin = await currentAdmin(supabase, { withFactors: false });
  if (!admin) throw new Error("Connexion administrateur requise.");
  if (superAdmin && admin.role !== "super_admin")
    throw new Error("Réservé au super administrateur.");
  if (admin.mfa !== "ok") throw new Error("Validez la double authentification pour continuer.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  const response = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => null);
  if (!response) throw new Error("Service Supabase injoignable.");
  if (response.status === 404)
    throw new Error(`La fonction « ${name} » n’est pas déployée sur Supabase (voir README).`);
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Opération impossible.");
  return body;
}

/** Administrator management: the `admin-users` Edge Function (service role inside Supabase). */
export function manageAdmins(payload: Record<string, unknown>) {
  return callEdgeFunction("admin-users", payload, {
    superAdmin: true,
    write: payload["action"] !== "list",
  });
}
