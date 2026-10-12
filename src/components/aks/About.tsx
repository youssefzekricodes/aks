import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1600;
      const tick = (t: number) => {
        const p = Math.min((t - start) / dur, 1);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="font-display text-4xl font-bold text-foreground sm:text-5xl">
      {n.toLocaleString("fr-FR")}
      <span className="text-primary">{suffix}</span>
    </span>
  );
}

export function About() {
  const text = useSiteText();

  const stats = useSiteCollection("about.items");

  return (
    <section id="apropos" className="relative overflow-hidden border-y border-border bg-panel">
      <div
        aria-hidden
        className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-[130px]"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {text("about.text_1", "À propos")}
            </p>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              {text("about.text_2", "Auto Kontor Sfax,")}
              <br />
              <span className="text-chrome">{text("about.text_3", "l'exigence automobile")}</span>
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
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
          </Reveal>

          <Reveal delay={120}>
            <div
              className={`glass-panel grid gap-px overflow-hidden rounded-2xl ${
                stats.length > 1 ? "grid-cols-2" : ""
              }`}
            >
              {stats.map((s, index) => (
                <div
                  key={index}
                  className={`bg-background/40 p-8 ${stats.length > 1 ? "" : "text-center"}`}
                >
                  <Counter value={s.value} suffix={s.suffix} />
                  <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
