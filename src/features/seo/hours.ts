// Pure helper (no app imports): also used by the Node tests.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES: Record<string, string> = {
  lundi: "Monday",
  mardi: "Tuesday",
  mercredi: "Wednesday",
  jeudi: "Thursday",
  vendredi: "Friday",
  samedi: "Saturday",
  dimanche: "Sunday",
};

/**
 * Opening hours from the "Horaires" lines ("Lundi – Samedi" / "09:00 – 19:00").
 * "Tous les jours" or "7j/7" means every day; "Fermé" lines are skipped.
 */
export function openingHours(rows: { day: string; time: string }[]) {
  const specs: Record<string, unknown>[] = [];
  for (const { day, time } of rows) {
    const hours = time.match(/(\d{1,2})[:h](\d{2})\D+(\d{1,2})[:h](\d{2})/);
    if (!hours) continue;
    const pad = (h: string, m: string) => `${h.padStart(2, "0")}:${m}`;
    const lower = day.toLowerCase();
    let days: string[];
    if (/tous|7\s*j|7\/7/.test(lower)) days = DAYS;
    else {
      const found = Object.keys(DAY_NAMES).filter((name) => lower.includes(name));
      // "Lundi – Samedi": a range between the first and last day named.
      if (found.length === 2 && /[–-]|au|à/.test(lower)) {
        const start = DAYS.indexOf(DAY_NAMES[found[0]!]!);
        const end = DAYS.indexOf(DAY_NAMES[found[1]!]!);
        const [a, b] = [Math.min(start, end), Math.max(start, end)];
        days = DAYS.slice(a, b + 1);
      } else days = found.map((name) => DAY_NAMES[name]!);
    }
    if (!days.length) continue;
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: pad(hours[1]!, hours[2]!),
      closes: pad(hours[3]!, hours[4]!),
    });
  }
  return specs;
}
