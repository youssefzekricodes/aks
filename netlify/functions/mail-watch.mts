import { checkNewMail } from "../../src/server/mail-watch.ts";

/**
 * Every minute: a push notification for each new e-mail of the shop's mailbox
 * (admins who switched notifications on). Does nothing until MAILBOX_* and
 * VAPID_* are set. Scheduled functions only run on the published site.
 */
export default async () => {
  try {
    const result = await checkNewMail();
    return Response.json(result);
  } catch (error) {
    console.error("[mail-watch]", error);
    return new Response("error", { status: 500 });
  }
};

export const config = { schedule: "* * * * *" };
