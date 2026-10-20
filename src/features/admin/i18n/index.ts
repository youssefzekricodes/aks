import { useSyncExternalStore } from "react";

/*
 * Admin app languages: French (default, the source text) and Tunisian Arabic.
 * The public site is not translated.
 *
 * How to translate: wrap the French text in `t()`; the French string is the key
 * and the Arabic is looked up in the dictionaries of `./ar/*.ts` (one file per
 * area, merged). Placeholders: t("{count} photos", { count }). A missing entry
 * shows the French (and is listed in the console during development).
 *
 * Counted nouns: `plural(n, "véhicule", "véhicules")` (model.ts) gives
 * "3 véhicules" / "3 كراهب": the Arabic of the singular and of the plural are
 * dictionary entries too (Tunisian: plural form for 2 to 10, singular otherwise).
 */

export type Locale = "fr" | "ar";
const STORAGE_KEY = "aks-admin-locale";

let locale: Locale = "fr";
try {
  if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "ar") locale = "ar";
} catch {
  // No storage (private mode): French.
}
const listeners = new Set<() => void>();

export const getLocale = () => locale;
export function setLocale(next: Locale) {
  if (next === locale) return;
  locale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not remembered, still applied.
  }
  for (const listener of listeners) listener();
}
/** Current language; components using it re-render when it changes. */
export function useLocale() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => locale,
    () => "fr" as Locale,
  );
}
export const isRtl = () => locale === "ar";
/** Locale for Intl (numbers and dates) and react-aria. Latin digits, as used in Tunisia. */
export const intlLocale = () => (locale === "ar" ? "ar-TN-u-nu-latn" : "fr-FR");

const dictionaries = import.meta.glob<Record<string, string>>("./ar/*.ts", {
  eager: true,
  import: "default",
});
// Merged in file-name order; "zz-shared.ts" comes last and settles shared wording.
const AR: Record<string, string> = Object.assign(
  {},
  ...Object.keys(dictionaries)
    .sort()
    .map((file) => dictionaries[file]),
);

const missing = new Set<string>();
function lookup(text: string) {
  if (locale === "fr") return text;
  const found = AR[text];
  if (found !== undefined) return found;
  if (import.meta.env.DEV && !missing.has(text)) {
    missing.add(text);
    (globalThis as { __missingAr?: Set<string> }).__missingAr = missing;
    console.debug("[i18n] missing Arabic:", text);
  }
  return text;
}

/** Translated text (French is the key); `{name}` placeholders are filled from `vars`. */
export function t(text: string, vars?: Record<string, string | number>): string {
  const out = lookup(text);
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? formatValue(vars[key]!) : match,
  );
}

const numberFormats = new Map<string, Intl.NumberFormat>();
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  const key = `${intlLocale()}|${JSON.stringify(options ?? {})}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(), options);
    numberFormats.set(key, format);
  }
  return format.format(value);
}
const formatValue = (value: string | number) =>
  typeof value === "number" ? formatNumber(value) : value;

const dateFormats = new Map<string, Intl.DateTimeFormat>();
export function formatDate(value: Date, options: Intl.DateTimeFormatOptions) {
  const key = `${intlLocale()}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(), options);
    dateFormats.set(key, format);
  }
  return format.format(value);
}

const pluralRules = new Map<string, Intl.PluralRules>();
/** "3 véhicules" / "3 كراهب": number, then the noun in the right form. */
export function plural(count: number, one: string, many: string) {
  const n = formatNumber(count);
  if (locale === "fr") return `${n} ${count > 1 ? many : one}`;
  let rules = pluralRules.get("ar");
  if (!rules) {
    rules = new Intl.PluralRules("ar");
    pluralRules.set("ar", rules);
  }
  const category = rules.select(count);
  const usePlural = category === "two" || category === "few" || category === "zero";
  return `${n} ${t(usePlural ? many : one)}`;
}
