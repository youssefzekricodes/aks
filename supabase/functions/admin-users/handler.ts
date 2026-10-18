// Administrator management, run inside Supabase as the `admin-users` Edge
// Function (it holds the service-role key; the web server never does).
// Pure logic with injected dependencies so it can be unit-tested in Node.

export type Role = "admin" | "super_admin";
export const ROLES: Role[] = ["admin", "super_admin"];

export type AuthUser = {
  id: string;
  email?: string | undefined;
  app_metadata?: Record<string, unknown> | undefined;
  created_at?: string | undefined;
  last_sign_in_at?: string | null | undefined;
  factors?: { status: string; factor_type: string }[] | undefined;
};

/** What the handler needs from Supabase (service role), injected by index.ts. */
export type AdminApi = {
  getUser(token: string): Promise<AuthUser | null>;
  listUsers(): Promise<AuthUser[]>;
  createUser(email: string, password: string, role: Role): Promise<void>;
  updateUser(id: string, changes: { password?: string; role?: Role }): Promise<void>;
  deleteUser(id: string): Promise<void>;
  revokeSessions(id: string): Promise<void>;
  /** Session confirmed with an e-mail code (public.admin_second_factor). */
  hasEmailSecondFactor(sessionId: string, userId: string): Promise<boolean>;
};

export type Result = { status: number; body: unknown };

const fail = (status: number, error: string): Result => ({ status, body: { error } });
const roleOf = (user: AuthUser) => user.app_metadata?.["role"] as Role | undefined;
const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPassword(password: unknown) {
  return typeof password === "string" && password.length >= 12 && password.length <= 256;
}

/** Reads the (already verified) JWT payload for the assurance level. */
export function tokenClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function handle(token: string | null, body: unknown, api: AdminApi): Promise<Result> {
  if (!token) return fail(401, "Connexion requise.");
  // getUser validates the token with Supabase Auth; only then are its claims trusted.
  const caller = await api.getUser(token);
  if (!caller) return fail(401, "Session expirée. Reconnectez-vous.");
  if (roleOf(caller) !== "super_admin") return fail(403, "Réservé au super administrateur.");
  const claims = tokenClaims(token);
  const secondFactor =
    claims["aal"] === "aal2" ||
    (typeof claims["session_id"] === "string" &&
      (await api.hasEmailSecondFactor(claims["session_id"], caller.id)));
  if (!secondFactor) return fail(403, "Validez la double authentification pour continuer.");

  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const users = await api.listUsers();
  const admins = users.filter((u) => isRole(roleOf(u)));
  const target =
    typeof input["userId"] === "string" ? admins.find((u) => u.id === input["userId"]) : undefined;
  const superAdmins = admins.filter((u) => roleOf(u) === "super_admin");

  switch (input["action"]) {
    case "list":
      return {
        status: 200,
        body: {
          admins: admins
            .map((u) => ({
              id: u.id,
              email: u.email ?? "",
              role: roleOf(u),
              createdAt: u.created_at ?? null,
              lastSignInAt: u.last_sign_in_at ?? null,
              mfa: (u.factors ?? [])
                .filter((f) => f.status === "verified")
                .map((f) => f.factor_type),
              isSelf: u.id === caller.id,
            }))
            .sort((a, b) => a.email.localeCompare(b.email)),
        },
      };

    case "create": {
      const email = String(input["email"] ?? "")
        .trim()
        .toLowerCase();
      if (!EMAIL.test(email) || email.length > 254) return fail(400, "Adresse e-mail non valide.");
      if (!checkPassword(input["password"]))
        return fail(400, "Mot de passe : 12 à 256 caractères.");
      if (!isRole(input["role"])) return fail(400, "Rôle non valide.");
      if (users.some((u) => u.email?.toLowerCase() === email))
        return fail(409, "Un compte existe déjà avec cette adresse.");
      await api.createUser(email, input["password"] as string, input["role"]);
      return { status: 200, body: { ok: true } };
    }

    case "reset_password": {
      if (!target) return fail(404, "Administrateur introuvable.");
      if (!checkPassword(input["password"]))
        return fail(400, "Mot de passe : 12 à 256 caractères.");
      await api.updateUser(target.id, { password: input["password"] as string });
      // Everyone using the old password is signed out (the caller keeps their session).
      if (target.id !== caller.id) await api.revokeSessions(target.id);
      return { status: 200, body: { ok: true } };
    }

    case "set_role": {
      if (!target) return fail(404, "Administrateur introuvable.");
      if (!isRole(input["role"])) return fail(400, "Rôle non valide.");
      if (target.id === caller.id)
        return fail(400, "Vous ne pouvez pas changer votre propre rôle.");
      await api.updateUser(target.id, { role: input["role"] });
      await api.revokeSessions(target.id); // new role applies at next sign-in
      return { status: 200, body: { ok: true } };
    }

    case "delete": {
      if (!target) return fail(404, "Administrateur introuvable.");
      if (target.id === caller.id)
        return fail(400, "Vous ne pouvez pas supprimer votre propre compte.");
      if (roleOf(target) === "super_admin" && superAdmins.length <= 1)
        return fail(400, "Il doit rester au moins un super administrateur.");
      await api.revokeSessions(target.id);
      await api.deleteUser(target.id);
      return { status: 200, body: { ok: true } };
    }

    default:
      return fail(400, "Action inconnue.");
  }
}
