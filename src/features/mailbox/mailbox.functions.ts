import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* Built-in mailbox (Spacemail, IMAP/SMTP on the server): see src/server/mailbox.ts. */
const mailbox = () => import("@/server/mailbox");

const folder = z.enum(["inbox", "sent", "junk", "trash"]);
const uid = z.number().int().positive();
const email = z.string().trim().email().max(254);

export const getMailStatus = createServerFn({ method: "GET" }).handler(async () =>
  (await mailbox()).status(),
);

export const listMail = createServerFn({ method: "GET" })
  .validator(z.object({ folder, page: z.number().int().min(0).max(10_000) }))
  .handler(async ({ data }) => (await mailbox()).listMessages(data.folder, data.page));

/** Opening a message marks it as read (hence POST). */
export const readMail = createServerFn({ method: "POST" })
  .validator(z.object({ folder, uid, markSeen: z.boolean().optional() }))
  .handler(async ({ data }) =>
    (await mailbox()).getMessage(data.folder, data.uid, data.markSeen ?? true),
  );

export const downloadAttachment = createServerFn({ method: "POST" })
  .validator(z.object({ folder, uid, index: z.number().int().min(0).max(500) }))
  .handler(async ({ data }) => (await mailbox()).getAttachment(data.folder, data.uid, data.index));

export const setMailSeen = createServerFn({ method: "POST" })
  .validator(z.object({ folder, uid, seen: z.boolean() }))
  .handler(async ({ data }) => (await mailbox()).setSeen(data.folder, data.uid, data.seen));

export const deleteMail = createServerFn({ method: "POST" })
  .validator(z.object({ folder, uid }))
  .handler(async ({ data }) => (await mailbox()).removeMessage(data.folder, data.uid));

export const markNotJunk = createServerFn({ method: "POST" })
  .validator(z.object({ uid }))
  .handler(async ({ data }) => (await mailbox()).notJunk(data.uid));

export const sendMail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      to: z.array(email).min(1, "Ajoutez au moins un destinataire.").max(20),
      cc: z.array(email).max(20),
      subject: z.string().trim().max(300),
      text: z.string().max(100_000),
      inReplyTo: z.string().max(1000).optional(),
      references: z.array(z.string().max(1000)).max(50).optional(),
      files: z
        .array(
          z.object({
            filename: z.string().min(1).max(200),
            contentType: z.string().max(200),
            base64: z.string().max(6_000_000),
          }),
        )
        .max(10),
    }),
  )
  .handler(async ({ data }) => (await mailbox()).sendMail(data));
