import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Data stays fresh for 30 s: going back to a page shows it at once without refetching.
  // Saving anything invalidates the affected lists right away.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

  let firstRender = true;
  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Back/forward restores the position; a new page starts at the top. Except on the
    // very first load: if the visitor already scrolled the page before the app finished
    // starting (slow phone), it must not jump them back to the top.
    scrollRestoration: () => {
      // Also asked on the server (to render the page): always yes there.
      if (typeof window === "undefined" || !firstRender) return true;
      firstRender = false;
      return window.scrollY === 0;
    },
    // A new page starts at its top at once (no smooth scroll while the content changes),
    // e.g. opening a similar vehicle from a vehicle page.
    scrollRestorationBehavior: "instant",
    // Hovering a link starts loading that page's code and data.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Smooth page changes (View Transitions API, ignored by older browsers). Only when
    // the page changes: filters and tabs that only change the query string stay instant.
    // Not in the admin on phones: it has its own slide-in, and the browser's snapshot
    // of the old page could linger on screen while the new one draws.
    defaultViewTransition: {
      types: ({ pathChanged, toLocation }) =>
        !pathChanged ||
        (toLocation.pathname.startsWith("/admin") &&
          typeof window !== "undefined" &&
          window.innerWidth < 1024)
          ? false
          : ["page"],
    },
  });

  return router;
};
