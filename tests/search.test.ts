import { test } from "node:test";
import assert from "node:assert/strict";
import type { Car } from "../src/lib/cars.ts";
import {
  quickSearch,
  arrangeBrands,
  relatedCars,
  bodyOptions,
  carouselBrands,
  brandOptions,
  facetOptions,
  filterCars,
  paginate,
  sortCars,
  validateSearch,
  PAGE_SIZE,
} from "../src/features/catalog/search.ts";

const car = (over: Partial<Car>): Car => ({
  id: over.slug ?? "x",
  slug: "x",
  name: "Modèle",
  brand: "BMW",
  country: "Germany",
  year: 2020,
  price: 100_000,
  km: "",
  km_value: 50_000,
  fuel: "Essence",
  gearbox: "Auto",
  body: "Berline",
  state: "Occasion",
  images: [],
  description: "",
  published: true,
  sort_order: 0,
  ...over,
});

const cars = [
  car({
    slug: "bmw-s4",
    brand: "BMW",
    model: "Série 4",
    name: "Série 4 Coupé",
    body: "Coupé",
    price: 189_000,
    km_value: 28_000,
    year: 2022,
    sort_order: 1,
  }),
  car({
    slug: "mb-c",
    brand: "Mercedes-Benz",
    model: "Classe C",
    name: "Classe C 220d",
    fuel: "Diesel",
    price: 165_000,
    km_value: 45_000,
    year: 2021,
    sort_order: 2,
  }),
  car({
    slug: "clio",
    brand: "Renault",
    name: "Clio V",
    body: "Citadine",
    gearbox: "Manuelle",
    price: 52_000,
    km_value: 0,
    state: "Neuf",
    year: 2024,
    sort_order: 3,
  }),
  car({
    slug: "yaris",
    brand: "Toyota",
    model: "Yaris",
    name: "Yaris Hybride",
    body: "Citadine",
    fuel: "Hybride",
    price: 0,
    price_on_request: true,
    km_value: 12_000,
    sort_order: 4,
  }),
  car({
    slug: "gr86",
    brand: "Toyota",
    model: "GR86",
    name: "GR86",
    body: "Coupé",
    price: 140_000,
    km_value: 8_000,
    sort_order: 5,
  }),
];

test("validateSearch keeps valid keys, drops invalid ones and orphan models", () => {
  assert.deepEqual(validateSearch({ marque: "bmw", prix_max: "200000", tri: "prix-asc" }), {
    marque: "bmw",
    prix_max: 200000,
    tri: "prix-asc",
  });
  assert.deepEqual(validateSearch({ marque: "BMW <script>", tri: "nope", page: "-1" }), {});
  assert.deepEqual(validateSearch({ modele: "serie-4" }), {}, "a model needs a brand");
});

test("validateSearch translates pre-redesign links", () => {
  assert.deepEqual(
    validateSearch({ price: "50000-100000", type: "SUV", km: "0-50000", brand: "Mercedes-Benz" }),
    {
      marque: "mercedes-benz",
      carrosserie: "suv",
      prix_min: 50000,
      prix_max: 100000,
      km_max: 50000,
    },
  );
  assert.deepEqual(validateSearch({ price: "all", type: "all", km: "all", brand: "all" }), {});
});

test("filters combine; unpriced cars never match a price bound", () => {
  assert.deepEqual(
    filterCars(cars, { marque: "toyota" }).map((c) => c.slug),
    ["yaris", "gr86"],
  );
  assert.deepEqual(
    filterCars(cars, { marque: "toyota", modele: "gr86" }).map((c) => c.slug),
    ["gr86"],
  );
  assert.deepEqual(
    filterCars(cars, { prix_max: 150_000 }).map((c) => c.slug),
    ["clio", "gr86"],
  );
  assert.deepEqual(
    filterCars(cars, { carrosserie: "coupe", km_max: 10_000 }).map((c) => c.slug),
    ["gr86"],
  );
  assert.deepEqual(
    filterCars(cars, { boite: "manuelle", etat: "neuf" }).map((c) => c.slug),
    ["clio"],
  );
  assert.deepEqual(
    filterCars(cars, { q: "classe c 2021" }).map((c) => c.slug),
    ["mb-c"],
  );
});

