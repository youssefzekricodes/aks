import "@tanstack/react-start/server-only";
import { adminClient } from "./auth";
import { currentAdmin } from "./auth";
import { mailboxSettings } from "./mail-core";
import { WATCH_STATUS, type WatchStatus } from "./mail-watch";
import {
  listSubscriptions,
  notifyAdmins,
  pushKeys,
  pushStore,
  removeSubscription,
  saveSubscription,
} from "./push-core";
import { sessionClient } from "./supabase";

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
  const first = !(await listSubscriptions()).some((s) => s.userId === userId);
  await saveSubscription({ ...input, userId, createdAt: new Date().toISOString() });
  // First device of this admin: a welcome, which also shows it works.
  if (first) {
    const admin = await currentAdmin(sessionClient(), { withFactors: false });
    const name = admin?.name?.split(" ")[0] ?? "";
    await notifyAdmins(
      {
        type: "welcome",
        title: {
          fr: name ? `Bienvenue, ${name} !` : "Bienvenue sur AKS Admin !",
          ar: name ? `مرحبا بيك، ${name}!` : "مرحبا بيك في AKS Admin!",
        },
        body: {
          fr: "Vous serez prévenu ici des nouveaux e-mails, des demandes et de l’activité des véhicules.",
          ar: "باش يوصلك هنا تنبيه بالإيميلات، الطلبات وكل حركة في الكراهب.",
        },
        url: "/admin",
        tag: "welcome",
      },
      { onlyUserId: userId },
    );
  }
  return { ok: true, welcomed: first };
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
    { onlyUserId: userId },
  );
  return result;
}

/**
 * "Vérifier": the state of everything notifications depend on, in one answer
 * (server keys, shared storage, devices, mailbox, last automatic e-mail check).
 */
export async function health() {
  const userId = await signedInAdminId(false);
  const store = await pushStore();
  const devices = await listSubscriptions();
  let mailbox: { configured: boolean; ok?: boolean; unread?: number; error?: string } = {
    configured: Boolean(mailboxSettings()),
  };
  if (mailbox.configured)
    try {
      const status = await (await import("./mailbox")).status();
      mailbox = { configured: true, ok: true, unread: status.unread };
    } catch (error) {
      mailbox = {
        configured: true,
        ok: false,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
      };
    }
  return {
    push: {
      configured: Boolean(pushKeys()),
      storage: store.kind,
      devices: devices.length,
      myDevices: devices.filter((d) => d.userId === userId).length,
    },
    mailbox,
    watch: (await store.get<WatchStatus>(WATCH_STATUS)) ?? null,
  };
}
