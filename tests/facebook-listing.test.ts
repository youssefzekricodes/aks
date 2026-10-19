// Reading vehicles from real showroom Facebook posts (tests/fixtures-facebook-posts.json).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseListing } from "../src/features/catalog/facebook-listing.ts";

const posts = JSON.parse(
  readFileSync(new URL("./fixtures-facebook-posts.json", import.meta.url), "utf8"),
) as Record<string, string>;

test("reads the usual ✅ template", () => {
  const car = parseListing(posts["peugeot"]!);
  assert.equal(car.isListing, true);
  assert.equal(car.brand, "Peugeot");
  assert.equal(car.model, "3008");
  assert.equal(car.year, 2023);
  assert.equal(car.firstRegistration, "2023-01-10");
  assert.equal(car.km, 152000);
  assert.equal(car.fuel, "Hybride");
  assert.equal(car.gearbox, "Auto");
  assert.equal(car.fiscalPower, 10);
});

test("trim, km without unit, fuel and CV on one line", () => {
  const car = parseListing(posts["kia"]!);
  assert.equal(car.brand, "Kia");
  assert.equal(car.model, "Sportage");
  assert.equal(car.version, "GT Line");
  assert.equal(car.km, 166000);
  assert.equal(car.fiscalPower, 11);
  assert.match(car.options, /tout options/i);
});

test("brand typo and day/month/year dates", () => {
  const car = parseListing(posts["nissan"]!);
  assert.equal(car.brand, "Nissan");
  assert.equal(car.model, "Juke");
  assert.equal(car.year, 2012);
  assert.equal(car.firstRegistration, "2012-07-13");
});

test("model without brand, engine note left out", () => {
  const car = parseListing(posts["golf"]!);
  assert.equal(car.brand, "Volkswagen");
  assert.equal(car.model, "Golf 7");
  assert.equal(car.firstRegistration, "2016-05");
});

test("other templates: labelled lines (➤ / ☑️) and 🚗 titles", () => {
  const bmw = parseListing(posts["bmw"]!);
  assert.equal(bmw.brand, "BMW");
  assert.equal(bmw.version, "M Sport");
  assert.equal(bmw.km, 122000);
  assert.equal(bmw.year, 2021);
  assert.equal(bmw.fiscalPower, 10);
  const berlingo = parseListing(posts["berlingo"]!);
  assert.equal(berlingo.brand, "Citroën");
  assert.equal(berlingo.km, 167000);
  assert.equal(berlingo.fuel, "Diesel");
});

test("posts that are not vehicles", () => {
  assert.equal(parseListing(posts["greeting"]!).isListing, false);
  assert.equal(parseListing("").isListing, false);
});
