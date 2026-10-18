import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { Award } from "lucide-react";
import { formatNumber } from "@/lib/cars";
import { cn } from "@/lib/utils";
import { Eyebrow, Section, sectionTitle } from "./Section";

export function About() {
  const text = useSiteText();
  const stats = useSiteCollection("about.items");

  return (
    <div id="apropos" className="border-y border-separator bg-surface">
      <Section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>{text("about.text_1", "À propos")}</Eyebrow>
          {text("about.badge", "18 ans d’expérience") && (
            <p className="mt-4 flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-accent-soft py-1.5 pl-2 pr-3.5 text-sm font-semibold text-accent">
              <span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                <Award className="size-3.5" aria-hidden />
              </span>
              {text("about.badge", "18 ans d’expérience")}
            </p>
          )}
          <h2 className={cn("mt-4", sectionTitle)}>
            {text("about.text_2", "Auto Kontor Sfax,")}{" "}
            {text("about.text_3", "l'exigence automobile")}
          </h2>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-muted">
            <p>
              {text(
                "about.textarea_1",
                "Depuis 2008, Auto Kontor Sfax accompagne les automobilistes de la région dans l'achat, la reprise et l'importation de véhicules haut de gamme. Notre showroom réunit berlines, SUV et sportives sélectionnés un par un.",
              )}
            </p>
            <p>
              {text(
                "about.textarea_2",
                "Transparence sur l'historique, garantie écrite, financement négocié avec nos partenaires bancaires : nous construisons des relations durables, pas des ventes rapides.",
              )}
            </p>
          </div>
        </div>
        {stats.length > 0 && (
          <dl
            className={`grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm ${stats.length > 1 ? "grid-cols-2" : ""}`}
          >
            {stats.map((s, index) => (
              <div
                key={index}
                className={`bg-background p-8 ${stats.length % 2 && index === stats.length - 1 ? "col-span-2" : ""}`}
              >
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="tabular mt-2 text-5xl font-semibold tracking-tight">
                  {formatNumber(s.value)}
                  <span className="text-accent">{s.suffix}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Section>
    </div>
  );
}