test("models fall back to the legacy name when no model is stored", () => {
  assert.deepEqual(
    facetOptions(cars, { marque: "renault" }, "modele").map((o) => o.label),
    ["Clio V"],
  );
});

test("facet counts ignore their own filter but respect the others", () => {
  const bodies = facetOptions(cars, { carrosserie: "coupe", marque: "toyota" }, "carrosserie");
  assert.deepEqual(
    bodies.map((o) => [o.value, o.count]),
    [
      ["citadine", 1],
      ["coupe", 1],
    ],
  );
  const brands = facetOptions(cars, { carrosserie: "coupe" }, "marque");
  assert.deepEqual(
    brands.map((o) => [o.value, o.count]),
    [
      ["bmw", 1],
      ["toyota", 1],
    ],
  );
});

test("sorting puts 'prix à discuter' last in both price orders", () => {
  assert.deepEqual(
    sortCars(cars, "prix-asc")
      .map((c) => c.slug)
      .at(-1),
    "yaris",
  );
  assert.deepEqual(
    sortCars(cars, "prix-desc").map((c) => c.slug),
    ["bmw-s4", "mb-c", "gr86", "clio", "yaris"],
  );
  assert.deepEqual(
    sortCars(cars).map((c) => c.slug),
    ["bmw-s4", "mb-c", "clio", "yaris", "gr86"],
  );
});

test("pagination clamps the page", () => {
  const many = Array.from({ length: PAGE_SIZE * 2 + 1 }, (_, i) => i);
  assert.deepEqual(paginate(many, 99).page, 3);
  assert.equal(paginate(many, 3).items.length, 1);
  assert.equal(paginate([], 1).pages, 1);
});

test("full brand and body lists include types and brands without stock", () => {
  const brands = brandOptions(cars, {});
  assert.ok(brands.length >= 59, "every known brand is listed");
  assert.equal(brands.find((b) => b.value === "audi")?.count, 0);
  assert.equal(brands.find((b) => b.value === "toyota")?.count, 2);
  // Sorted by availability: most cars first, then alphabetical.
  assert.deepEqual(
    brands.slice(0, 5).map((b) => b.value),
    ["toyota", "bmw", "mercedes-benz", "renault", "alfa-romeo"],
  );
  const bodies = bodyOptions(cars, {});
  assert.equal(bodies.length, 9);
  assert.deepEqual(
    bodies.filter((b) => b.count === 0).map((b) => b.value),
    ["compacte", "suv", "monospace", "utilitaire", "pick-up", "cabriolet"],
  );
});

test("brand settings: hidden brands drop out, favourites lead the carousel", () => {
  const cars = [
    car({ slug: "a", brand: "BMW" }),
    car({ slug: "b", brand: "BMW" }),
    car({ slug: "c", brand: "Audi" }),
    car({ slug: "d", brand: "Kia" }),
  ];
  const options = brandOptions(cars, {});
  const settings = [
    { slug: "kia", hidden: true, favoriteRank: null },
    { slug: "fiat", hidden: false, favoriteRank: 2 },
    { slug: "audi", hidden: false, favoriteRank: 1 },
  ];
  const arranged = arrangeBrands(options, settings);
  assert.deepEqual(
    arranged.slice(0, 3).map((o) => o.value),
    ["audi", "fiat", "bmw"],
  );
  assert.ok(!arranged.some((o) => o.value === "kia"), "hidden brand removed");
  assert.ok(
    arrangeBrands(options, settings, { keepStocked: true }).some((o) => o.value === "kia"),
    "hidden but stocked brand kept for filters",
  );
  assert.equal(carouselBrands(arranged, settings, 10).length, 10);
  const many = options.map((o, i) => ({ slug: o.value, hidden: false, favoriteRank: i + 1 }));
  assert.equal(carouselBrands(arrangeBrands(options, many), many, 10).length, options.length);
});

