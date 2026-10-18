/**
 * Origins allowed for state-changing requests: APP_ORIGIN and the address the
 * site is being served on (custom domain, *.netlify.app…). The browser sets the
 * Origin header, so a page on another website cannot pass this check.
 */
export function isAllowedOrigin(
  origin: string | null,
  request: {
    url: string;
    host?: string | null | undefined;
    forwardedHost?: string | null | undefined;
    forwardedProto?: string | null | undefined;
    appOrigin?: string | null | undefined;
  },
) {
  if (!origin) return { ok: false, allowed: [] as string[] };
  const url = new URL(request.url);
  const host = request.forwardedHost ?? request.host;
  const protocol = request.forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const allowed = new Set([url.origin]);
  if (request.appOrigin) allowed.add(request.appOrigin);
  if (host) allowed.add(`${protocol}://${host.split(",")[0]!.trim()}`);
  return { ok: allowed.has(origin), allowed: [...allowed] };
}
