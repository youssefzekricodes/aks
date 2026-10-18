import {
  brandLogosQuery,
  brandSettingsQuery,
  publicConfigQuery,
  siteContentQuery,
} from "@/lib/queries";
import { resolveContent } from "@/features/content/definition";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button, Toast } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { I18nProvider, RouterProvider } from "react-aria-components";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">Cette page n’existe pas ou a été déplacée.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className={buttonVariants({ variant: "primary" })}>
            Accueil
          </Link>
          <Link to="/recherche" className={buttonVariants({ variant: "secondary" })}>
            Voir les véhicules
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Cette page n’a pas pu être chargée</h1>
        <p className="mt-2 text-sm text-muted">
          Une erreur est survenue de notre côté. Réessayez ou revenez à l’accueil.
        </p>
        {/* Setup problems are safe to show and save a trip to the server logs. */}
        {error.message.startsWith("Configuration manquante") && (
          <p className="mt-4 rounded-md bg-surface-secondary p-3 text-left font-mono text-xs">
            {error.message}. Complétez le fichier .env (voir .env.example et le README).
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onPress={() => {
              router.invalidate();
              reset();
            }}
          >
            Réessayer
          </Button>
          <a href="/" className={buttonVariants({ variant: "secondary" })}>
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    const [content] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(brandLogosQuery),
      context.queryClient.ensureQueryData(brandSettingsQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const favicon = resolveContent(content, "identity.favicon");
    const faviconHref = favicon.startsWith("data:")
      ? favicon
      : `${favicon}${favicon.includes("?") ? "&" : "?"}v=20260919-3`;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: resolveContent(content, "seo.home_title") },
        { name: "author", content: resolveContent(content, "seo.site_name") },
        { name: "theme-color", content: "#1c1c1f" },
        { name: "color-scheme", content: "light" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", href: faviconHref },
      ],
    };
  },

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // Light theme only; the header and footer bands are dark by design.
    <html lang="fr" className="light" data-theme="light">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="fr-FR">
        {/* Lets HeroUI links (href) navigate client-side through TanStack Router. */}
        <RouterProvider
          navigate={(href) => router.navigate({ href })}
          useHref={(href) => router.buildLocation({ to: href }).href}
        >
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toast.Provider placement="top" />
        </RouterProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