test("discounts: price filters and sorting use the discounted price", () => {
  const cars = [
    car({ slug: "plain", price: 90_000 }),
    car({ slug: "promo", price: 120_000, discount_price: 85_000 }),
  ];
  assert.deepEqual(
    filterCars(cars, { prix_max: 88_000 }).map((c) => c.slug),
    ["promo"],
  );
  assert.deepEqual(
    sortCars(cars, "prix-asc").map((c) => c.slug),
    ["promo", "plain"],
  );
});

test("related cars favour the same brand, body and price range, never the car itself", () => {
  const base = car({ slug: "base", brand: "BMW", model: "X5", body: "SUV", price: 200_000 });
  const cars = [
    base,
    car({ slug: "same-model", brand: "BMW", model: "X5", body: "SUV", price: 210_000 }),
    car({ slug: "other-suv", brand: "Audi", body: "SUV", price: 190_000 }),
    car({ slug: "far", brand: "Kia", body: "Citadine", price: 40_000, fuel: "Diesel", year: 2010 }),
    car({ slug: "bmw-sedan", brand: "BMW", body: "Berline", price: 400_000 }),
  ];
  const related = relatedCars(base, cars, 3).map((c) => c.slug);
  assert.equal(related[0], "same-model");
  assert.ok(!related.includes("base"));
  assert.ok(!related.includes("far"), "the least related car is left out");
  assert.equal(relatedCars(base, [base, cars[3]!], 3).length, 1, "fills in with other stock");
});

test("header search: nicknames, every word must match, brands with stock first", () => {
  const cars = [
    car({ slug: "golf", brand: "Volkswagen", model: "Golf", name: "Golf 8", year: 2020 }),
    car({ slug: "x5", brand: "BMW", model: "X5", name: "X5", body: "SUV", year: 2019 }),
  ];
  assert.deepEqual(
    quickSearch(cars, "vw").cars.map((c) => c.slug),
    ["golf"],
    "VW = Volkswagen",
  );
  assert.deepEqual(
    quickSearch(cars, "golf 2020").cars.map((c) => c.slug),
    ["golf"],
  );
  assert.deepEqual(quickSearch(cars, "golf 2019").cars, [], "every word must match");
  assert.deepEqual(
    quickSearch(cars, "suv").cars.map((c) => c.slug),
    ["x5"],
  );
  assert.equal(quickSearch(cars, "merc").brands[0]?.value, "mercedes-benz");
  assert.equal(quickSearch(cars, "b").brands[0]?.value, "bmw", "brand in stock first");
  assert.deepEqual(quickSearch(cars, "  "), { cars: [], brands: [] });
});

test("several brands: kept from the URL, matched, toggled; a model needs a single brand", async () => {
  const { validateSearch, filterCars, toggleBrand, brandsOf } =
    await import("../src/features/catalog/search.ts");
  const filters = validateSearch({ marque: "kia,mg,kia", modele: "sportage" });
  assert.equal(filters.marque, "kia,mg");
  assert.equal(filters.modele, undefined, "model dropped with two brands");
  assert.deepEqual(brandsOf(filters), ["kia", "mg"]);
  assert.equal(validateSearch({ marque: "kia", modele: "sportage" }).modele, "sportage");
  assert.equal(validateSearch({ marque: "kia,<script>" }).marque, undefined);

  const make = (brand: string) =>
    ({
      brand,
      name: "X",
      model: "X",
      year: 2020,
      km_value: 1,
      price: 1,
      fuel: "Essence",
      gearbox: "Auto",
      body: "SUV",
      state: "Occasion",
      country: "",
      images: [],
      slug: brand,
      description: "",
      published: true,
      sort_order: 0,
      id: brand,
      km: "",
    }) as never;
  const cars = [make("Kia"), make("MG"), make("Audi")];
  assert.deepEqual(
    filterCars(cars, { marque: "kia,mg" }).map((c: { brand: string }) => c.brand),
    ["Kia", "MG"],
  );
  assert.equal(toggleBrand({ marque: "kia" }, "mg"), "kia,mg");
  assert.equal(toggleBrand({ marque: "kia,mg" }, "kia"), "mg");
  assert.equal(toggleBrand({ marque: "kia" }, "kia"), undefined);
});
