import type { Query, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

/*
 * The admin's data kept on the device (IndexedDB): the app opens straight onto the
 * last known vehicles, requests, figures and e-mails, then refreshes them in the
 * background. Recent e-mails only, nothing about the session; erased at sign-out.
 */

const KEY = "aks-admin-cache";
/** Change to drop every saved copy (data shape changed). */
const BUSTER = "2026-10-20";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
/** Opened e-mails kept for instant reopening. */
const KEEP_MESSAGES = 25;

const KEPT = new Set([
  "admin-cars",
  "admin-leads",
  "admin-dashboard-stats",
  "admin-site-content",
  "mail-status",
  "mail-list",
  "mail-message",
]);

const persister = createAsyncStoragePersister({
  key: KEY,
  throttleTime: 2000,
  storage: {
    getItem: (key) => get<string>(key).then((value) => value ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
});

let started = false;

export function persistAdminCache(queryClient: QueryClient) {
  if (started || typeof indexedDB === "undefined") return;
  started = true;
  const recentMessages = () =>
    new Set(
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ["mail-message"] })
        .filter((q) => q.state.status === "success")
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
        .slice(0, KEEP_MESSAGES)
        .map((q) => q.queryHash),
    );
  persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) => {
        const root = String(query.queryKey[0]);
        if (query.state.status !== "success" || !KEPT.has(root)) return false;
        // Mail lists: the first page is enough to open instantly.
        if (root === "mail-message") return recentMessages().has(query.queryHash);
        return true;
      },
    },
  });
}

/** Sign-out: nothing of the admin stays on the device. */
export async function clearAdminCache() {
  try {
    await persister.removeClient();
  } catch {
    // Nothing saved, or storage unavailable.
  }
}
