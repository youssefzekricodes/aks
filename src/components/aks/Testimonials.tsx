import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Reveal } from "./Reveal";

export function Testimonials() {
  const text = useSiteText();

  const reviews = useSiteCollection("testimonials.items");

  const [i, setI] = useState(0);
  const r = reviews[i % reviews.length];
  if (!r) return null;

  return (
    <section id="avis" className="relative overflow-hidden border-y border-border bg-panel">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-[140px]"
      />
      <div className="relative mx-auto max-w-4xl px-5 py-16 text-center lg:py-20">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {text("testimonials.text_1", "Témoignages")}
          </p>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
            {text("testimonials.text_2", "Ils nous font confiance")}
          </h2>

          <div className="glass-panel mt-12 rounded-2xl p-8 sm:p-12">
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s < r.stars ? "fill-primary text-primary" : "text-muted"}`}
                />
              ))}
            </div>
            <p className="mt-6 text-lg leading-relaxed text-foreground sm:text-xl">“{r.text}”</p>
            <p className="mt-6 font-display text-sm font-bold uppercase tracking-widest">
              {r.name}
            </p>
            <p className="text-xs text-muted-foreground">{r.city}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              aria-label={text("testimonials.text_3", "Précédent")}
              onClick={() => setI((v) => (v - 1 + reviews.length) % reviews.length)}
              className="btn-3d btn-3d-steel p-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {reviews.map((_, d) => (
                <button
                  key={d}
                  aria-label={`Avis ${d + 1}`}
                  onClick={() => setI(d)}
                  className={`h-2 rounded-full transition-all ${
                    d === i % reviews.length ? "w-7 bg-primary" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              aria-label={text("testimonials.text_4", "Suivant")}
              onClick={() => setI((v) => (v + 1) % reviews.length)}
              className="btn-3d btn-3d-steel p-3"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
