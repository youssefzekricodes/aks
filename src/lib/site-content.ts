import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "./queries";
import {
  COLLECTION_DEFAULTS,
  primaryPhone,
  resolveContent,
  resolvePhones,
  whatsappPhone,
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

/** Links saved before /contact existed ("#contact", "/#contact") go to the contact page. */
export function contactHref(href: string) {
  return /^\/?#contact$/.test(href.trim()) ? "/contact" : href;
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

/** All phone numbers, the primary one and the WhatsApp one (see resolvePhones). */
export function usePhones() {
  const { data } = useSuspenseQuery(siteContentQuery);
  const phones = resolvePhones(data);
  return { phones, primary: primaryPhone(phones), whatsapp: whatsappPhone(phones) };
}
