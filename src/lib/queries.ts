import { queryOptions } from "@tanstack/react-query";
import { listPublicCars, listPublicSiteContent } from "./data";

export const publicCarsQuery = queryOptions({
  queryKey: ["public-cars"],
  queryFn: () => listPublicCars(),
});

export const siteContentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => listPublicSiteContent(),
});
