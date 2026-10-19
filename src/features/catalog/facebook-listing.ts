import { BRANDS } from "./brands.ts";

/**
 * Reads a vehicle from the text of a showroom Facebook post, written like:
 *
 *   A VENDRE CHEZ AUTO KONTOR SFAX
 *   🚘PEUGEOT 3008🚘
 *   ✅ Essence Hybride
 *   ✅10CV
 *   ✅2023/01/10
 *   ✅152 000 KM
 *   ✅ Boîte automatique
 *
 * Every value is a suggestion the admin checks before importing; anything that
 * can't be read is left empty rather than guessed.
 */
export type ParsedListing = {
  isListing: boolean;
  title: string;
  brand: string;
  model: string;
  version: string;
  year: number | null;
  firstRegistration: string | null;
  km: number | null;
  fuel: string | null;
  gearbox: "Auto" | "Manuelle" | null;
  fiscalPower: number | null;
  price: number | null;
  options: string;
  /** Guessed from the model (posts never say it). */
  body: string | null;
};

/** Body type by model, for the usual stock; unknown models stay empty. */
const BODIES: [RegExp, string][] = [
  [/^(amarok|d-?max|hilux|navara|ranger|k8)/i, "Pick-up"],
  [/^(partner|k9|combo|caddy|berlingo|express|kangoo|doblo|rifter)/i, "Utilitaire"],
  [/^(rio|picanto|500|up|polo|qq|i10|i20|clio|208|c3|yaris|micra|ibiza|fabia)/i, "Citadine"],
  [/^(golf|a3|m[ée]gane|classe a|a \d|308|leon|focus|astra|cerato)/i, "Compacte"],
  [/^4\d\di/i, "Coupé"],
  [
    /^(c \d|e \d|s \d|[35]\d\di|a[4-8]\b|elantra|passat|accent|301|508|octavia|camry|s[ée]rie)/i,
    "Berline",
  ],
  [
    /^(sportage|seltos|sorento|tucson|santa|creta|zs|hs|gla|glc|gle|q[2-8]|x[1-7]|tiggo|h6|jolion|rav4|juke|qashqai|tivoli|tiguan|t-?roc|ateca|arona|jimny|vitara|2008|3008|5008|captur|kadjar|duster|c-?hr|kona)/i,
    "SUV",
  ],
];

/** Spellings people use that aren't in the brand registry. */
const EXTRA_BRANDS: Record<string, string> = {
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
  mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  merco: "Mercedes-Benz",
  haval: "Haval",
  ssangyong: "SsangYong",
  "ssang-yong": "SsangYong",
  "great-wall": "GWM",
  citroen: "Citroën",
  skoda: "Škoda",
};

const plain = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Models posted without their brand ("🚘 GOLF 7 🚘"). */
const MODEL_BRANDS: [RegExp, string][] = [
  [/^(golf|polo|passat|tiguan|touareg|amarok|caddy|up|t-?roc|jetta)\b/i, "Volkswagen"],
  [/^(clio|megane|mégane|captur|kadjar|express|kangoo|symbol|duster)\b/i, "Renault"],
  [/^(partner|k9|208|2008|308|3008|5008|301|508|rifter)\b/i, "Peugeot"],
  [/^(berlingo|c3|c4|c-elysee|c-élysée)\b/i, "Citroën"],
  [/^(juke|qashqai|micra|navara|x-trail)\b/i, "Nissan"],
  [/^(sportage|rio|picanto|seltos|sorento|cerato)\b/i, "Kia"],
  [/^(tucson|elantra|i10|i20|accent|creta|santa)\b/i, "Hyundai"],
  [/^(hilux|rav4|yaris|corolla|land)\b/i, "Toyota"],
  [/^(tiggo|arrizo)\b/i, "Chery"],
  [/^(gla|glc|gle|cla|classe)\b/i, "Mercedes-Benz"],
  [/^(ateca|ibiza|leon|arona)\b/i, "Seat"],
];

const KNOWN = new Map<string, string>([
  ...BRANDS.map((b) => [b.slug, b.name] as [string, string]),
  ...Object.entries(EXTRA_BRANDS),
]);

