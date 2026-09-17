import { useState, type FormEvent } from "react";
import { Facebook, Instagram } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/aks-logo.png.asset.json";
import { Btn } from "./Btn";
import { Reveal } from "./Reveal";

const quickLinks = [
  { href: "#inventaire", label: "Inventaire" },
  { href: "#apropos", label: "À propos" },
  { href: "#services", label: "Services" },
  { href: "#showroom", label: "Showroom" },
];

export function ContactFooter() {
  const [sending, setSending] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Message envoyé", {
        description: "Notre équipe vous rappelle sous 24 h.",
      });
      (e.target as HTMLFormElement).reset();
    }, 700);
  };

  return (
    <>
      <section id="contact" className="relative overflow-hidden border-t border-border bg-panel">
        <div
          aria-hidden
          className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary/15 blur-[140px]"
        />
        <div className="relative mx-auto max-w-3xl px-5 py-24 lg:py-32">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Contact
              </p>
              <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Parlons de votre projet</h2>
              <p className="mt-4 text-muted-foreground">
                Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.
              </p>
            </div>

            <form onSubmit={onSubmit} className="glass-panel mt-10 space-y-5 rounded-2xl p-7 sm:p-9">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Nom
                  </label>
                  <input
                    id="name"
                    required
                    placeholder="Votre nom"
                    className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Téléphone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+216 ..."
                    className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  placeholder="Quel véhicule vous intéresse ?"
                  className="input-depth w-full resize-none rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <Btn type="submit" size="lg" className="w-full" disabled={sending}>
                {sending ? "Envoi..." : "Envoyer le message"}
              </Btn>
            </form>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src={logo.url}
                alt="Auto Kontor Sfax"
                width={44}
                height={44}
                loading="lazy"
                className="h-11 w-11 rounded-md object-cover"
              />
              <span className="font-display text-sm font-bold uppercase tracking-[0.22em]">
                Auto Kontor <span className="text-primary">Sfax</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Showroom automobile premium à Sfax. Vente, reprise, financement et importation de
              véhicules sélectionnés.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="btn-3d btn-3d-steel p-2.5"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="btn-3d btn-3d-steel p-2.5"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Navigation
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-muted-foreground hover:text-foreground">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Coordonnées
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>Route de Tunis km 4, Sfax 3000</li>
              <li>
                <a href="tel:+21674000000" className="hover:text-foreground">
                  +216 74 000 000
                </a>
              </li>
              <li>
                <a href="mailto:contact@autokontorsfax.tn" className="hover:text-foreground">
                  contact@autokontorsfax.tn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Auto Kontor Sfax. Tous droits réservés.
        </div>
      </footer>
    </>
  );
}
