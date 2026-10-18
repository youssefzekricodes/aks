import { queryOptions } from "@tanstack/react-query";
import {
  getPublicCar,
  getPublicConfig,
  listBrandLogos,
  listBrandSettings,
  listPublicCars,
  listPublicSiteContent,
} from "./data";

export const publicCarsQuery = queryOptions({
  queryKey: ["public-cars"],
  queryFn: () => listPublicCars(),
});

export const publicCarQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-car", slug],
    queryFn: () => getPublicCar(slug),
  });

export const siteContentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => listPublicSiteContent(),
});

export const brandLogosQuery = queryOptions({
  queryKey: ["brand-logos"],
  queryFn: () => listBrandLogos(),
});

export const brandSettingsQuery = queryOptions({
  queryKey: ["brand-settings"],
  queryFn: () => listBrandSettings(),
});

export const publicConfigQuery = queryOptions({
  queryKey: ["public-config"],
  queryFn: () => getPublicConfig(),
  staleTime: Infinity,
});
