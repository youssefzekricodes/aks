import { Star } from "lucide-react";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { Section, SectionHeader } from "./Section";

export function Testimonials() {
  const text = useSiteText();
  const reviews = useSiteCollection("testimonials.items");
  if (!reviews.length) return null;

  return (
    <div id="avis" className="border-y border-separator bg-surface">
      <Section>
        <SectionHeader
          title={text("testimonials.text_2", "Ils nous font confiance")}
          description={text("testimonials.text_1", "Témoignages")}
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <li key={i} className="flex flex-col rounded-lg border border-border bg-background p-5">
              <div className="flex gap-0.5" role="img" aria-label={`${r.stars} sur 5`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    aria-hidden
                    className={`size-4 ${s < r.stars ? "fill-accent text-accent" : "text-border"}`}
                  />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed">“{r.text}”</blockquote>
              <p className="mt-4 text-sm font-medium">
                {r.name}
                <span className="font-normal text-muted"> · {r.city}</span>
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
