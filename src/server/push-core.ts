import webpush from "web-push";

/*
 * Push notifications to the admins' phones and computers (Web Push). Each device
 * that switched notifications on is remembered in Netlify Blobs (no database
 * change, no Supabase key on the web server); the messages are signed with the
 * site's VAPID key pair (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY settings).
 * Framework-free: used by the web server and by the scheduled e-mail check.
 */

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId: string;
  /** Language of the admin on that device: the notification text follows it. */
  locale: "fr" | "ar";
  createdAt: string;
};

export type PushMessage = {
  /** Kind of news: the app refreshes the matching data when it is open. */
  type: "mail" | "lead" | "car" | "welcome" | "admin" | "test";
  title: { fr: string; ar: string };
  body: { fr: string; ar: string };
  /** Page opened when the notification is tapped. */
  url: string;
  /** Same tag: a newer notification replaces the older one. */
  tag?: string;
};

/** Small key-value store: Netlify Blobs on Netlify, a local file in development. */
type Store = {
  /** "netlify": shared by every server function; "file": this machine only (development). */
  kind: "netlify" | "file";
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
};

let storePromise: Promise<Store> | null = null;
export function pushStore(): Promise<Store> {
  storePromise ??= (async (): Promise<Store> => {
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "admin-push", consistency: "strong" });
      // Throws outside Netlify (no Blobs environment).
      await store.get("probe");
      return {
        kind: "netlify",
        get: async <T>(key: string) => ((await store.get(key, { type: "json" })) as T) ?? null,
        set: async (key, value) => {
          await store.setJSON(key, value);
        },
      };
    } catch (error) {
      // On Netlify this must not happen (devices would not be shared): say so loudly.
      if (process.env["NETLIFY"] || process.env["SITE_ID"])
        console.error("[push] Netlify Blobs indisponible", error);
      const { readFile, writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { tmpdir } = await import("node:os");
      const file = join(tmpdir(), "aks-admin-push.json");
      const read = async () =>
        JSON.parse(await readFile(file, "utf8").catch(() => "{}")) as Record<string, unknown>;
      return {
        kind: "file",
        get: async <T>(key: string) => ((await read())[key] as T) ?? null,
        set: async (key, value) => {
          const all = await read();
          all[key] = value;
          await writeFile(file, JSON.stringify(all));
        },
      };
    }
  })();
  return storePromise;
}

export function pushKeys() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim();
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim();
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env["VAPID_SUBJECT"]?.trim() || "mailto:contact@autokontorsfax.com",
  };
}

const SUBSCRIPTIONS = "subscriptions";

export async function listSubscriptions() {
  return (await (await pushStore()).get<PushSubscriptionRecord[]>(SUBSCRIPTIONS)) ?? [];
}

export async function saveSubscription(record: PushSubscriptionRecord) {
  const store = await pushStore();
  const list = (await listSubscriptions()).filter((s) => s.endpoint !== record.endpoint);
  // A few devices per admin at most (old browsers are dropped first).
  const mine = list.filter((s) => s.userId === record.userId);
  const others = list.filter((s) => s.userId !== record.userId);
  await store.set(SUBSCRIPTIONS, [...others, ...mine.slice(-4), record]);
}

export async function removeSubscription(endpoint: string, userId?: string) {
  const store = await pushStore();
  const list = await listSubscriptions();
  await store.set(
    SUBSCRIPTIONS,
    list.filter((s) => !(s.endpoint === endpoint && (!userId || s.userId === userId))),
  );
}

/**
 * Sends a notification to every admin device (or to one admin's). Devices that
 * no longer accept notifications are forgotten. Never throws: a notification
 * must not break what triggered it.
 */
export async function notifyAdmins(
  message: PushMessage,
  who: { onlyUserId?: string; exceptUserId?: string } = {},
) {
  const keys = pushKeys();
  if (!keys) return { sent: 0 };
  try {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    const targets = (await listSubscriptions()).filter(
      (s) =>
        (!who.onlyUserId || s.userId === who.onlyUserId) &&
        (!who.exceptUserId || s.userId !== who.exceptUserId),
    );
    const gone: string[] = [];
    let sent = 0;
    await Promise.all(
      targets.map(async (s) => {
        const locale = s.locale === "ar" ? "ar" : "fr";
        const payload = JSON.stringify({
          type: message.type,
          title: message.title[locale],
          body: message.body[locale],
          url: message.url,
          tag: message.tag ?? message.type,
          dir: locale === "ar" ? "rtl" : "ltr",
          lang: locale,
        });
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, {
            TTL: 60 * 60 * 24,
            urgency: "high",
            timeout: 5000,
          });
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.endpoint);
          else console.error("[push]", status, (error as Error).message);
        }
      }),
    );
    for (const endpoint of gone) await removeSubscription(endpoint);
    return { sent };
  } catch (error) {
    console.error("[push]", error);
    return { sent: 0 };
  }
}
