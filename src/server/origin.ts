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

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i;

/**
 * Public address used in canonical links, the sitemap and robots.txt. APP_ORIGIN
 * wins, except a local address (a copied .env) while the site is served on a real
 * domain: then the address the visitor or crawler used is taken instead.
 */
export function siteOrigin(request: {
  url: string;
  host?: string | null | undefined;
  forwardedHost?: string | null | undefined;
  forwardedProto?: string | null | undefined;
  appOrigin?: string | null | undefined;
}) {
  const url = new URL(request.url);
  const host = (request.forwardedHost ?? request.host)?.split(",")[0]?.trim();
  const protocol = request.forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const served = host ? `${protocol}://${host}` : url.origin;
  if (request.appOrigin && !(LOCAL.test(request.appOrigin) && !LOCAL.test(served)))
    return request.appOrigin;
  return served;
}

/** siteOrigin() for an incoming Request (headers set by Netlify / the dev server). */
export function requestSiteOrigin(request: Request, appOrigin: string | null | undefined) {
  return siteOrigin({
    url: request.url,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    appOrigin,
  });
}
