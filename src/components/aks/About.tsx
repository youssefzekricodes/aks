import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

const stats = [
  { value: 2400, suffix: "+", label: "Véhicules livrés" },
  { value: 18, suffix: " ans", label: "D'expérience à Sfax" },
  { value: 25, suffix: "", label: "Marques représentées" },
  { value: 98, suffix: "%", label: "Clients satisfaits" },
];

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
  return (
    <section id="apropos" className="relative overflow-hidden border-y border-border bg-panel">
      <div
        aria-hidden
        className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-[130px]"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              À propos
            </p>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              Auto Kontor Sfax,
              <br />
              <span className="text-chrome">l'exigence automobile</span>
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                Depuis 2008, Auto Kontor Sfax accompagne les automobilistes de la région dans
                l'achat, la reprise et l'importation de véhicules haut de gamme. Notre showroom
                réunit berlines, SUV et sportives sélectionnés un par un.
              </p>
              <p>
                Transparence sur l'historique, garantie écrite, financement négocié avec nos
                partenaires bancaires : nous construisons des relations durables, pas des ventes
                rapides.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="glass-panel grid grid-cols-2 gap-px overflow-hidden rounded-2xl">
              {stats.map((s) => (
                <div key={s.label} className="bg-background/40 p-8">
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
