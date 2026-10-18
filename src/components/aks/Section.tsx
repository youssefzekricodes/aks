import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent section spacing and heading block for the public pages. */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("container-page py-14 lg:py-20", className)}>
      {children}
    </section>
  );
}

/** Small red label above section titles (line + uppercase), as in "Tout, sous le même toit". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-accent",
        className,
      )}
    >
      <span className="h-px w-6 bg-current" aria-hidden />
      {children}
    </p>
  );
}

/** Large title style shared by the home sections. */
export const sectionTitle = "text-3xl font-semibold leading-tight tracking-tight sm:text-4xl";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
        <Heading className={sectionTitle}>{title}</Heading>
        {description && (
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
