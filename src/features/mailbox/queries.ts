import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getMailStatus, listMail, readMail } from "./mailbox.functions";

export type FolderKey = "inbox" | "sent" | "junk" | "trash";
export const FOLDERS: readonly FolderKey[] = ["inbox", "sent", "junk", "trash"];
export const isFolder = (value: unknown): value is FolderKey =>
  FOLDERS.includes(value as FolderKey);

/** Unread e-mails (home screen, menu); checked every two minutes while the admin is open. */
export const mailStatusQuery = queryOptions({
  queryKey: ["mail-status"],
  queryFn: () => getMailStatus(),
  staleTime: 30_000,
  // New e-mails also arrive as notifications (which refresh it at once).
  refetchInterval: 60_000,
  retry: false,
});

export const mailListQuery = (folder: FolderKey) =>
  infiniteQueryOptions({
    queryKey: ["mail-list", folder],
    queryFn: ({ pageParam }) => listMail({ data: { folder, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.pageCount ? last.page + 1 : undefined),
    staleTime: 30_000,
    retry: 1,
  });

/**
 * A message in full. Opening it marks it as read on the server; loading it ahead
 * (`preload`, finger or mouse on it) does not.
 */
export const mailMessageQuery = (folder: FolderKey, uid: number, preload = false) =>
  queryOptions({
    queryKey: ["mail-message", folder, uid],
    queryFn: () => readMail({ data: { folder, uid, markSeen: !preload } }),
    staleTime: Infinity,
    retry: 1,
  });

/** Search of /admin/messagerie that opens the editor for a new e-mail (e.g. from a request). */
export function mailToSearch(email: string, subject?: string) {
  return { ecrire: email, ...(subject ? { objet: subject } : {}) };
}

/** Subject of an e-mail written from a contact request (seen by the client: French). */
export const LEAD_REPLY_SUBJECT = "Votre demande — Auto Kontor Sfax";
