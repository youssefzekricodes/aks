import type { Car } from "./cars";

import bmwFront from "@/assets/bmw-front.jpg.asset.json";
import bmwRear from "@/assets/bmw-rear.jpg.asset.json";
import bmwInterior from "@/assets/bmw-interior.jpg.asset.json";
import mercedesFront from "@/assets/mercedes-front.jpg.asset.json";
import mercedesRear from "@/assets/mercedes-rear.jpg.asset.json";
import mercedesInterior from "@/assets/mercedes-interior.jpg.asset.json";
import alfaFront from "@/assets/alfa-front.jpg.asset.json";
import alfaRear from "@/assets/alfa-rear.jpg.asset.json";
import alfaInterior from "@/assets/alfa-interior.jpg.asset.json";
import renaultFront from "@/assets/renault-front.jpg.asset.json";
import renaultRear from "@/assets/renault-rear.jpg.asset.json";
import renaultInterior from "@/assets/renault-interior.jpg.asset.json";
import yarisFront from "@/assets/yaris-front.jpg.asset.json";
import yarisRear from "@/assets/yaris-rear.jpg.asset.json";
import yarisInterior from "@/assets/yaris-interior.jpg.asset.json";
import gr86Front from "@/assets/gr86-front.jpg.asset.json";
import gr86Rear from "@/assets/gr86-rear.jpg.asset.json";
import gr86Interior from "@/assets/gr86-interior.jpg.asset.json";

export const DEMO_SITE_CONTENT = [
  { key: "inventory_title", label: "Titre de la section véhicules", value: "Véhicules en vitrine" },
];

export const DEMO_CARS: Car[] = [
  {
    id: "demo-bmw-serie-4",
    slug: "bmw-serie-4-coupe",
    name: "Série 4 Coupé",
    brand: "BMW",
    country: "Germany",
    year: 2022,
    price: 189000,
    km: "28 000 km",
    km_value: 28000,
    fuel: "Essence",
    gearbox: "Auto",
    body: "Coupé",
    state: "Occasion",
    images: [bmwFront.url, bmwRear.url, bmwInterior.url],
    description:
      "BMW Série 4 Coupé en parfait état, entretien complet, pack M Sport, sièges cuir et toit ouvrant.",
    published: true,
    sort_order: 1,
  },
  {
    id: "demo-mercedes-c",
    slug: "mercedes-classe-c",
    name: "Classe C 220d",
    brand: "Mercedes-Benz",
    country: "Germany",
    year: 2021,
    price: 165000,
    km: "45 000 km",
    km_value: 45000,
    fuel: "Diesel",
    gearbox: "Auto",
    body: "Berline",
    state: "Occasion",
    images: [mercedesFront.url, mercedesRear.url, mercedesInterior.url],
    description:
      "Mercedes Classe C 220d AMG Line, première main, carnet d'entretien à jour, garantie 6 mois.",
    published: true,
    sort_order: 2,
  },
  {
    id: "demo-alfa-giulia",
    slug: "alfa-romeo-giulia",
    name: "Giulia Veloce",
    brand: "Alfa Romeo",
    country: "Italy",
    year: 2023,
    price: 210000,
    km: "12 000 km",
    km_value: 12000,
    fuel: "Essence",
    gearbox: "Auto",
    body: "Berline",
    state: "Occasion",
    images: [alfaFront.url, alfaRear.url, alfaInterior.url],
    description:
      "Alfa Romeo Giulia Veloce, comportement sportif, intérieur cuir rouge, état impeccable.",
    published: true,
    sort_order: 3,
  },
  {
    id: "demo-renault-clio",
    slug: "renault-clio",
    name: "Clio V",
    brand: "Renault",
    country: "France",
    year: 2020,
    price: 62000,
    km: "78 000 km",
    km_value: 78000,
    fuel: "Diesel",
    gearbox: "Manuelle",
    body: "Citadine",
    state: "Occasion",
    images: [renaultFront.url, renaultRear.url, renaultInterior.url],
    description: "Renault Clio V économique, idéale en ville, très bon état général.",
    published: true,
    sort_order: 4,
  },
  {
    id: "demo-toyota-yaris",
    slug: "toyota-yaris-hybride",
    name: "Yaris Hybride",
    brand: "Toyota",
    country: "Japan",
    year: 2023,
    price: 89000,
    km: "15 000 km",
    km_value: 15000,
    fuel: "Hybride",
    gearbox: "Auto",
    body: "Citadine",
    state: "Neuf",
    images: [yarisFront.url, yarisRear.url, yarisInterior.url],
    description: "Toyota Yaris Hybride, consommation record, garantie constructeur.",
    published: true,
    sort_order: 5,
  },
  {
    id: "demo-toyota-gr86",
    slug: "toyota-gr86",
    name: "GR86",
    brand: "Toyota",
    country: "Japan",
    year: 2024,
    price: 235000,
    km: "5 000 km",
    km_value: 5000,
    fuel: "Essence",
    gearbox: "Manuelle",
    body: "Coupé",
    state: "Neuf",
    images: [gr86Front.url, gr86Rear.url, gr86Interior.url],
    description: "Toyota GR86 boîte manuelle, coupé sportif propulsion, disponible immédiatement.",
    published: true,
    sort_order: 6,
  },
];
