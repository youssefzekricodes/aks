import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { publicConfigQuery } from "@/lib/queries";
import { whatsappHref } from "@/features/content/definition";
import { usePhones } from "@/lib/site-content";
import { WhatsAppLogo } from "./SocialLogos";

/**
 * Round WhatsApp button fixed in the bottom-right corner of every public page.
 * On a vehicle page the message is pre-filled with the vehicle's link. Hidden in
 * the admin and on the sign-in page, and when no WhatsApp number is set.
 */
export function WhatsAppButton() {
  const { whatsapp } = usePhones();
  // Same address on the server and in the browser (loaded by the root route).
  const origin = useQuery(publicConfigQuery).data?.origin ?? "";
  const pathname = useLocation({ select: (location) => location.pathname });
  if (!whatsapp || pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  const onCar = pathname.startsWith("/vehicule/");
  const message = onCar
    ? `Bonjour, je suis intéressé(e) par ce véhicule : ${origin}${pathname}`
    : "Bonjour, j’ai une question.";
  const href = `${whatsappHref(whatsapp.number)}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Écrivez-nous sur WhatsApp (nouvel onglet)"
      className="group fixed outline-none bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-5 z-40 flex items-center gap-2 animate-in fade-in-0 zoom-in-90 duration-500"
    >
      {/* Desktop: a label slides out on hover. */}
      <span className="pointer-events-none hidden translate-x-2 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:block">
        Une question ? Écrivez-nous
      </span>
      <span className="relative grid size-14 place-items-center rounded-full bg-[#25D366] shadow-lg shadow-black/20 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-[#25D366]/40">
        {/* Soft pulse to draw the eye, off for reduced motion. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 motion-safe:animate-ping [animation-duration:2.5s]"
        />
        <WhatsAppLogo color="#fff" className="relative size-8" />
      </span>
    </a>
  );
}
