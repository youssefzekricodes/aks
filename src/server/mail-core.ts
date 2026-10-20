import { ImapFlow, type FetchMessageObject, type MessageStructureObject } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import MailComposer from "nodemailer/lib/mail-composer";

/*
 * Mailbox operations on an open IMAP connection (no sign-in or settings here: see
 * mailbox.ts, which checks the admin and opens the connection). Kept free of the
 * web framework so it can be tried against any mail server.
 */

export type FolderKey = "inbox" | "sent" | "junk" | "trash";
export const FOLDER_KEYS: readonly FolderKey[] = ["inbox", "sent", "junk", "trash"];

export type Address = { name: string; address: string };
export type MessageSummary = {
  uid: number;
  from: Address | null;
  to: Address[];
  subject: string;
  date: string | null;
  seen: boolean;
  flagged: boolean;
  attachments: boolean;
  /** First words of the message (list preview). */
  preview: string;
};
export type MessageAttachment = {
  index: number;
  filename: string;
  contentType: string;
  size: number;
};
export type MessageDetail = MessageSummary & {
  cc: Address[];
  replyTo: Address[];
  messageId: string | null;
  references: string[];
  /** Sanitised HTML (shown in a sandboxed frame), or null for text-only mail. */
  html: string | null;
  text: string;
  files: MessageAttachment[];
};

/** Messages per page of a folder list. */
export const PAGE_SIZE = 30;
/** Largest message read in full (bigger ones: open them in Spacemail). */
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
/** Largest attachment sent to the browser (hosting response limit is 6 MB). */
export const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;
/** Total size of the files attached to an outgoing e-mail (request limit is 6 MB). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Inline pictures (cid:) embedded in the HTML up to this size each. */
const MAX_INLINE_BYTES = 1024 * 1024;

/** Mailbox settings (server environment), or null when not set up. */
export function mailboxSettings() {
  const user = process.env["MAILBOX_USER"]?.trim();
  const pass = process.env["MAILBOX_PASSWORD"];
  if (!user || !pass) return null;
  const host = process.env["MAILBOX_HOST"]?.trim() || "mail.spacemail.com";
  return {
    user,
    pass,
    imapHost: process.env["MAILBOX_IMAP_HOST"]?.trim() || host,
    smtpHost: process.env["MAILBOX_SMTP_HOST"]?.trim() || host,
    imapPort: Number(process.env["MAILBOX_IMAP_PORT"] || 993),
    smtpPort: Number(process.env["MAILBOX_SMTP_PORT"] || 465),
    fromName: process.env["MAILBOX_FROM_NAME"]?.trim() || "Auto Kontor Sfax",
  };
}
export type MailboxSettings = NonNullable<ReturnType<typeof mailboxSettings>>;

/** A (not yet connected) IMAP client for these settings. */
export function openImap(settings: MailboxSettings) {
  return new ImapFlow({
    host: settings.imapHost,
    port: settings.imapPort,
    secure: settings.imapPort === 993,
    auth: { user: settings.user, pass: settings.pass },
    logger: false,
    // Within the hosting request time limit (10 s): fail clearly rather than hang.
    connectionTimeout: 6_000,
    greetingTimeout: 5_000,
    socketTimeout: 9_000,
  });
}

/** Error whose text is shown as is (the others become a generic message). */
export class MailError extends Error {}

/** Path of each folder on this server (special-use flags, then usual names). */
export async function folderPaths(client: ImapFlow): Promise<Record<FolderKey, string | null>> {
  const list = await client.list();
  const find = (use: string, names: RegExp) =>
    list.find((f) => f.specialUse === use)?.path ??
    list.find((f) => names.test(f.name) || names.test(f.path))?.path ??
    null;
  return {
    inbox: "INBOX",
    sent: find("\\Sent", /^(sent|envoy|sent items|sent messages)/i),
    junk: find("\\Junk", /^(junk|spam|courrier ind)/i),
    trash: find("\\Trash", /^(trash|corbeille|deleted)/i),
  };
}

export async function pathOf(client: ImapFlow, folder: FolderKey) {
  const path = (await folderPaths(client))[folder];
  if (!path) throw new MailError("Ce dossier n’existe pas dans la boîte mail.");
  return path;
}

const addresses = (value: AddressObject | AddressObject[] | undefined): Address[] =>
  (Array.isArray(value) ? value : value ? [value] : []).flatMap((group) =>
    group.value
      .filter((a) => a.address)
      .map((a) => ({ name: a.name ?? "", address: a.address ?? "" })),
  );

