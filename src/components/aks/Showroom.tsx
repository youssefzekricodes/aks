import { buttonVariants } from "@heroui/styles";
import { Clock, MapPin, Navigation, Phone, MessageCircle } from "@/components/icons";
import { usePhones, useSiteCollection, useSiteText } from "@/lib/site-content";
import { telHref, whatsappHref } from "@/features/content/definition";
import { cn } from "@/lib/utils";
import { Eyebrow, Section, sectionTitle } from "./Section";

export function Showroom() {
  const text = useSiteText();
  const hours = useSiteCollection("showroom.items");
  const { phones, primary, whatsapp } = usePhones();

  return (
    <Section id="showroom" className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Eyebrow>{text("showroom.text_1", "Showroom")}</Eyebrow>
        <h2 className={cn("mt-4", sectionTitle)}>
          {text("showroom.text_2", "Venez nous voir à Sfax")}
        </h2>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <dd>{text("showroom.text_3", "Route Sidi Mansour, km 5, Sfax 3000, Tunisie")}</dd>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <dd>
              <ul className="space-y-1">
                {phones.map((phone) => (
                  <li key={phone.number}>
                    <a href={telHref(phone.number)} className="tabular hover:underline">
                      {phone.number}
                    </a>
                    {phone.label && <span className="text-muted"> · {phone.label}</span>}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <dd className="w-full">
              <ul className="divide-y divide-separator">
                {hours.map(({ day, time }, index) => (
                  <li key={index} className="flex justify-between gap-4 py-1.5 first:pt-0">
                    <span className="text-muted">{day}</span>
                    <span className="tabular">{time}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={text("showroom.link_1", "https://maps.google.com/?cid=1401009504837379981")}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            <Navigation className="size-4" /> {text("showroom.text_4", "Itinéraire")}
          </a>
          {whatsapp && (
            <a
              href={whatsappHref(whatsapp.number)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary" })}
            >
              <MessageCircle className="size-4" /> {text("showroom.text_5", "WhatsApp")}
            </a>
          )}
          <a
            href={telHref(primary?.number ?? "")}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Phone className="size-4" /> {text("showroom.text_6", "Appeler")}
          </a>
        </div>
      </div>

      <div className="min-h-80 overflow-hidden rounded-2xl border border-border bg-surface-secondary shadow-sm">
        <iframe
          title={text("showroom.text_7", "Carte du showroom Auto Kontor Sfax")}
          src={text(
            "showroom.map_1",
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4233.124664045077!2d10.801239876594309!3d34.774284672893685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1301cd00203db7e3%3A0x137162b8c6c7278d!2sAKS%20%7C%20AUTO%20KONTOR%20SFAX!5e1!3m2!1sen!2stn!4v1792320644358!5m2!1sen!2stn",
          )}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full min-h-80 border-0"
        />
      </div>
    </Section>
  );
}
