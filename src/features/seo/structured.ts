import { primaryPhone, resolveContent, resolvePhones } from "@/features/content/definition";
import { absoluteUrl } from "@/lib/seo";
import { openingHours } from "./hours";

/**
 * Structured data (schema.org JSON-LD) describing the dealership, shared by the
 * pages: Google uses it for the knowledge panel, local results and rich results.
 * Values come from Contenu du site, so they stay in sync with what visitors see.
 */

/** Names people search for: all point to the same business. */
export const DEALER_NAMES = ["AKS", "AKS Sfax", "Auto Kontor", "Auto Kontor Sfax", "AKS Auto Sfax"];

/** Showroom position (from the Google Maps listing). */
const GEO = { latitude: 34.774285, longitude: 10.80124 };

const parseJson = <T>(value: string | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** The AutoDealer entity; other schemas reference it by its @id. */
export function dealerJsonLd(content: Record<string, string>, origin: string | null | undefined) {
  const get = (key: string) => resolveContent(content, key);
  const phones = resolvePhones(content);
  const primary = primaryPhone(phones);
  const hours = parseJson<{ day: string; time: string }[]>(get("showroom.items"), []);
  const email = get("identity.email");
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": absoluteUrl(origin, "/#dealer"),
    name: get("seo.site_name") || "Auto Kontor Sfax",
    alternateName: DEALER_NAMES,
    description: get("seo.home_description"),
    url: absoluteUrl(origin, "/"),
    logo: absoluteUrl(origin, get("identity.logo")),
    image: absoluteUrl(origin, get("hero.image_1")),
    ...(primary ? { telephone: primary.number } : {}),
    ...(email ? { email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Route Sidi Mansour, km 5",
      addressLocality: "Sfax",
      addressRegion: "Sfax",
      postalCode: "3000",
      addressCountry: "TN",
    },
    geo: { "@type": "GeoCoordinates", ...GEO },
    hasMap: get("showroom.link_1"),
    areaServed: [
      { "@type": "City", name: "Sfax" },
      { "@type": "Country", name: "Tunisie" },
    ],
    openingHoursSpecification: openingHours(hours),
    priceRange: "$$",
    currenciesAccepted: "TND",
    paymentAccepted: "Espèces, virement, financement bancaire",
    sameAs: [get("contact.link_1"), get("contact.link_instagram")].filter(Boolean),
    makesOffer: [
      "Vente de voitures d'occasion",
      "Vente de voitures neuves",
      "Reprise de véhicule",
      "Financement automobile",
      "Importation de véhicules sur commande",
    ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
  };
}

/** Site name in results and the search box Google can show under the site. */
export function websiteJsonLd(content: Record<string, string>, origin: string | null | undefined) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl(origin, "/#website"),
    name: resolveContent(content, "seo.site_name") || "Auto Kontor Sfax",
    alternateName: DEALER_NAMES,
    url: absoluteUrl(origin, "/"),
    inLanguage: "fr-TN",
    publisher: { "@id": absoluteUrl(origin, "/#dealer") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl(origin, "/recherche?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function breadcrumbJsonLd(
  origin: string | null | undefined,
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(origin, item.path),
    })),
  };
}
