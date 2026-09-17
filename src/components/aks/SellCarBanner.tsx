import { ArrowRight, Car } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SellCarBanner({ className = "" }: { className?: string }) {
  return (
    <section className={`mx-auto w-full max-w-7xl px-5 lg:px-8 ${className}`}>
      <div className="sell-banner relative flex min-h-44 flex-col items-start justify-between gap-8 overflow-hidden rounded-lg border border-border bg-background px-7 py-8 sm:flex-row sm:items-center sm:px-10 lg:min-h-52 lg:px-14">
        <div className="sell-banner-pattern" aria-hidden="true" />
        <div className="sell-banner-sweep" aria-hidden="true" />
        <div className="sell-banner-cut" aria-hidden="true" />
        <div className="relative z-10 max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <Car className="h-4 w-4" />
            Reprise automobile
          </p>
          <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
            Vous voulez vendre votre voiture ?
          </h2>
          <p className="mt-3 text-sm font-semibold text-foreground sm:text-base">
            Recevez une estimation claire et rapide de votre véhicule par notre équipe.
          </p>
        </div>
        <Link
          to="/"
          hash="contact"
          className="btn-3d btn-3d-primary relative z-10 shrink-0 px-7 py-4 text-sm uppercase"
        >
          Évaluer gratuitement
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
