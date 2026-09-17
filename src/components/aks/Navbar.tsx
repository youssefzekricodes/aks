import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/aks-logo.png.asset.json";
import { BtnLink } from "./Btn";

const links = [
  { href: "#inventaire", label: "Inventaire" },
  { href: "#apropos", label: "À propos" },
  { href: "#services", label: "Services" },
  { href: "#avis", label: "Avis" },
  { href: "#showroom", label: "Showroom" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 lg:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          <img
            src={logo.url}
            alt="Auto Kontor Sfax"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-md object-cover"
          />
          <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-[0.22em] text-foreground">
            Auto Kontor <span className="text-primary">Sfax</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <BtnLink href="#contact" size="sm">
            Nous contacter
          </BtnLink>
        </nav>

        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="btn-3d btn-3d-steel p-2.5 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background/98 px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <BtnLink href="#contact" size="sm" className="mt-3" onClick={() => setOpen(false)}>
              Nous contacter
            </BtnLink>
          </nav>
        </div>
      )}
    </header>
  );
}
