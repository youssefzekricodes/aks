import "@tanstack/react-start/server-only";
import { adminClient } from "./auth";
import { notifyAdmins, pushKeys, removeSubscription, saveSubscription } from "./push-core";

/* Admin side of the push notifications: switch them on or off for this device. */

async function signedInAdminId(write: boolean) {
  const supabase = await adminClient({ write });
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) throw new Error("Connexion administrateur requise.");
  return id;
}

/** Public key the browser needs to subscribe; null when push is not set up. */
export async function pushConfig() {
  await signedInAdminId(false);
  return { publicKey: pushKeys()?.publicKey ?? null };
}

export async function subscribe(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  locale: "fr" | "ar";
}) {
  const userId = await signedInAdminId(true);
  if (!pushKeys()) throw new Error("Notifications non configurées sur le serveur.");
  await saveSubscription({ ...input, userId, createdAt: new Date().toISOString() });
  return { ok: true };
}

export async function unsubscribe(endpoint: string) {
  const userId = await signedInAdminId(true);
  await removeSubscription(endpoint, userId);
  return { ok: true };
}

/** "Envoyer un test": a notification to this admin's devices only. */
export async function sendTest() {
  const userId = await signedInAdminId(true);
  const result = await notifyAdmins(
    {
      type: "test",
      title: { fr: "Notifications activées", ar: "التنبيهات خدامة" },
      body: {
        fr: "Vous serez prévenu des nouveaux e-mails et des nouvelles demandes.",
        ar: "باش يوصلك تنبيه كي يجي إيميل ولا طلب جديد.",
      },
      url: "/admin",
      tag: "test",
    },
    userId,
  );
  return result;
}
