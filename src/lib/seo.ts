/** Shared head() builder: title, description, canonical, Open Graph and JSON-LD. */
export function seo({
  title,
  description,
  origin,
  path,
  image,
  siteName,
  jsonLd = [],
  noindex = false,
}: {
  title: string;
  description: string;
  origin: string | null | undefined;
  path: string;
  image?: string | undefined;
  siteName?: string | undefined;
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
}) {
  const absolute = (url: string) =>
    origin && url.startsWith("/") && !url.startsWith("//") ? `${origin}${url}` : url;
  const canonical = origin ? `${origin}${path}` : undefined;
  const ogImage = image && !image.startsWith("data:") ? absolute(image) : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_TN" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(siteName ? [{ property: "og:site_name", content: siteName }] : []),
      ...(canonical ? [{ property: "og:url", content: canonical }] : []),
      ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
      { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    ],
    links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    scripts: jsonLd.map((data) => ({
      type: "application/ld+json",
      // "<" is escaped so content can never close the script element.
      children: JSON.stringify(data).replace(/</g, "\\u003c"),
    })),
  };
}

export const absoluteUrl = (origin: string | null | undefined, path: string) =>
  origin && path.startsWith("/") ? `${origin}${path}` : path;
