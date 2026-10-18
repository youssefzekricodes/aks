import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Data stays fresh for 30 s: going back to a page shows it at once without refetching.
  // Saving anything invalidates the affected lists right away.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Hovering a link starts loading that page's code and data.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
