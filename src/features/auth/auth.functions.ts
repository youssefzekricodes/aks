import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auth = () => import("@/server/auth");

export const signIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(256),
    }),
  )
  .handler(async ({ data }) => (await auth()).login(data.email, data.password));
export const signOut = createServerFn({ method: "POST" }).handler(async () =>
  (await auth()).logout(),
);
/** `{ id, email, role, mfa: "ok" | "verify" | "enroll", factors }` or null. */
export const getSession = createServerFn({ method: "GET" }).handler(async () =>
  (await auth()).currentAdmin(),
);

/** Profile photo of the signed-in admin (an uploaded "avatar" file), or null to remove it. */
export const setAvatar = createServerFn({ method: "POST" })
  .validator(z.object({ url: z.string().url().max(500).nullable() }))
  .handler(async ({ data }) => (await auth()).setAvatar(data.url));

/* "Mon profil": name and e-mail of the signed-in admin. */
export const getProfile = createServerFn({ method: "GET" }).handler(async () =>
  (await auth()).profile(),
);
export const setName = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().max(200) }))
  .handler(async ({ data }) => (await auth()).setName(data.name));
export const changeEmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
    }),
  )
  .handler(async ({ data }) => (await auth()).changeEmail(data.email));

/* Two-factor authentication (Supabase MFA: SMS or authenticator app). */
const factorId = z.string().uuid();
export const mfaEnroll = createServerFn({ method: "POST" })
  .validator(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("totp") }),
      z.object({
        type: z.literal("phone"),
        // E.164, e.g. +21652144869
        phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Numéro au format international (+216…)."),
      }),
    ]),
  )
  .handler(async ({ data }) => (await auth()).mfaEnroll(data));
export const mfaChallenge = createServerFn({ method: "POST" })
  .validator(z.object({ factorId }))
  .handler(async ({ data }) => (await auth()).mfaChallenge(data.factorId));
export const mfaVerify = createServerFn({ method: "POST" })
  .validator(
    z.object({ factorId, challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }),
  )
  .handler(async ({ data }) =>
    (await auth()).mfaVerify(data.factorId, data.challengeId, data.code),
  );
export const mfaRemove = createServerFn({ method: "POST" })
  .validator(z.object({ factorId }))
  .handler(async ({ data }) => (await auth()).mfaRemove(data.factorId));

export const emailCodeSend = createServerFn({ method: "POST" }).handler(async () =>
  (await auth()).emailCodeSend(),
);
export const emailCodeVerify = createServerFn({ method: "POST" })
  // Supabase e-mail codes have 6 to 10 digits (project setting).
  .validator(z.object({ code: z.string().regex(/^\d{6,10}$/) }))
  .handler(async ({ data }) => (await auth()).emailCodeVerify(data.code));

/* Administrator management (super admin, via the admin-users Edge Function). */
export type AdminAccount = {
  id: string;
  email: string;
  /** Display name; absent until the admin-users function is redeployed. */
  name?: string | null;
  role: "admin" | "super_admin";
  createdAt: string | null;
  lastSignInAt: string | null;
  mfa: string[];
  isSelf: boolean;
};
const role = z.enum(["admin", "super_admin"]);
const password = z.string().min(12, "12 caractères minimum.").max(256);
const userId = z.string().uuid();

export const listAdmins = createServerFn({ method: "GET" }).handler(
  async () =>
    ((await (await auth()).manageAdmins({ action: "list" })) as { admins: AdminAccount[] }).admins,
);
const name = z.string().max(200);
export const createAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({ email: z.string().trim().email().max(254), password, role, name: name.optional() }),
  )
  .handler(async ({ data }) => (await auth()).manageAdmins({ action: "create", ...data }));
export const resetAdminPassword = createServerFn({ method: "POST" })
  .validator(z.object({ userId, password }))
  .handler(async ({ data }) => (await auth()).manageAdmins({ action: "reset_password", ...data }));
export const setAdminName = createServerFn({ method: "POST" })
  .validator(z.object({ userId, name }))
  .handler(async ({ data }) => (await auth()).manageAdmins({ action: "set_name", ...data }));
export const setAdminRole = createServerFn({ method: "POST" })
  .validator(z.object({ userId, role }))
  .handler(async ({ data }) => (await auth()).manageAdmins({ action: "set_role", ...data }));
export const deleteAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ userId }))
  .handler(async ({ data }) => (await auth()).manageAdmins({ action: "delete", ...data }));

/* Push notifications (new e-mails, new requests) on this device. */
const push = () => import("@/server/push");
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () =>
  (await push()).pushConfig(),
);
export const savePushSubscription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      endpoint: z.string().url().max(2000).startsWith("https://"),
      keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
      locale: z.enum(["fr", "ar"]),
    }),
  )
  .handler(async ({ data }) => (await push()).subscribe(data));
export const removePushSubscription = createServerFn({ method: "POST" })
  .validator(z.object({ endpoint: z.string().max(2000) }))
  .handler(async ({ data }) => (await push()).unsubscribe(data.endpoint));
export const sendTestPush = createServerFn({ method: "POST" }).handler(async () =>
  (await push()).sendTest(),
);
export const getNotificationHealth = createServerFn({ method: "GET" }).handler(async () =>
  (await push()).health(),
);
