import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "steel";
type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs uppercase tracking-wider",
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-4 text-base",
};

export function Btn({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "btn-3d",
        variant === "primary" ? "btn-3d-primary" : "btn-3d-steel",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function BtnLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"a"> & { variant?: Variant; size?: Size }) {
  return (
    <a
      className={cn(
        "btn-3d",
        variant === "primary" ? "btn-3d-primary" : "btn-3d-steel",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
