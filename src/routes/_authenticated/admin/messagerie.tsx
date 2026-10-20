import { createFileRoute } from "@tanstack/react-router";
import { MailboxPage } from "@/features/admin/MailboxPage";
import {
  isFolder,
  mailListQuery,
  mailStatusQuery,
  type FolderKey,
} from "@/features/mailbox/queries";

type MailSearch = {
  /** Folder shown (inbox when absent). */
  dossier?: FolderKey;
  /** Message open (its IMAP uid in that folder). */
  message?: number;
  /** Opens the editor for a new e-mail to this address (e.g. from a request). */
  ecrire?: string;
  /** Subject of that new e-mail. */
  objet?: string;
};

/** Built-in mailbox (contact@…, Spacemail over IMAP/SMTP). */
export const Route = createFileRoute("/_authenticated/admin/messagerie")({
  validateSearch: (search: Record<string, unknown>): MailSearch => {
    const out: MailSearch = {};
    if (isFolder(search["dossier"]) && search["dossier"] !== "inbox")
      out.dossier = search["dossier"];
    const message = Number(search["message"]);
    if (Number.isInteger(message) && message > 0) out.message = message;
    if (typeof search["ecrire"] === "string" && search["ecrire"].length <= 254)
      out.ecrire = search["ecrire"];
    if (typeof search["objet"] === "string") out.objet = search["objet"].slice(0, 300);
    return out;
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(mailStatusQuery);
    void context.queryClient.prefetchInfiniteQuery(mailListQuery("inbox"));
  },
  head: () => ({ meta: [{ title: "Messagerie — Administration" }] }),
  component: MailboxPage,
});
