import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { Banknote, Repeat, Wrench, Ship, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";

export function Services() {
  const text = useSiteText();

  const serviceItems = useSiteCollection("services.items");
  const icons = { Banknote, Repeat, Wrench, Ship, ShieldCheck };
  const services = serviceItems.map((item) => ({
    ...item,
    icon: icons[item.icon as keyof typeof icons] ?? ShieldCheck,
  }));

  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          {text("services.text_1", "Services")}
        </p>
        <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
          {text("services.text_2", "Tout, sous le même toit")}
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={i} delay={i * 70}>
            <div className="glass-panel h-full rounded-xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
