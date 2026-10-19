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
    // A new page starts at its top at once (no smooth scroll while the content changes),
    // e.g. opening a similar vehicle from a vehicle page.
    scrollRestorationBehavior: "instant",
    // Hovering a link starts loading that page's code and data.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Smooth page changes (View Transitions API, ignored by older browsers). Only when
    // the page changes: filters and tabs that only change the query string stay instant.
    defaultViewTransition: {
      types: ({ pathChanged }) => (pathChanged ? ["page"] : false),
    },
  });

  return router;
};