const envelopeAddresses = (
  list: { name?: string | undefined; address?: string | undefined }[] | undefined,
) =>
  (list ?? [])
    .filter((a) => a.address)
    .map((a) => ({ name: a.name ?? "", address: a.address ?? "" }));

function hasAttachments(structure: MessageStructureObject | undefined): boolean {
  if (!structure) return false;
  if (structure.disposition === "attachment") return true;
  return (structure.childNodes ?? []).some(hasAttachments);
}

function dateOf(value: Date | string | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function summary(message: FetchMessageObject): MessageSummary {
  const envelope = message.envelope;
  return {
    uid: message.uid,
    from: envelopeAddresses(envelope?.from)[0] ?? null,
    to: envelopeAddresses(envelope?.to),
    subject: envelope?.subject?.trim() || "",
    date: dateOf(envelope?.date ?? message.internalDate),
    seen: message.flags?.has("\\Seen") ?? false,
    flagged: message.flags?.has("\\Flagged") ?? false,
    attachments: hasAttachments(message.bodyStructure),
    preview: "",
  };
}

/** Bytes read from the start of each message to write its preview line. */
const PREVIEW_BYTES = 12_000;

/** Plain text of the first bytes of a message, on one line (best effort). */
export async function previewOf(source: Buffer | undefined) {
  if (!source?.length) return "";
  try {
    const parsed = await simpleParser(source, { skipImageLinks: true });
    const text =
      parsed.text ||
      (typeof parsed.html === "string"
        ? parsed.html
            .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
        : "");
    return text
      .split("\n")
      .filter((line) => !line.startsWith(">"))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  } catch {
    return "";
  }
}

/** One page of a folder, newest first, and the folders this mailbox has. */
export async function listPage(client: ImapFlow, folder: FolderKey, page: number) {
  const paths = await folderPaths(client);
  const path = paths[folder];
  const folders = FOLDER_KEYS.filter((key) => paths[key]);
  if (!path) return { messages: [], total: 0, page, pageCount: 0, folders };
  const lock = await client.getMailboxLock(path, { readOnly: true });
  try {
    const total = client.mailbox ? client.mailbox.exists : 0;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const end = total - page * PAGE_SIZE;
    if (end < 1) return { messages: [], total, page, pageCount, folders };
    const start = Math.max(1, end - PAGE_SIZE + 1);
    const messages: MessageSummary[] = [];
    for await (const message of client.fetch(`${start}:${end}`, {
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
      internalDate: true,
      source: { maxLength: PREVIEW_BYTES },
    }))
      messages.push({ ...summary(message), preview: await previewOf(message.source) });
    messages.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.uid - a.uid);
    return { messages, total, page, pageCount, folders };
  } finally {
    lock.release();
  }
}

/** Removes what could run or navigate inside the reading frame. */
export function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(
      /<(script|iframe|frame|frameset|object|embed|applet|form|base|meta|link)\b[^>]*>/gi,
      "",
    )
    .replace(/<\/(iframe|frame|frameset|object|embed|applet|form)\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, "$1=$2#$2");
}

async function readMessage(client: ImapFlow, uid: number) {
  const message = await client.fetchOne(
    String(uid),
    { uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true, size: true },
    { uid: true },
  );
  if (!message) throw new MailError("Message introuvable (déplacé ou supprimé ?).");
  if ((message.size ?? 0) > MAX_MESSAGE_BYTES)
    throw new MailError("Message trop volumineux : ouvrez-le dans Spacemail.");
  const { content } = await client.download(String(uid), undefined, { uid: true });
  if (!content) throw new MailError("Message introuvable (déplacé ou supprimé ?).");
  const parsed = await simpleParser(content, { skipImageLinks: true });
  return { message, parsed };
}

