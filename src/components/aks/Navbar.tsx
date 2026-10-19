import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { buttonVariants } from "@heroui/styles";
import { ArrowUpRight, Clock, Menu, MessageCircle, Phone, X } from "lucide-react";
import { contactHref, usePhones, useSiteCollection, useSiteText } from "@/lib/site-content";
import { telHref, whatsappHref } from "@/features/content/definition";
import { GlobalSearch } from "./GlobalSearch";

export function Navbar() {
  const text = useSiteText();
  const logo = text("identity.logo", "/images/aks-logo.png");
  const links = useSiteCollection("navbar.items");
  const { primary, whatsapp } = usePhones();
  const hours = useSiteCollection("showroom.items");
  const openingHours = hours[0] ? `${hours[0].day} · ${hours[0].time}` : null;
  const [open, setOpen] = useState(false);

  return (
    // Always dark (like the reference site) so the white-and-red AKS logo keeps its colours.
    <header className="vt-header dark sticky top-0 z-40 border-b border-separator bg-[oklch(0.17_0.004_286)] text-foreground">
      <div className="container-page flex h-16 items-center gap-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img src={logo} alt="" width={96} height={32} className="h-8 w-auto" />
          <span className="truncate text-[0.95rem] font-semibold tracking-tight">
            {text("identity.brand", "Auto Kontor")}{" "}
            <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden min-w-0 items-center gap-0.5 lg:flex"
        >
          {links.map((l, index) => (
            <a
              key={index}
              href={contactHref(l.href)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GlobalSearch />
          {/* Number in full on very wide screens, a phone button otherwise; never wraps. */}
          <a
            href={telHref(primary?.number ?? "")}
            aria-label={`Appeler le ${primary?.number ?? ""}`}
            title={primary?.number}
            className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-full px-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-foreground lg:flex"
          >
            <Phone className="size-4 shrink-0" aria-hidden />
            <span className="hidden 2xl:inline">{primary?.number}</span>
          </a>
          <a
            href={contactHref(text("navbar.link_2", "/contact"))}
            className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            {text("navbar.text_3", "Nous contacter")}
          </a>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label={text("navbar.text_4", "Menu")}
            aria-expanded={open}
            className="lg:hidden"
            onPress={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <ModalOverlay
            isOpen={open}
            onOpenChange={setOpen}
            isDismissable
            className="dark fixed inset-0 z-50 bg-[oklch(0.17_0.004_286/0.82)] text-foreground backdrop-blur-xl transition-opacity duration-200 data-[entering]:opacity-0 data-[exiting]:opacity-0 lg:hidden"
          >
            <Modal className="h-full data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:duration-200 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:duration-150 motion-reduce:animate-none data-[entering]:slide-in-from-top-2">
              <Dialog
                aria-label={text("navbar.text_4", "Menu")}
                className="container-page flex h-dvh flex-col outline-none"
              >
                <div className="flex h-16 shrink-0 items-center justify-between gap-4">
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <img src={logo} alt="" width={96} height={32} className="h-8 w-auto" />
                    <span className="truncate text-[0.95rem] font-semibold tracking-tight">
                      {text("identity.brand", "Auto Kontor")}{" "}
                      <span className="text-accent">{text("identity.brand_suffix", "Sfax")}</span>
                    </span>
                  </Link>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label="Fermer le menu"
                    onPress={() => setOpen(false)}
                  >
                    <X className="size-5" />
                  </Button>
                </div>

                <nav aria-label="Navigation mobile" className="mt-6 flex-1 overflow-y-auto">
                  <ul className="grid">
                    {links.map((l, index) => (
                      <li key={index}>
                        <a
                          href={contactHref(l.href)}
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold tracking-tight text-white/90 transition-colors hover:text-white"
                        >
                          {l.label}
                          <ArrowUpRight
                            className="size-5 text-white/30 transition-colors group-hover:text-accent"
                            aria-hidden
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="grid shrink-0 gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
                  <a
                    href={contactHref(text("navbar.link_2", "/contact"))}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ size: "lg", fullWidth: true })}
                  >
                    {text("navbar.text_3", "Nous contacter")}
                  </a>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={telHref(primary?.number ?? "")}
                      className={buttonVariants({ variant: "secondary", fullWidth: true })}
                    >
                      <Phone className="size-4" />
                      Appeler
                    </a>
                    {whatsapp && (
                      <a
                        href={whatsappHref(whatsapp.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "secondary", fullWidth: true })}
                      >
                        <MessageCircle className="size-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                  {openingHours && (
                    <p className="flex items-center justify-center gap-2 pt-1 text-sm text-white/60">
                      <Clock className="size-4" aria-hidden />
                      {openingHours}
                    </p>
                  )}
                </div>
              </Dialog>
            </Modal>
          </ModalOverlay>
        </div>
      </div>
    </header>
  );
}
