import { buttonVariants } from "@heroui/styles";
import { ArrowRight } from "lucide-react";
import { contactHref, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export function SellCarBanner({ className = "" }: { className?: string }) {
  const text = useSiteText();

  return (
    <div className={cn("container-page", className)}>
      <div className="flex flex-col gap-5 rounded-xl bg-[oklch(0.2_0.006_286)] px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-white/70">
            {text("sell.text_1", "Reprise automobile")}
          </p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
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
          className={buttonVariants({ size: "lg", className: "shrink-0" })}
        >
          {text("sell.text_4", "Évaluer gratuitement")}
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}
