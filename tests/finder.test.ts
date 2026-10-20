// "Trouver ma voiture": the questions adapt to the stock and never lead to nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Car } from "../src/lib/cars.ts";
import {
  answersToFilters,
  describeAnswers,
  finderResults,
  nextStep,
} from "../src/features/catalog/finder.ts";

const car = (over: Partial<Car>): Car => ({
  id: over.slug ?? "x",
  slug: "x",
  name: "Modèle",
  brand: "Kia",
  country: "Korea",
  year: 2020,
  price: 0,
  price_on_request: true,
  km: "",
  km_value: 50_000,
  fuel: "Essence",
  gearbox: "Auto",
  body: "SUV",
  state: "Occasion",
  images: [],
  description: "",
  published: true,
  sort_order: 0,
  ...over,
});

// Like the real stock: prices mostly hidden, some gearboxes not filled in.
const stock = [
  car({ slug: "a", body: "SUV", brand: "Kia", year: 2023 }),
  car({ slug: "b", body: "SUV", brand: "MG", gearbox: "À préciser", year: 2019 }),
  car({ slug: "c", body: "SUV", brand: "Kia", fuel: "Diesel", year: 2016 }),
  car({ slug: "d", body: "Citadine", brand: "Peugeot", gearbox: "À préciser", year: 2021 }),
  car({ slug: "e", body: "Pick-up", brand: "Toyota", fuel: "Diesel", year: 2018 }),
  car({ slug: "f", body: "Berline", brand: "Audi", price: 73_000, price_on_request: false }),
];

test("first question: the body types in stock, most common first, with counts", () => {
  const step = nextStep(stock, {}, []);
  assert.equal(step?.id, "carrosserie");
  assert.deepEqual(
    step?.options.map((o) => [o.label, o.count]),
    [
      ["SUV", 3],
      ["Berline", 1],
      ["Citadine", 1],
      ["Pick-up", 1],
    ],
  );
  assert.ok(step?.options.every((o) => o.hint));
});

test("no budget question while most cars show no price", () => {
  const step = nextStep(stock, { carrosserie: "suv" }, ["carrosserie"]);
  assert.notEqual(step?.id, "budget");
});

test("gearbox: only known values, asked when it narrows the choice", () => {
  const step = nextStep(stock, { carrosserie: "suv" }, ["carrosserie", "budget"]);
  assert.equal(step?.id, "boite");
  assert.deepEqual(
    step?.options.map((o) => [o.value, o.count]),
    [["auto", 2]],
  );
});

test("each answer narrows the results, and the summary reads naturally", () => {
  const answers = { carrosserie: "suv", boite: "auto", energie: "diesel" };
  assert.deepEqual(
    finderResults(stock, answers).map((c) => c.slug),
    ["c"],
  );
  assert.deepEqual(answersToFilters(answers), {
    carrosserie: "suv",
    boite: "auto",
    energie: "diesel",
  });
  assert.equal(describeAnswers(stock, answers), "SUV · boîte automatique · diesel");
});

test("nothing left to ask once a single car remains", () => {
  assert.equal(nextStep(stock, { carrosserie: "pick-up" }, ["carrosserie"]), null);
});

test("several brands at once, and the year bands", () => {
  const filters = answersToFilters({ marque: ["kia", "mg"], annee: "2018" });
  assert.deepEqual(filters, { marque: "kia,mg", annee_min: 2018 });
  assert.deepEqual(
    finderResults(stock, { marque: ["kia", "mg"], annee: "2018" }).map((c) => c.slug),
    ["a", "b"],
  );
});
