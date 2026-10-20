import "@tanstack/react-start/server-only";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { adminClient } from "./auth";
import {
  MAX_UPLOAD_BYTES,
  MailError,
  mailboxSettings,
  openImap,
  backToInbox,
  composeRaw,
  listPage,
  markSeen,
  readAttachment,
  readDetail,
  saveSent,
  trashOrDelete,
  type FolderKey,
  type OutgoingMail,
} from "./mail-core";

export type {
  Address,
  FolderKey,
  MessageAttachment,
  MessageDetail,
  MessageSummary,
  OutgoingMail,
} from "./mail-core";

/*
 * Built-in mailbox of the admin (contact@… hosted by Spacemail): the server reads
 * it over IMAP and sends over SMTP. The mailbox password is a server setting
 * (MAILBOX_PASSWORD) and never reaches the browser; every call requires a fully
 * signed-in admin (2FA included), and changes are only accepted from the site.
 * One short connection per call (serverless functions do not keep sockets).
 * The mail work itself is in mail-core.ts.
 */

const config = mailboxSettings;

/** Message shown by the admin when the server settings are missing. */
export const NOT_CONFIGURED = "Messagerie non configurée.";

function requireConfig() {
  const settings = config();
  if (!settings) throw new Error(NOT_CONFIGURED);
  return settings;
}

/** Clear messages for the usual connection problems (no technical details leak). */
function mailError(error: unknown): Error {
  const e = error as { authenticationFailed?: boolean; code?: string; responseCode?: number };
  console.error("[mailbox]", error);
  if (e?.authenticationFailed || e?.responseCode === 535 || e?.code === "EAUTH")
    return new Error("La boîte mail refuse la connexion : vérifiez l’adresse et le mot de passe.");
  if (e?.code === "ETIMEDOUT" || e?.code === "ECONNREFUSED" || e?.code === "ENOTFOUND")
    return new Error("Serveur de messagerie injoignable. Réessayez dans un instant.");
  if (error instanceof Error && error.message === NOT_CONFIGURED) return error;
  if (error instanceof MailError) return new Error(error.message);
  return new Error("Opération sur la boîte mail impossible.");
}

/*
 * One mailbox connection kept between requests while this server instance is warm
 * (logging in takes most of the time of a request). Requests take turns on it; a
 * dropped connection is replaced and the request tried again once.
 */
let pooled: { client: ImapFlow; key: string; usedAt: number } | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<unknown> = Promise.resolve();
/** Closed after this long without use (the server may also be frozen sooner). */
const IDLE_MS = 45_000;
/**
 * Reused only if used this recently: a hosting server frozen between requests can
 * leave a connection that looks open but no longer answers (waiting on it would
 * outlast the request time limit).
 */
const REUSE_MS = 15_000;

async function connection(settings: NonNullable<ReturnType<typeof config>>) {
  const key = `${settings.user}@${settings.imapHost}:${settings.imapPort}`;
  if (
    pooled &&
    pooled.key === key &&
    pooled.client.usable &&
    Date.now() - pooled.usedAt < REUSE_MS
  ) {
    pooled.usedAt = Date.now();
    return pooled.client;
  }
  pooled?.client.close();
  const client = openImap(settings);
  client.on("error", () => {
    if (pooled?.client === client) pooled = null;
  });
  client.on("close", () => {
    if (pooled?.client === client) pooled = null;
  });
  await client.connect();
  pooled = { client, key, usedAt: Date.now() };
  return client;
}

/** Runs `work` on the mailbox (shared connection, one request at a time). */
async function withImap<T>(work: (client: ImapFlow) => Promise<T>): Promise<T> {
  const settings = requireConfig();
  const run = async () => {
    if (idleTimer) clearTimeout(idleTimer);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await work(await connection(settings));
        } catch (error) {
          const dropped = !pooled?.client.usable;
          if (dropped) pooled = null;
          // A connection that died while idle: once more on a fresh one.
          if (attempt === 0 && dropped && !(error instanceof MailError)) continue;
          throw mailError(error);
        }
      }
    } finally {
      if (pooled) pooled.usedAt = Date.now();
      idleTimer = setTimeout(() => {
        const current = pooled;
        pooled = null;
        void current?.client.logout().catch(() => current.client.close());
      }, IDLE_MS);
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

/** Unread count of the inbox (home screen, menu), or `configured: false`. */
export async function status() {
  await adminClient();
  const settings = config();
  if (!settings) return { configured: false as const, unread: 0, address: "" };
  return withImap(async (client) => {
    const inbox = await client.status("INBOX", { unseen: true });
    return {
      configured: true as const,
      unread: inbox ? (inbox.unseen ?? 0) : 0,
      address: settings.user,
    };
  });
}

export async function listMessages(folder: FolderKey, page: number) {
  await adminClient();
  return withImap((client) => listPage(client, folder, page));
}

/** Opening a message marks it as read: a change, so only from the site. */
export async function getMessage(folder: FolderKey, uid: number, markSeen = true) {
  await adminClient({ write: true });
  return withImap((client) => readDetail(client, folder, uid, markSeen));
}

export async function getAttachment(folder: FolderKey, uid: number, index: number) {
  await adminClient();
  return withImap((client) => readAttachment(client, folder, uid, index));
}

export async function setSeen(folder: FolderKey, uid: number, seen: boolean) {
  await adminClient({ write: true });
  return withImap((client) => markSeen(client, folder, uid, seen));
}

export async function removeMessage(folder: FolderKey, uid: number) {
  await adminClient({ write: true });
  return withImap((client) => trashOrDelete(client, folder, uid));
}

export async function notJunk(uid: number) {
  await adminClient({ write: true });
  return withImap((client) => backToInbox(client, uid));
}

/** Sends an e-mail from the mailbox and keeps a copy in "Envoyés". */
export async function sendMail(mail: OutgoingMail) {
  await adminClient({ write: true });
  const settings = requireConfig();
  const size = mail.files.reduce((sum, f) => sum + Math.floor((f.base64.length * 3) / 4), 0);
  if (size > MAX_UPLOAD_BYTES)
    throw new Error("Pièces jointes trop lourdes : 4 Mo au total maximum.");
  const raw = await composeRaw(mail, { name: settings.fromName, address: settings.user });
  try {
    const transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: { user: settings.user, pass: settings.pass },
      connectionTimeout: 6_000,
      greetingTimeout: 5_000,
      socketTimeout: 20_000,
    });
    await transport.sendMail({
      envelope: { from: settings.user, to: [...mail.to, ...mail.cc] },
      raw,
    });
  } catch (error) {
    throw mailError(error);
  }
  // The copy in "Envoyés" is a bonus: the e-mail has left even if this fails.
  await withImap((client) => saveSent(client, raw)).catch(() => undefined);
  return { ok: true };
}
