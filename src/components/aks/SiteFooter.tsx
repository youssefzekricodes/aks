import { Link } from "@tanstack/react-router";
import { FacebookLogo, GmailLogo, InstagramLogo } from "./SocialLogos";
import { contactHref, usePhones, useSiteCollection, useSiteText } from "@/lib/site-content";
import { telHref } from "@/features/content/definition";

/** Facebook, Instagram and e-mail links (URLs editable under Contenu du site → Contact). */
export function SocialLinks({ className }: { className?: string }) {
  const text = useSiteText();
  const email = text("identity.email", "contact@autokontorsfax.tn");
  const links = [
    {
      href: text("contact.link_1", "https://www.facebook.com/profile.php?id=61560475294948"),
      label: text("contact.text_13", "Facebook"),
      Icon: FacebookLogo,
    },
    {
      href: text("contact.link_instagram", "https://www.instagram.com/auto_kontor.sfax/"),
      label: "Instagram",
      Icon: InstagramLogo,
    },
    {
      href: email ? `mailto:${email}` : "",
      label: "E-mail",
      Icon: GmailLogo,
    },
  ].filter((link) => link.href);
  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="grid size-10 place-items-center rounded-full bg-white text-zinc-700 shadow-sm transition-transform hover:scale-105"
        >
          <Icon className="size-5" />
        </a>
      ))}
    </div>
  );
}

/** Site-wide footer (always dark, it carries the white-and-red AKS logo). */
export function SiteFooter() {
  const text = useSiteText();
  const { phones } = usePhones();
  const logo = text("identity.logo", "/images/aks-logo.png");
  const quickLinks = useSiteCollection("contact.items");

  return (
    <footer className="dark border-t border-separator bg-[oklch(0.17_0.004_286)] text-foreground">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" width={96} height={32} loading="lazy" className="h-8 w-auto" />
            <span className="font-semibold">
              {text("identity.brand", "Auto Kontor")}{" "}
              <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted">
            {text(
              "contact.text_12",
              "Showroom automobile premium à Sfax. Vente, reprise, financement et importation de véhicules sélectionnés.",
            )}
          </p>
          <SocialLinks className="mt-4" />
        </div>

        <nav aria-label={text("contact.text_15", "Navigation")}>
          <h3 className="text-sm font-semibold">{text("contact.text_15", "Navigation")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/recherche" className="text-muted hover:text-foreground">
                Tous les véhicules
              </Link>
            </li>
            <li>
              <Link to="/marques" className="text-muted hover:text-foreground">
                Marques
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-muted hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/voitures-occasion-sfax" className="text-muted hover:text-foreground">
                Voitures d’occasion à Sfax
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-muted hover:text-foreground">
                Questions fréquentes
              </Link>
            </li>
            {quickLinks.map((l, index) => (
              <li key={index}>
                <a href={contactHref(l.href)} className="text-muted hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-semibold">{text("contact.text_16", "Coordonnées")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>{text("showroom.text_3", "Route Sidi Mansour, km 5, Sfax 3000, Tunisie")}</li>
            {phones.map((phone) => (
              <li key={phone.number}>
                <a href={telHref(phone.number)} className="tabular hover:text-foreground">
                  {phone.number}
                </a>
                {phone.label && <span> · {phone.label}</span>}
              </li>
            ))}
            <li>
              <a
                href={`mailto:${text("identity.email", "contact@autokontorsfax.tn")}`}
                className="hover:text-foreground"
              >
                {text("identity.email", "contact@autokontorsfax.tn")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-page flex flex-col items-center justify-between gap-2 border-t border-separator py-5 text-xs text-muted sm:flex-row">
        <p>
          © {new Date().getFullYear()}{" "}
          {text("contact.text_18", "Auto Kontor Sfax. Tous droits réservés.")}
        </p>
        <nav aria-label="Informations légales" className="flex gap-4">
          <Link to="/confidentialite" className="hover:text-foreground">
            Politique de confidentialité
          </Link>
          <Link to="/suppression-des-donnees" className="hover:text-foreground">
            Suppression des données
          </Link>
        </nav>
      </div>
    </footer>
  );
}