/** Trim names written in many ways, in their usual spelling. */
const TRIMS: [RegExp, string][] = [
  [/\bgt\s*-?\s*line\b/i, "GT Line"],
  [/\bkit\s*amg\b/i, "Kit AMG"],
  [/\bamg\s*line\b/i, "AMG Line"],
  [/\bpack\s*m\b/i, "Pack M"],
  [/\bm\s*sport\b/i, "M Sport"],
  [/\bs\s*line\b/i, "S Line"],
  [/\br\s*line\b/i, "R-Line"],
  [/\bpack\s*night\b/i, "Pack Night"],
  [/\b4\s*matic\b/i, "4MATIC"],
  [/\bx\s*-?\s*series\b/i, "X-Series"],
];

// Emoji and pictographs (🚘 ✅ 📍 ☎️…) and variation selectors.
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const clean = (line: string) => line.replace(EMOJI, " ").replace(/\s+/g, " ").trim();

const titleCase = (word: string) =>
  /^[A-Z0-9-]{1,4}$/.test(word) && !/^[A-Z]{4}$/.test(word)
    ? word // short codes: ZS, GLA, 3008, Q5
    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

function readTitle(text: string) {
  const marked = text.match(/[🚘🚗]([^\n]*?)(?:[🚘🚗]|\n|$)/u);
  if (marked?.[1]?.trim()) return clean(marked[1]);
  const lines = text.split("\n").map(clean).filter(Boolean);
  const after = lines.findIndex((line) => /a\s*vendre/i.test(line));
  return after >= 0 ? (lines[after + 1] ?? "") : "";
}

function splitTitle(title: string) {
  // Engine notes are not part of the model ("CUPRA 4 cylindre").
  let rest = title
    .replace(/\b\d\s*cylindres?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  let brand = "";
  const words = rest.split(" ");
  for (let n = Math.min(3, words.length); n >= 1 && !brand; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const name = KNOWN.get(plain(words.slice(i, i + n).join(" ")));
      if (name) {
        brand = name;
        words.splice(i, n);
        break;
      }
    }
  }
  // A typo in the brand ("NISAN", "MEHINDRA"): one letter off a known brand.
  if (!brand)
    for (let i = 0; i < words.length && !brand; i++) {
      const word = plain(words[i]!);
      if (word.length < 4) continue;
      for (const [key, name] of KNOWN)
        if (key.length >= 4 && closeTo(word, key)) {
          brand = name;
          words.splice(i, 1);
          break;
        }
    }
  rest = words.join(" ");
  if (!brand) brand = MODEL_BRANDS.find(([pattern]) => pattern.test(rest.trim()))?.[1] ?? "";
  let version = "";
  for (const [pattern, label] of TRIMS)
    if (pattern.test(rest)) {
      version = version ? `${version} ${label}` : label;
      rest = rest.replace(pattern, " ");
    }
  const model = tidyModel(
    rest.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).map(titleCase).join(" "),
    brand,
  );
  return { brand, model, version };
}

