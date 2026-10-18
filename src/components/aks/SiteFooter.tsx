import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail } from "lucide-react";
import { contactHref, useSiteCollection, useSiteText } from "@/lib/site-content";

/** Facebook, Instagram and e-mail links (URLs editable under Contenu du site → Contact). */
export function SocialLinks({ className }: { className?: string }) {
  const text = useSiteText();
  const links = [
    {
      href: text("contact.link_1", "https://www.facebook.com/profile.php?id=61560475294948"),
      label: text("contact.text_13", "Facebook"),
      Icon: Facebook,
    },
    {
      href: text("contact.link_instagram", "https://www.instagram.com/auto_kontor.sfax/"),
      label: "Instagram",
      Icon: Instagram,
    },
    {
      href: text(
        "contact.link_2",
        "https://mail.google.com/mail/?view=cm&fs=1&to=autokontorsfax@gmail.com",
      ),
      label: text("contact.text_14", "Gmail"),
      Icon: Mail,
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
          className="grid size-9 place-items-center rounded-md border border-border text-muted transition-colors hover:text-foreground"
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  );
}

/** Site-wide footer (always dark, it carries the white-and-red AKS logo). */
export function SiteFooter() {
  const text = useSiteText();
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
            <li>{text("contact.text_17", "Route Sidi Mansour, km 5, Sfax 3000")}</li>
            <li>
              <a
                href={text("identity.phone_link", "tel:+21652144869")}
                className="hover:text-foreground"
              >
                {text("identity.phone", "+216 52 144 869")}
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
      <div className="border-t border-separator py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()}{" "}
        {text("contact.text_18", "Auto Kontor Sfax. Tous droits réservés.")}
      </div>
    </footer>
  );
}
