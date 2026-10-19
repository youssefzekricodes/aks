import { buttonVariants } from "@heroui/styles";
import { ArrowRight } from "@/components/icons";
import { contactHref, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Section";

export function SellCarBanner({ className = "" }: { className?: string }) {
  const text = useSiteText();

  return (
    <div className={cn("container-page", className)}>
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-2xl bg-[oklch(0.2_0.006_286)] px-6 py-10 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/25 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <Eyebrow className="text-[oklch(0.7_0.19_27)]">
            {text("sell.text_1", "Reprise automobile")}
          </Eyebrow>
          <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {text("sell.text_2", "Vous voulez vendre votre voiture ?")}
          </h2>
          <p className="mt-2 text-sm text-white/80">
            {text(
              "sell.text_3",
              "Recevez une estimation claire et rapide de votre véhicule par notre équipe.",
            )}
          </p>
        </div>
        <a
          href={contactHref(text("sell.destination", "/contact"))}
          className={buttonVariants({ size: "lg", className: "relative shrink-0" })}
        >
          {text("sell.text_4", "Évaluer gratuitement")}
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}
