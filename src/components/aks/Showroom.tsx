import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { Clock, MapPin, Navigation, Phone, MessageCircle } from "lucide-react";
import { BtnLink } from "./Btn";
import { Reveal } from "./Reveal";

export function Showroom() {
  const text = useSiteText();

  const hours = useSiteCollection("showroom.items");

  return (
    <section id="showroom" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
        <Reveal>
          <div className="glass-panel h-full rounded-2xl p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {text("showroom.text_1", "Showroom")}
            </p>
            <h2 className="mt-4 text-4xl font-bold">
              {text("showroom.text_2", "Venez nous voir à Sfax")}
            </h2>

            <div className="mt-8 space-y-5 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  {text("showroom.text_3", "Route de Tunis km 4, Sfax 3000, Tunisie")}
                </p>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <a
                  href={text("identity.phone_link", "tel:+21674000000")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {text("identity.phone", "+216 74 000 000")}
                </a>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <ul className="w-full space-y-1.5">
                  {hours.map(({ day: d, time: h }, index) => (
                    <li key={index} className="flex justify-between gap-4 text-muted-foreground">
                      <span>{d}</span>
                      <span className="text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <BtnLink
                href={text(
                  "showroom.link_1",
                  "https://www.google.com/maps/search/?api=1&query=Sfax+Tunisie",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-4 w-4" /> {text("showroom.text_4", "Itinéraire")}
              </BtnLink>
              <BtnLink
                href={text("identity.whatsapp", "https://wa.me/21674000000")}
                target="_blank"
                rel="noopener noreferrer"
                variant="steel"
              >
                <MessageCircle className="h-4 w-4" /> {text("showroom.text_5", "WhatsApp")}
              </BtnLink>
              <BtnLink href={text("identity.phone_link", "tel:+21674000000")} variant="steel">
                <Phone className="h-4 w-4" /> {text("showroom.text_6", "Appeler")}
              </BtnLink>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="glass-panel h-full min-h-[380px] overflow-hidden rounded-2xl p-2">
            <iframe
              title={text("showroom.text_7", "Carte du showroom Auto Kontor Sfax")}
              src={text(
                "showroom.map_1",
                "https://www.openstreetmap.org/export/embed.html?bbox=10.68%2C34.70%2C10.82%2C34.79&layer=mapnik",
              )}
              loading="lazy"
              className="h-full min-h-[364px] w-full rounded-xl grayscale-[0.6] contrast-125"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
