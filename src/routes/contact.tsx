import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { buttonVariants } from "@heroui/styles";
import { X } from "@/components/icons";
import { resolveContent } from "@/features/content/definition";
import { publicCarQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { useSiteText } from "@/lib/site-content";
import { carImage, carTitle, formatKm, formatPrice, salePrice, type Car } from "@/lib/cars";
import { seo } from "@/lib/seo";
import { dealerJsonLd } from "@/features/seo/structured";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter } from "@/components/aks/SiteFooter";
import { ContactForm } from "@/components/aks/ContactForm";

const searchSchema = z.object({
  vehicule: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(200)
    .optional()
    .catch(undefined),
  objet: z.enum(["essai", "offre", "prix"]).optional().catch(undefined),
});

export const Route = createFileRoute("/contact")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ vehicule: search.vehicule }),
  loader: async ({ context, deps }) => {
    const [content, config, car] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
      deps.vehicule
        ? context.queryClient.ensureQueryData(publicCarQuery(deps.vehicule))
        : Promise.resolve(null),
    ]);
    return { content, origin: config.origin, car };
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content ?? {};
    const site = resolveContent(content, "seo.site_name");
    return seo({
      title: `Contact et adresse — ${site} (AKS), showroom automobile à Sfax`,
      description: resolveContent(
        content,
        "contact.text_3",
        "Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.",
      ),
      siteName: site,
      origin: loaderData?.origin,
      path: "/contact",
      // Vehicle-specific variants are the same page with a pre-filled message.
      noindex: Boolean(loaderData?.car),
      jsonLd: [dealerJsonLd(content, loaderData?.origin)],
    });
  },
  component: ContactPage,
});

function prefill(car: Car | null, objet: "essai" | "offre" | "prix" | undefined) {
  if (!car) return "";
  const name = `${carTitle(car)} (${car.year})`;
  if (objet === "essai")
    return `Bonjour, je souhaite réserver un essai pour la ${name}. Pouvez-vous me communiquer vos disponibilités ?`;
  if (objet === "prix")
    return `Bonjour, je souhaite connaître le prix et les détails de la ${name}. Merci de me recontacter.`;
  if (objet === "offre")
    return `Bonjour, je souhaite recevoir une offre pour la ${name}. Merci de me recontacter.`;
  return `Bonjour, je suis intéressé(e) par la ${name}. Merci de me recontacter.`;
}

/** One screen: details on the left, form on the right (stacked on small screens). */
function ContactPage() {
  const text = useSiteText();
  const { car } = Route.useLoaderData();
  const { objet } = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container-page grid flex-1 content-center gap-8 py-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-12">
        <section>
          <p className="text-sm font-medium text-accent">{text("contact.text_1", "Contact")}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {text("contact.text_2", "Parlons de votre projet")}
          </h1>
          <p className="mt-3 max-w-md text-muted">
            {text(
              "contact.text_3",
              "Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.",
            )}
          </p>

          {/* Larger screens only (phones go straight to the form): how a request goes. */}
          <ol className="mt-8 hidden gap-5 lg:grid">
            {[
              [
                text("contact.step_1_title", "Envoyez votre demande"),
                text(
                  "contact.step_1_text",
                  "Un véhicule, une reprise, un financement : quelques mots suffisent.",
                ),
              ],
              [
                text("contact.step_2_title", "On vous rappelle"),
                text(
                  "contact.step_2_text",
                  "Un conseiller vous répond rapidement, par téléphone ou WhatsApp.",
                ),
              ],
              [
                text("contact.step_3_title", "Rendez-vous au showroom"),
                text(
                  "contact.step_3_text",
                  "Essai, estimation de votre véhicule et dossier, au même endroit.",
                ),
              ],
            ].map(([title, body], index) => (
              <li key={index} className="flex gap-4">
                <span className="tabular grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className="relative mt-8 hidden overflow-hidden rounded-2xl lg:block">
            <img
              src={text("hero.image_1", "/images/aks-storefront.jpg")}
              alt={text("contact.photo_alt", "Showroom Auto Kontor Sfax")}
              loading="lazy"
              className="aspect-[16/9] w-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-4 pt-10 text-sm font-medium text-white">
              {text("contact.photo_caption", "Le showroom Auto Kontor Sfax")}
            </figcaption>
          </figure>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          {car && (
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-surface-secondary p-2.5">
              <img
                src={carImage(car)}
                alt=""
                width={96}
                height={72}
                className="h-14 w-[4.6rem] shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{carTitle(car)}</p>
                <p className="tabular truncate text-xs text-muted">
                  {car.year} · {formatKm(car.km_value)} ·{" "}
                  {car.price_on_request ? "Prix sur demande" : formatPrice(salePrice(car))}
                </p>
              </div>
              <Link
                to="/contact"
                search={{}}
                aria-label="Retirer le véhicule de la demande"
                className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}
              >
                <X className="size-4" />
              </Link>
            </div>
          )}
          {/* Remount when the vehicle or subject changes so the pre-filled message follows. */}
          <ContactForm
            key={`${car?.slug ?? ""}-${objet ?? ""}`}
            initialMessage={prefill(car, objet)}
            carSlug={car?.slug}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
