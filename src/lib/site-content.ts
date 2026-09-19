import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "./queries";
import {
  COLLECTION_DEFAULTS,
  resolveContent,
  type CollectionKey,
} from "@/features/content/definition";

/**
 * Returns a getter for editable site texts, falling back to the built-in copy
 * when the key has not been customised in the dashboard yet.
 */
export function useSiteText() {
  const { data } = useSuspenseQuery(siteContentQuery);
  return (key: string, fallback: string) => {
    return resolveContent(data, key, fallback);
  };
}

export function useSiteCollection<K extends CollectionKey>(
  key: K,
): (typeof COLLECTION_DEFAULTS)[K] {
  const { data } = useSuspenseQuery(siteContentQuery);
  try {
    return data[key] === undefined
      ? COLLECTION_DEFAULTS[key]
      : (JSON.parse(data[key]!) as (typeof COLLECTION_DEFAULTS)[K]);
  } catch {
    return COLLECTION_DEFAULTS[key];
  }
}