/** A message in full; `markSeen`: opening it marks it as read (not when preloading). */
export async function readDetail(
  client: ImapFlow,
  folder: FolderKey,
  uid: number,
  markSeen = true,
): Promise<MessageDetail> {
  const lock = await client.getMailboxLock(await pathOf(client, folder));
  try {
    const { message, parsed } = await readMessage(client, uid);
    const wasSeen = message.flags?.has("\\Seen") ?? false;
    if (markSeen && !wasSeen) await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });

    // Pictures sent inside the message (cid:) are embedded; the others are files.
    const inline = new Set<number>();
    let html = typeof parsed.html === "string" ? parsed.html : null;
    if (html) {
      parsed.attachments.forEach((file, index) => {
        const id = file.contentId?.replace(/^<|>$/g, "");
        if (!id || !html!.includes(`cid:${id}`)) return;
        inline.add(index);
        if (file.size <= MAX_INLINE_BYTES)
          html = html!.replaceAll(
            `cid:${id}`,
            `data:${file.contentType};base64,${file.content.toString("base64")}`,
          );
      });
      html = cleanHtml(html);
    }
    const base = summary(message);
    return {
      ...base,
      seen: markSeen || wasSeen,
      from: addresses(parsed.from)[0] ?? base.from,
      to: addresses(parsed.to).length ? addresses(parsed.to) : base.to,
      cc: addresses(parsed.cc),
      replyTo: addresses(parsed.replyTo),
      subject: parsed.subject?.trim() || base.subject,
      messageId: parsed.messageId ?? null,
      references: Array.isArray(parsed.references)
        ? parsed.references
        : parsed.references
          ? [parsed.references]
          : [],
      html,
      text: parsed.text ?? "",
      files: parsed.attachments
        .map((file, index) => ({
          index,
          filename: file.filename || "piece-jointe",
          contentType: file.contentType,
          size: file.size,
        }))
        .filter((file) => !inline.has(file.index)),
    };
  } finally {
    lock.release();
  }
}

/** One attachment, as base64 (up to MAX_DOWNLOAD_BYTES). */
export async function readAttachment(
  client: ImapFlow,
  folder: FolderKey,
  uid: number,
  index: number,
) {
  const lock = await client.getMailboxLock(await pathOf(client, folder), { readOnly: true });
  try {
    const { parsed } = await readMessage(client, uid);
    const file = parsed.attachments[index];
    if (!file) throw new MailError("Pièce jointe introuvable.");
    if (file.size > MAX_DOWNLOAD_BYTES)
      throw new MailError("Fichier trop volumineux : ouvrez-le dans Spacemail.");
    return {
      filename: file.filename || "piece-jointe",
      contentType: file.contentType,
      base64: file.content.toString("base64"),
    };
  } finally {
    lock.release();
  }
}

export async function markSeen(client: ImapFlow, folder: FolderKey, uid: number, seen: boolean) {
  const lock = await client.getMailboxLock(await pathOf(client, folder));
  try {
    if (seen) await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    else await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
    return { ok: true };
  } finally {
    lock.release();
  }
}

/** To the trash; from the trash (or without one), deleted for good. */
export async function trashOrDelete(client: ImapFlow, folder: FolderKey, uid: number) {
  const paths = await folderPaths(client);
  const path = paths[folder];
  if (!path) throw new MailError("Ce dossier n’existe pas dans la boîte mail.");
  const lock = await client.getMailboxLock(path);
  try {
    if (folder !== "trash" && paths.trash) {
      await client.messageMove(String(uid), paths.trash, { uid: true });
      return { deleted: false };
    }
    await client.messageDelete(String(uid), { uid: true });
    return { deleted: true };
  } finally {
    lock.release();
  }
}

/** A junk message is wanted after all: back to the inbox. */
export async function backToInbox(client: ImapFlow, uid: number) {
  const lock = await client.getMailboxLock(await pathOf(client, "junk"));
  try {
    await client.messageMove(String(uid), "INBOX", { uid: true });
    return { ok: true };
  } finally {
    lock.release();
  }
}

/** Keeps a copy of a sent e-mail in "Envoyés" (when the mailbox has one). */
export async function saveSent(client: ImapFlow, raw: Buffer) {
  const sent = (await folderPaths(client)).sent;
  if (sent) await client.append(sent, raw, ["\\Seen"]);
}

export type OutgoingMail = {
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  inReplyTo?: string | undefined;
  references?: string[] | undefined;
  files: { filename: string; contentType: string; base64: string }[];
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The e-mail as sent (same bytes for the SMTP server and the "Envoyés" copy). */
export function composeRaw(mail: OutgoingMail, from: Address): Promise<Buffer> {
  return new MailComposer({
    from,
    to: mail.to,
    cc: mail.cc,
    subject: mail.subject,
    text: mail.text,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(mail.text)}</div>`,
    ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo } : {}),
    ...(mail.references?.length ? { references: mail.references } : {}),
    attachments: mail.files.map((f) => ({
      filename: f.filename,
      contentType: f.contentType,
      content: Buffer.from(f.base64, "base64"),
    })),
  })
    .compile()
    .build();
}