/** Same length or one letter more/less, at most one difference. */
function closeTo(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** "A 4" → "A4", "C200" → "C 200", "GLA 250 e" → "GLA 250e" (usual spellings). */
function tidyModel(model: string, brand: string) {
  let out = model.replace(/\b([A-Z]) (\d)\b/g, "$1$2"); // Audi A 4
  if (brand === "Mercedes-Benz")
    out = out
      .replace(/\b([A-Z]{1,3})(\d{3})\b/g, "$1 $2") // C200 → C 200
      .replace(/\b(\d{3}) (e|d|de)\b/gi, (_, n: string, s: string) => n + s.toLowerCase());
  return out;
}

const toNumber = (digits: string) => Number(digits.replace(/[^\d]/g, ""));

export function parseListing(text: string): ParsedListing {
  const title = readTitle(text);
  const { brand, model, version } = splitTitle(title);
  const result: ParsedListing = {
    isListing: false,
    title,
    brand,
    model,
    version,
    year: null,
    firstRegistration: null,
    km: null,
    fuel: null,
    gearbox: null,
    fiscalPower: null,
    price: null,
    options: "",
    body: BODIES.find(([pattern]) => pattern.test(model))?.[1] ?? null,
  };

  const lines = text
    .split("\n")
    .filter(
      (line) => /✅|✔|☑|➤|►|•/u.test(line) || /\b(km|cv|chv|essence|diesel|bo[iî]te)\b/i.test(line),
    )
    // "Kilométrage: 122.000 km" → keep the value.
    .map((line) =>
      clean(line).replace(/^[^:]{2,25}:\s*(?=\S)/, (label) => (/https?/.test(label) ? label : "")),
    )
    .filter(Boolean);
  const options: string[] = [];

  for (const line of lines) {
    let rest = line;
    const ymd = rest.match(/\b((?:19|20)\d{2})\s*\/+\s*(\d{1,2})(?:\s*\/+\s*(\d{1,2}))?\b/);
    const dmy = ymd ? null : rest.match(/\b(\d{1,2})\s*\/+\s*(\d{1,2})\s*\/+\s*((?:19|20)\d{2})\b/);
    const date = ymd ?? dmy;
    if (date && result.year === null) {
      const [y, m, d] = ymd ? [ymd[1], ymd[2], ymd[3]] : [dmy![3], dmy![2], dmy![1]];
      result.year = Number(y);
      if (Number(m) >= 1 && Number(m) <= 12)
        result.firstRegistration = d
          ? `${y}-${m!.padStart(2, "0")}-${d.padStart(2, "0")}`
          : `${y}-${m!.padStart(2, "0")}`;
      rest = rest.replace(date[0], " ");
    }
    const cv =
      rest.match(/\b(\d{1,2})\s*(?:cv|chv|ch|chevaux)\b/i) ??
      rest.match(/\b(?:cv|chv)\s*(\d{1,2})\b/i); // "CV8"
    if (cv && result.fiscalPower === null) {
      result.fiscalPower = Number(cv[1]);
      rest = rest.replace(cv[0], " ");
    }
    const price = rest.match(/\b(\d[\d\s.]{2,})\s*(?:dt|tnd|dinars?)\b/i);
    if (price && result.price === null) {
      result.price = toNumber(price[1]!);
      rest = rest.replace(price[0], " ");
    }
    const km = rest.match(/\b(\d{1,3}(?:[\s.]\d{3})+|\d{2,7})\s*(?:km|kms|kilom[eè]tres?)?\b/i);
    if (
      km &&
      result.km === null &&
      (/km/i.test(rest) || toNumber(km[1]!) >= 1000) &&
      !/tunis/i.test(rest)
    ) {
      result.km = toNumber(km[1]!);
      rest = rest.replace(km[0], " ");
    }
    if (result.fuel === null) {
      if (/rechargeable|plug/i.test(rest)) result.fuel = "Hybride rechargeable";
      else if (/hybride|hybrid/i.test(rest)) result.fuel = "Hybride";
      else if (/[ée]lectrique/i.test(rest)) result.fuel = "Électrique";
      else if (/diesel|gasoil/i.test(rest)) result.fuel = "Diesel";
      else if (/essence|benzine/i.test(rest)) result.fuel = "Essence";
    }
    if (result.gearbox === null) {
      if (/automatique|\bauto\b|\bbva\b|\bdsg\b/i.test(rest)) result.gearbox = "Auto";
      else if (/manuelle|\bbvm\b/i.test(rest)) result.gearbox = "Manuelle";
    }
    const leftover = rest
      .replace(
        /(essence|diesel|gasoil|hybride|rechargeable|[ée]lectrique|bo[iî]te|automatique|manuelle|vitesses?|\d\s*cylindres?|km)/gi,
        " ",
      )
      .replace(/\btunis\b\s*\d*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/options?|toit|cuir|cam[ée]ra|pack|jantes|gps|carplay/i.test(leftover))
      options.push(leftover);
  }
  result.options = options.join(", ");
  result.isListing = Boolean(
    (/a\s*vendre/i.test(text) || /[🚘🚗]/u.test(text)) &&
    (result.brand || result.year || result.km),
  );
  return result;
}
