import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Breadcrumbs } from "@heroui/react";
import { telHref } from "@/features/content/definition";
import { usePhones, useSiteText } from "@/lib/site-content";
import { Navbar } from "./Navbar";
import { Eyebrow, sectionTitle } from "./Section";
import { SiteFooter } from "./SiteFooter";

/** Date shown on the legal pages; update it when their text changes. */
export const LEGAL_UPDATED = "18 octobre 2026";

/** Layout of the privacy and data-deletion pages: readable column, numbered sections. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-page pb-20 pt-6">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/">Accueil</Breadcrumbs.Item>
          <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
        </Breadcrumbs>
        <article className="mx-auto mt-10 max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className={`mt-4 ${sectionTitle}`}>{title}</h1>
          <p className="mt-2 text-sm text-muted">Dernière mise à jour : {LEGAL_UPDATED}</p>
          <div className="mt-6 text-base leading-relaxed text-muted">{intro}</div>
          <div className="mt-10 grid gap-10 [counter-reset:legal]">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="[counter-increment:legal]">
      <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-foreground before:text-sm before:font-semibold before:text-accent before:content-[counter(legal,decimal-leading-zero)]">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 leading-relaxed text-muted [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

/** Company contact details, from Contenu du site. */
export function LegalContact() {
  const text = useSiteText();
  const { primary } = usePhones();
  const email = text("identity.email", "contact@autokontorsfax.com");
  return (
    <ul className="grid gap-1">
      <li>
        <strong>Auto Kontor Sfax</strong>,{" "}
        {text("showroom.text_3", "Route Sidi Mansour, km 5, Sfax 3000, Tunisie")}
      </li>
      {email && (
        <li>
          E-mail : <a href={`mailto:${email}`}>{email}</a>
        </li>
      )}
      {primary && (
        <li>
          Téléphone / WhatsApp : <a href={telHref(primary.number)}>{primary.number}</a>
        </li>
      )}
      <li>
        Formulaire : <Link to="/contact">page Contact</Link>
      </li>
    </ul>
  );
}
