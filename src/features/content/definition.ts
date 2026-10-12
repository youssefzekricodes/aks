import fields from "./fields.json";
import collections from "./collections.json";
import groups from "./groups.json";

export type FieldType = "text" | "textarea" | "link" | "image" | "map" | "boolean" | "collection";
export type ContentField = {
  key: string;
  group: string;
  label: string;
  type: FieldType;
  value: string;
};
export const CONTENT_FIELDS = fields as ContentField[];
export const CONTENT_GROUPS: Record<string, string> = groups;
export const COLLECTION_DEFAULTS = collections;
export type CollectionKey = keyof typeof collections;
export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  CONTENT_FIELDS.map((field) => [field.key, field.value]),
);
export const CONTENT_BY_KEY = new Map(CONTENT_FIELDS.map((field) => [field.key, field]));

export const COLLECTION_LABELS: Record<string, string> = {
  href: "Destination du lien",
  label: "Libellé",
  title: "Titre",
  text: "Description",
  icon: "Icône",
  value: "Nombre",
  suffix: "Suffixe",
  name: "Nom",
  city: "Ville",
  stars: "Note sur 5",
  day: "Jour(s)",
  time: "Horaires",
  max: "Prix maximum (DT)",
};
export const SERVICE_ICONS = ["Banknote", "Repeat", "Wrench", "Ship", "ShieldCheck"];
export const SERVICE_LABELS: Record<string, string> = {
  Banknote: "Achat",
  Repeat: "Vendre",
  Wrench: "Echange",
  Ship: "Importation",
  ShieldCheck: "Garantie",
};

export function resolveContent(values: Record<string, string>, key: string, fallback = "") {
  return values[key] ?? CONTENT_DEFAULTS[key] ?? fallback;
}

export function isSafeLink(value: string) {
  if (!value) return true;
  if ([...value].some((character) => character.charCodeAt(0) <= 32 || character === "\\"))
    return false;
  return (
    /^\/(?!\/)/.test(value) || /^#[\w-]*$/.test(value) || /^(https?:\/\/|mailto:|tel:)/i.test(value)
  );
}
export function isSafeImage(value: string) {
  return (
    !value ||
    (/^https?:\/\//i.test(value) && isSafeLink(value)) ||
    (/^\/(?!\/)/.test(value) && isSafeLink(value)) ||
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}
export function isSafeMap(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["www.openstreetmap.org", "www.google.com", "maps.google.com"].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/** Shared by the editor and the server. No arbitrary keys, HTML, or executable URLs. */
export function validateContentValue(field: ContentField, value: string): string | null {
  const invalid = (message: string) => `${field.label} : ${message}`;
  if (
    value.length >
    (field.type === "image" ? 3_000_000 : field.type === "collection" ? 150_000 : 20_000)
  )
    return invalid("contenu trop long.");
  if (field.type === "link" && !isSafeLink(value))
    return invalid("utilisez un lien https://, http://, /, #, mailto: ou tel:.");
  if (field.type === "image" && !isSafeImage(value))
    return invalid("image JPG, PNG, WebP ou URL HTTP(S) attendue.");
  if (field.type === "map" && !isSafeMap(value))
    return invalid("utilisez une carte HTTPS Google Maps ou OpenStreetMap.");
  if (field.type === "boolean" && !["true", "false"].includes(value))
    return invalid("visibilité non valide.");
  if (field.type === "collection") {
    const template = COLLECTION_DEFAULTS[field.key as CollectionKey]?.[0];
    if (!template) return invalid("liste inconnue.");
    try {
      const rows: unknown = JSON.parse(value);
      if (!Array.isArray(rows) || rows.length > 30) return invalid("maximum 30 éléments.");
      for (const row of rows) {
        if (
          !row ||
          typeof row !== "object" ||
          Array.isArray(row) ||
          Object.keys(row).length !== Object.keys(template).length
        )
          return invalid("élément non valide.");
        for (const [key, example] of Object.entries(template)) {
          const current = row[key];
          if (typeof current !== typeof example) return invalid(`champ ${key} non valide.`);
          if (typeof current === "string" && current.length > 5000)
            return invalid(`champ ${key} trop long.`);
          if (key === "href" && !isSafeLink(current))
            return invalid("destination du lien non valide.");
          if (key === "icon" && !SERVICE_ICONS.includes(current))
            return invalid("icône non valide.");
          if (
            typeof current === "number" &&
            (!Number.isFinite(current) ||
              !Number.isInteger(current) ||
              current < 0 ||
              current > 1e8)
          )
            return invalid("nombre non valide.");
          if (key === "stars" && (current < 1 || current > 5))
            return invalid("la note doit être comprise entre 1 et 5.");
        }
      }
    } catch {
      return invalid("liste non valide.");
    }
  }
  return null;
}
