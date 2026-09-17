import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Reveal } from "./Reveal";

const reviews = [
  {
    name: "Mohamed Trabelsi",
    city: "Sfax",
    stars: 5,
    text: "Achat d'un SUV en toute confiance. Historique clair, essai sans pression et livraison en une semaine. Une équipe vraiment professionnelle.",
  },
  {
    name: "Ines Charfi",
    city: "Sakiet Ezzit",
    stars: 5,
    text: "Ils ont repris mon ancienne voiture à un prix juste et monté le dossier de financement à ma place. Rien à redire.",
  },
  {
    name: "Karim Bouzid",
    city: "Sfax",
    stars: 5,
    text: "Commande d'un modèle importé avec les options exactes que je voulais. Suivi impeccable du début à la fin.",
  },
  {
    name: "Sarra Mahfoudh",
    city: "Mahdia",
    stars: 4,
    text: "Showroom impressionnant et conseils honnêtes. J'ai été orientée vers un modèle moins cher que prévu, et c'était le bon choix.",
  },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const r = reviews[i]!;

  return (
    <section id="avis" className="relative overflow-hidden border-y border-border bg-panel">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-[140px]"
      />
      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center lg:py-32">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Témoignages
          </p>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Ils nous font confiance</h2>

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
              aria-label="Précédent"
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
                    d === i ? "w-7 bg-primary" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              aria-label="Suivant"
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
