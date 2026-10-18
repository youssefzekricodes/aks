import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { buttonVariants } from "@heroui/styles";
import { Clock, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { resolveContent } from "@/features/content/definition";
import { publicCarQuery, publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { carImage, carTitle, formatKm, formatPrice, type Car } from "@/lib/cars";
import { seo } from "@/lib/seo";
import { Navbar } from "@/components/aks/Navbar";
import { SiteFooter, SocialLinks } from "@/components/aks/SiteFooter";
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
      title: `Contact — ${site}`,
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
  const hours = useSiteCollection("showroom.items");
  const { car } = Route.useLoaderData();
  const { objet } = Route.useSearch();

  const details = [
    {
      Icon: Phone,
      label: text("identity.phone", "+216 52 144 869"),
      href: text("identity.phone_link", "tel:+21652144869"),
    },
    {
      Icon: MessageCircle,
      label: "WhatsApp",
      href: text("identity.whatsapp", "https://wa.me/21652144869"),
      external: true,
    },
    {
      Icon: Mail,
      label: text("identity.email", "contact@autokontorsfax.tn"),
      href: text("identity.email_link", "mailto:contact@autokontorsfax.tn"),
    },
    {
      Icon: MapPin,
      label: text("showroom.text_3", "Route Sidi Mansour, km 5, Sfax 3000, Tunisie"),
      href: text("showroom.link_1", "https://maps.google.com/?cid=1401009504837379981"),
      external: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container-page grid flex-1 content-center gap-8 py-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
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

          <ul className="mt-6 grid gap-3 text-sm">
            {details.map(({ Icon, label, href, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-start gap-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-accent shadow-sm">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 self-center break-words group-hover:underline">
                    {label}
                  </span>
                </a>
              </li>
            ))}
            {hours.length > 0 && (
              <li className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-accent shadow-sm">
                  <Clock className="size-4" aria-hidden />
                </span>
                <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 self-center">
                  {hours.map(({ day, time }, index) => (
                    <div key={index} className="contents">
                      <dt className="text-muted">{day}</dt>
                      <dd className="tabular">{time}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            )}
          </ul>

          <SocialLinks className="mt-6" />
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
                  {car.price_on_request ? "Prix sur demande" : formatPrice(car.price)}
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
