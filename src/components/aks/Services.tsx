import { Banknote, Repeat, Wrench, Ship, ShieldCheck } from "lucide-react";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { Section, SectionHeader } from "./Section";

const icons = { Banknote, Repeat, Wrench, Ship, ShieldCheck };

export function Services() {
  const text = useSiteText();
  const services = useSiteCollection("services.items");

  return (
    <Section id="services">
      <SectionHeader
        title={text("services.text_2", "Tout, sous le même toit")}
        description={text("services.text_1", "Services")}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => {
          const Icon = icons[s.icon as keyof typeof icons] ?? ShieldCheck;
          return (
            <li key={i} className="rounded-lg border border-border bg-surface p-5">
              <Icon className="size-5 text-accent" aria-hidden />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
