import type { Car } from "@/lib/cars";
/** Editable vehicle; without `sort_order` a new vehicle is placed first. */
export type CarInput = Omit<Car, "id" | "sort_order"> & {
  id?: string | undefined;
  sort_order?: number | undefined;
};
export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  car_slug: string | null;
  handled: boolean;
  created_at: string;
};
