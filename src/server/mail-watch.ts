import { mailboxSettings, openImap } from "./mail-core.ts";
import { notifyAdmins, pushKeys, pushStore } from "./push-core.ts";

/*
 * New e-mail check, run every minute by a scheduled Netlify function
 * (netlify/functions/mail-watch.mts): compares the inbox with the last check and
 * sends a push notification for each new unread message (one summary when many
 * arrive at once). Framework-free.
 */

type MailState = { uidValidity: string; lastUid: number };
const STATE = "mail-state";
/** Above this many new messages in one minute, a single summary notification. */
const MAX_SEPARATE = 3;

const short = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export async function checkNewMail() {
  const settings = mailboxSettings();
  if (!settings || !pushKeys()) return { skipped: true };
  const store = await pushStore();
  const client = openImap(settings);
  client.on("error", () => undefined);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const box = client.mailbox;
      if (!box) return { skipped: true };
      const uidValidity = String(box.uidValidity);
      const lastUid = Number(box.uidNext) - 1;
      const state = await store.get<MailState>(STATE);
      // First check, or the mailbox was rebuilt: remember where we are, no flood.
      if (!state || state.uidValidity !== uidValidity) {
        await store.set(STATE, { uidValidity, lastUid });
        return { first: true };
      }
      if (lastUid <= state.lastUid) return { news: 0 };
      const fresh: { from: string; subject: string }[] = [];
      for await (const message of client.fetch(
        `${state.lastUid + 1}:*`,
        { uid: true, envelope: true, flags: true },
        { uid: true },
      )) {
        if (message.uid <= state.lastUid || message.flags?.has("\\Seen")) continue;
        const from = message.envelope?.from?.[0];
        fresh.push({
          from: from?.name?.trim() || from?.address || "",
          subject: message.envelope?.subject?.trim() || "",
        });
      }
      await store.set(STATE, { uidValidity, lastUid });
      if (fresh.length > MAX_SEPARATE)
        await notifyAdmins({
          type: "mail",
          title: {
            fr: `${fresh.length} nouveaux e-mails`,
            ar: `${fresh.length} إيميلات جديدة`,
          },
          body: {
            fr: fresh
              .slice(0, 3)
              .map((m) => m.from)
              .join(", "),
            ar: fresh
              .slice(0, 3)
              .map((m) => m.from)
              .join("، "),
          },
          url: "/admin/messagerie",
          tag: "mail",
        });
      else
        for (const m of fresh)
          await notifyAdmins({
            type: "mail",
            title: {
              fr: short(m.from || "Nouvel e-mail", 60),
              ar: short(m.from || "إيميل جديد", 60),
            },
            body: {
              fr: short(m.subject || "(Sans objet)", 120),
              ar: short(m.subject || "(بلا موضوع)", 120),
            },
            url: "/admin/messagerie",
            tag: `mail-${m.from}-${m.subject}`.slice(0, 64),
          });
      return { news: fresh.length };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}
