import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@heroui/styles";
import { ArrowRight, Banknote, Repeat, Wrench, Ship, ShieldCheck } from "lucide-react";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";

const icons = { Banknote, Repeat, Wrench, Ship, ShieldCheck };

/**
 * Intro (eyebrow, title, text, call to action) beside numbered service cards.
 * With an odd number of services the last card spans the full row.
 */
export function Services() {
  const text = useSiteText();
  const services = useSiteCollection("services.items");
  if (!services.length) return null;

  return (
    <section id="services" className="relative overflow-hidden">
      {/* Soft accent glow behind the intro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 size-[28rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] lg:gap-14 lg:py-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
            <span className="h-px w-6 bg-accent" aria-hidden />
            {text("services.text_1", "Services")}
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            {text("services.text_2", "Tout, sous le même toit")}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            {text(
              "services.intro",
              "De l’achat à la garantie, une seule équipe vous accompagne à chaque étape — sans intermédiaire.",
            )}
          </p>
          <Link to="/contact" className={buttonVariants({ size: "lg", className: "mt-7" })}>
            {text("services.cta", "Parler à un conseiller")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2">
          {services.map((service, index) => {
            const Icon = icons[service.icon as keyof typeof icons] ?? ShieldCheck;
            const wide = services.length % 2 === 1 && index === services.length - 1;
            return (
              <li
                key={index}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg",
                  wide && "sm:col-span-2 sm:flex sm:items-start sm:gap-6",
                )}
              >
                <span
                  aria-hidden
                  className="tabular absolute right-5 top-4 text-4xl font-bold text-foreground/[0.06] transition-colors group-hover:text-accent/15"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/20 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className={cn(wide ? "mt-4 sm:mt-0" : "mt-5")}>
                  <h3 className="text-lg font-semibold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{service.text}</p>
                </div>
                <span
                  aria-hidden
                  className="absolute inset-x-6 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-300 group-hover:scale-x-100"
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
