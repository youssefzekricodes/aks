export type Car = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  country: string;
  year: number;
  price: number;
  km: string;
  km_value: number;
  fuel: string;
  gearbox: string;
  body: string;
  state: string;
  images: string[];
  description: string;
  published: boolean;
  sort_order: number;
};

export const CAR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><rect width="1024" height="768" fill="#0b0b0d"/></svg>',
  );

export function carImage(car: Pick<Car, "images">, index = 0) {
  return car.images[index] ?? CAR_PLACEHOLDER;
}

export const CAR_COUNTRIES = ["Japan", "China", "Germany", "Italy", "France"];
export const CAR_BODIES = ["SUV", "Berline", "Coupé", "Citadine", "Pick-up"];
export const CAR_STATES = ["Neuf", "Occasion"];
export const CAR_FUELS = ["Essence", "Diesel", "Hybride", "Électrique"];
export const CAR_GEARBOXES = ["Auto", "Manuelle"];
