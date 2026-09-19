import { useSiteCollection } from "@/lib/site-content";
import { useSiteText } from "@/lib/site-content";
import { createLead } from "@/lib/data";
import { useEffect, useState, type FormEvent } from "react";
import { Facebook, Mail } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "./Btn";
import { Reveal } from "./Reveal";

export function ContactFooter() {
  const text = useSiteText();

  const quickLinks = useSiteCollection("contact.items");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const prefillMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMessage(detail.message);
    };
    window.addEventListener("prefill-contact-message", prefillMessage);
    return () => window.removeEventListener("prefill-contact-message", prefillMessage);
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const values = new FormData(form);
    setSending(true);
    try {
      await createLead({
        name: String(values.get("name")),
        phone: String(values.get("phone")),
        message: String(values.get("message")),
      });
      toast.success(text("contact.success", "Message enregistré. Notre équipe vous contactera."));
      form.reset();
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
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
                {text("contact.text_1", "Contact")}
              </p>
              <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
                {text("contact.text_2", "Parlons de votre projet")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {text(
                  "contact.text_3",
                  "Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.",
                )}
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="glass-panel mt-10 space-y-5 rounded-2xl p-7 sm:p-9"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {text("contact.text_4", "Nom")}
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    placeholder={text("contact.text_5", "Votre nom")}
                    className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {text("contact.text_6", "Téléphone")}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder={text("contact.text_7", "+216 ...")}
                    className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {text("contact.text_8", "Message")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder={text("contact.text_9", "Quel véhicule vous intéresse ?")}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="input-depth w-full resize-none rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <Btn type="submit" size="lg" className="w-full" disabled={sending}>
                {sending
                  ? text("contact.sending", "Envoi…")
                  : text("contact.submit", "Envoyer le message")}
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
                src={text("identity.logo", "/images/aks-logo.png")}
                alt={text("contact.text_10", "Auto Kontor Sfax")}
                width={132}
                height={44}
                loading="lazy"
                className="h-11 w-[132px] object-contain"
              />
              <span className="font-display text-sm font-bold uppercase tracking-[0.22em]">
                {text("identity.brand", "Auto Kontor")}{" "}
                <span className="text-primary">{text("identity.brand_suffix", "Sfax")}</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {text(
                "contact.text_12",
                "Showroom automobile premium à Sfax. Vente, reprise, financement et importation de véhicules sélectionnés.",
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={text(
                  "contact.link_1",
                  "https://www.facebook.com/profile.php?id=61560475294948",
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={text("contact.text_13", "Facebook")}
                className="btn-3d btn-3d-steel p-2.5"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={text(
                  "contact.link_2",
                  "https://mail.google.com/mail/?view=cm&fs=1&to=autokontorsfax@gmail.com",
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={text("contact.text_14", "Gmail")}
                className="btn-3d btn-3d-steel p-2.5"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {text("contact.text_15", "Navigation")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {quickLinks.map((l, index) => (
                <li key={index}>
                  <a href={l.href} className="text-muted-foreground hover:text-foreground">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {text("contact.text_16", "Coordonnées")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>{text("contact.text_17", "Route de Tunis km 4, Sfax 3000")}</li>
              <li>
                <a
                  href={text("identity.phone_link", "tel:+21674000000")}
                  className="hover:text-foreground"
                >
                  {text("identity.phone", "+216 74 000 000")}
                </a>
              </li>
              <li>
                <a
                  href={text("identity.email_link", "mailto:contact@autokontorsfax.tn")}
                  className="hover:text-foreground"
                >
                  {text("identity.email", "contact@autokontorsfax.tn")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}{" "}
          {text("contact.text_18", "Auto Kontor Sfax. Tous droits réservés.")}
        </div>
      </footer>
    </>
  );
}
