import { Clock, MapPin, Navigation, Phone, MessageCircle } from "lucide-react";
import { BtnLink } from "./Btn";
import { Reveal } from "./Reveal";

const hours = [
  ["Lundi – Vendredi", "08:30 – 18:30"],
  ["Samedi", "09:00 – 16:00"],
  ["Dimanche", "Sur rendez-vous"],
];

export function Showroom() {
  return (
    <section id="showroom" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
        <Reveal>
          <div className="glass-panel h-full rounded-2xl p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Showroom
            </p>
            <h2 className="mt-4 text-4xl font-bold">Venez nous voir à Sfax</h2>

            <div className="mt-8 space-y-5 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Route de Tunis km 4, Sfax 3000, Tunisie
                </p>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <a href="tel:+21674000000" className="text-muted-foreground hover:text-foreground">
                  +216 74 000 000
                </a>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <ul className="w-full space-y-1.5">
                  {hours.map(([d, h]) => (
                    <li key={d} className="flex justify-between gap-4 text-muted-foreground">
                      <span>{d}</span>
                      <span className="text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <BtnLink
                href="https://www.google.com/maps/search/?api=1&query=Sfax+Tunisie"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="h-4 w-4" /> Itinéraire
              </BtnLink>
              <BtnLink href="https://wa.me/21674000000" target="_blank" rel="noopener noreferrer" variant="steel">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </BtnLink>
              <BtnLink href="tel:+21674000000" variant="steel">
                <Phone className="h-4 w-4" /> Appeler
              </BtnLink>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="glass-panel h-full min-h-[380px] overflow-hidden rounded-2xl p-2">
            <iframe
              title="Carte du showroom Auto Kontor Sfax"
              src="https://www.openstreetmap.org/export/embed.html?bbox=10.68%2C34.70%2C10.82%2C34.79&layer=mapnik"
              loading="lazy"
              className="h-full min-h-[364px] w-full rounded-xl grayscale-[0.6] contrast-125"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
