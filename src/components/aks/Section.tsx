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

export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <Heading
          className={
            Heading === "h1"
              ? "text-2xl font-semibold sm:text-3xl"
              : "text-xl font-semibold sm:text-2xl"
          }
        >
          {title}
        </Heading>
        {description && <p className="mt-2 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
