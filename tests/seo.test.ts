import { test } from "node:test";
import assert from "node:assert/strict";
import { allLandings, brandLanding, landingFor } from "../src/features/seo/landings.ts";
import { openingHours } from "../src/features/seo/hours.ts";

test("landing pages: exactly one supported filter", () => {
  assert.equal(landingFor({ carrosserie: "suv" })?.h1, "SUV d’occasion à Sfax");
  assert.equal(landingFor({ boite: "auto" })?.h1, "Voitures automatiques d’occasion à Sfax");
  assert.equal(landingFor({ prix_max: 40_000 })?.path, "/recherche?prix_max=40000");
  assert.equal(landingFor({ carrosserie: "suv", energie: "diesel" }), null, "two filters");
  assert.equal(landingFor({ carrosserie: "suv", tri: "prix-asc" }), null, "sorted variant");
  assert.equal(landingFor({ marque: "bmw" }), null, "brands have their own pages");
  assert.equal(landingFor({}), null);
  const paths = allLandings().map((l) => l.path);
  assert.equal(new Set(paths).size, paths.length, "no duplicate landing pages");
  for (const landing of allLandings()) assert.ok(landing.title.length <= 75, landing.title);
});

test("brand wording with and without stock", () => {
  assert.match(brandLanding("Peugeot", 3).title, /^Peugeot occasion Sfax — 3 véhicules/);
  assert.match(brandLanding("Peugeot", 0).intro, /importer/);
});

test("opening hours become schema.org specifications", () => {
  assert.deepEqual(openingHours([{ day: "Tous les jours (7j/7)", time: "09:00 – 21:00" }])[0], {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "09:00",
    closes: "21:00",
  });
  const week = openingHours([
    { day: "Lundi – Samedi", time: "9h00 - 19h30" },
    { day: "Dimanche", time: "Fermé" },
  ]);
  assert.equal(week.length, 1, "closed days are skipped");
  assert.deepEqual(week[0]?.["dayOfWeek"], [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]);
  assert.equal(week[0]?.["opens"], "09:00");
});
