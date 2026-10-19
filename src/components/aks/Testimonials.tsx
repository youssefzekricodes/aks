import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, StarFill } from "@/components/icons";
import { buttonVariants } from "@heroui/styles";
import { GoogleLogo } from "./SocialLogos";
import { useSiteCollection, useSiteText } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { Eyebrow, sectionTitle } from "./Section";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

/** Five stars filled to the value (4,8 → the fifth star 80 % filled). */
export function Stars({
  value,
  className,
  size = "size-4",
  color = "text-accent",
}: {
  value: number;
  className?: string;
  size?: string;
  color?: string;
}) {
  const label = value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return (
    <span className={cn("flex gap-0.5", className)} role="img" aria-label={`${label} sur 5`}>
      {Array.from({ length: 5 }, (_, s) => {
        const fill = Math.max(0, Math.min(1, value - s));
        return (
          <span key={s} className={cn("relative", size)} aria-hidden>
            <StarFill className={cn("absolute inset-0 text-border", size)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarFill className={cn(color, size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** "4,8" or "4.8" → 4.8; anything else → null. */
const toRating = (value: string) => {
  const n = Number(value.replace(",", ".").trim());
  return value.trim() && n > 0 && n <= 5 ? n : null;
};

/**
 * Customer reviews in a swipeable row (CSS scroll snap): one card on phones,
 * two on tablets, three on desktops, with arrows and page dots.
 */
export function Testimonials() {
  const text = useSiteText();
  const reviews = useSiteCollection("testimonials.items");
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  // Pages follow the scroll position and the number of cards that fit.
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const card = element.firstElementChild as HTMLElement | null;
      const perView = card ? Math.max(1, Math.round(element.clientWidth / card.clientWidth)) : 1;
      const total = Math.max(1, Math.ceil(reviews.length / perView));
      setPages(total);
      const max = element.scrollWidth - element.clientWidth;
      setPage(max <= 0 ? 0 : Math.round((element.scrollLeft / max) * (total - 1)));
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reviews.length]);

  // Google rating set in Contenu du site → Contact → Avis Google; otherwise the testimonials'.
  const googleRating = toRating(text("reviews.google_rating", ""));
  const googleCount = Number(text("reviews.google_count", "").replace(/\D/g, "")) || null;
  const mapsLink = text("showroom.link_1", "");
  const reviewLink = text("reviews.google_review_link", "") || mapsLink;
  if (!reviews.length && !googleRating) return null;
  const average = googleRating ?? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

  const goTo = (target: number) => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    element.scrollTo({ left: pages > 1 ? (max * target) / (pages - 1) : 0, behavior: "smooth" });
  };
  const arrow =
    "grid size-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40";

  return (
    <div id="avis" className="border-y border-separator bg-surface">
      <section
        className="container-page py-14 lg:py-20"
        aria-roledescription="carrousel"
        aria-label={text("testimonials.text_2", "Ils nous font confiance")}
      >
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <Eyebrow className="mb-4">{text("testimonials.text_1", "Témoignages")}</Eyebrow>
            <h2 className={sectionTitle}>
              {text("testimonials.text_2", "Ils nous font confiance")}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {googleRating && <GoogleLogo className="size-6" title="Google" />}
              <span className="tabular text-2xl font-semibold text-foreground">
                {average.toLocaleString("fr-FR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
              <Stars value={average} size="size-5" color="text-[#FBBC04]" />
              <span className="text-sm text-muted">
                {googleRating
                  ? googleCount
                    ? `${googleCount.toLocaleString("fr-FR")} avis Google`
                    : "Avis Google"
                  : `${reviews.length} avis`}
              </span>
            </div>
            {reviewLink && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "sm" })}
                >
                  <GoogleLogo className="size-4 rounded-full bg-white p-px" />
                  {text("reviews.cta", "Laisser un avis sur Google")}
                </a>
                {mapsLink && googleRating && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm", variant: "secondary" })}
                  >
                    {text("reviews.see_all", "Voir les avis")}
                  </a>
                )}
              </div>
            )}
          </div>
          {pages > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                className={arrow}
                aria-label={text("testimonials.text_3", "Précédent")}
                disabled={page === 0}
                onClick={() => goTo(page - 1)}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                className={arrow}
                aria-label={text("testimonials.text_4", "Suivant")}
                disabled={page >= pages - 1}
                onClick={() => goTo(page + 1)}
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>

        <ul
          ref={track}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-2"
        >
          {reviews.map((review, index) => (
            <li
              key={index}
              aria-roledescription="avis"
              aria-label={`${index + 1} sur ${reviews.length}`}
              className="flex w-[88%] shrink-0 snap-start flex-col rounded-2xl border border-border bg-background p-6 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <Stars value={review.stars} />
                <Quote className="size-7 text-accent/25" aria-hidden />
              </div>
              <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed">
                “{review.text}”
              </blockquote>
              <div className="mt-6 flex items-center gap-3 border-t border-separator pt-4">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
                >
                  {initials(review.name)}
                </span>
                <p className="min-w-0 text-sm">
                  <span className="block truncate font-semibold">{review.name}</span>
                  <span className="block truncate text-muted">{review.city}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Page ${index + 1} sur ${pages}`}
                aria-current={index === page}
                onClick={() => goTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === page ? "w-6 bg-accent" : "w-2 bg-border hover:bg-muted",
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
