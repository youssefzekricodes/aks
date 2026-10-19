import { createFileRoute } from "@tanstack/react-router";
import { normalizeOrigin } from "@/lib/seo";
import { requestSiteOrigin } from "@/server/origin";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = requestSiteOrigin(request, normalizeOrigin(process.env["APP_ORIGIN"]));
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /auth",
          "Disallow: /_serverFn/",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
