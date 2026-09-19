import type { Car } from "@/lib/cars";
export type CarInput = Omit<Car, "id"> & { id?: string | undefined };
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
