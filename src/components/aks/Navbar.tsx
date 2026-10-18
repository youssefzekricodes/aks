import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Drawer } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Menu, Phone } from "lucide-react";
import { contactHref, useSiteCollection, useSiteText } from "@/lib/site-content";

export function Navbar() {
  const text = useSiteText();
  const logo = text("identity.logo", "/images/aks-logo.png");
  const links = useSiteCollection("navbar.items");
  const [open, setOpen] = useState(false);

  return (
    // Always dark (like the reference site) so the white-and-red AKS logo keeps its colours.
    <header className="dark sticky top-0 z-40 border-b border-separator bg-[oklch(0.17_0.004_286)] text-foreground">
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
          className="hidden flex-1 items-center gap-1 lg:flex"
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

        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={text("identity.phone_link", "tel:+21652144869")}
            className="hidden items-center gap-2 px-2 text-sm font-medium text-muted hover:text-foreground xl:flex"
          >
            <Phone className="size-4" />
            {text("identity.phone", "+216 52 144 869")}
          </a>
          <a
            href={contactHref(text("navbar.link_2", "/contact"))}
            className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
          >
            {text("navbar.text_3", "Nous contacter")}
          </a>
          <Drawer isOpen={open} onOpenChange={setOpen}>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label={text("navbar.text_4", "Menu")}
              className="lg:hidden"
            >
              <Menu className="size-5" />
            </Button>
            <Drawer.Backdrop>
              <Drawer.Content placement="right">
                <Drawer.Dialog className="w-[min(20rem,85vw)]">
                  <Drawer.Header>
                    <Drawer.Heading>{text("navbar.text_4", "Menu")}</Drawer.Heading>
                    <Drawer.CloseTrigger />
                  </Drawer.Header>
                  <Drawer.Body>
                    <nav aria-label="Navigation mobile" className="flex flex-col">
                      {links.map((l, index) => (
                        <a
                          key={index}
                          href={contactHref(l.href)}
                          onClick={() => setOpen(false)}
                          className="border-b border-separator py-3 text-base font-medium"
                        >
                          {l.label}
                        </a>
                      ))}
                    </nav>
                  </Drawer.Body>
                  <Drawer.Footer className="flex-col items-stretch gap-2">
                    <a
                      href={contactHref(text("navbar.link_2", "/contact"))}
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ fullWidth: true })}
                    >
                      {text("navbar.text_3", "Nous contacter")}
                    </a>
                    <a
                      href={text("identity.phone_link", "tel:+21652144869")}
                      className={buttonVariants({ variant: "secondary", fullWidth: true })}
                    >
                      <Phone className="size-4" />
                      {text("identity.phone", "+216 52 144 869")}
                    </a>
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
