import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandLogosQuery } from "@/lib/queries";
import { brandInfo, brandLogoPath } from "@/features/catalog/brands";
import { cn } from "@/lib/utils";
import ratios from "@/features/catalog/brand-logo-ratios.json";

const RATIOS: Record<string, number> = ratios;
/** Widest a logo may get, relative to `size`, so long wordmarks do not dominate. */
const MAX_WIDTH = 2.2;

/**
 * Same visual area for every logo: a square logo is `size`×`size`, a wide one
 * is wider and shorter (width = size·√ratio), capped at MAX_WIDTH·size.
 */
export function logoBox(size: number, ratio: number) {
  const width = Math.min(size * Math.sqrt(ratio), size * MAX_WIDTH);
  return { width: Math.round(width), height: Math.round(width / ratio) };
}

/** Uploaded logo (admin) first, then the bundled logo, then null. */
export function useBrandLogoUrl() {
  const { data: uploaded = [] } = useQuery(brandLogosQuery);
  return (brand: string): string | null => {
    const info = brandInfo(brand);
    return uploaded.find((logo) => logo.slug === info.slug)?.url ?? brandLogoPath(info);
  };
}

/**
 * Brand logo in its original colours on a transparent background, sized by
 * `className` (height).
 * Brands without a logo get a typeset wordmark (or nothing, with `wordmark={false}`).
 */
export function BrandLogo({
  brand,
  className,
  wordmark = true,
  size,
}: {
  brand: string;
  className?: string;
  /** Show the typeset name when there is no logo; off where the name is already shown. */
  wordmark?: boolean;
  /** Equal-area sizing (px of the equivalent square); otherwise sized by `className`. */
  size?: number;
}) {
  const url = useBrandLogoUrl()(brand);
  const info = brandInfo(brand);
  // Uploaded logos are not in the ratio file: measure them once loaded.
  const [measured, setMeasured] = useState<number>();
  const ratio = (url?.startsWith("/brands/") ? RATIOS[info.slug] : measured) ?? measured ?? 1;
  const box = size ? logoBox(size, ratio) : undefined;

  if (!url && !wordmark) return null;
  if (!url)
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center text-center text-[0.7rem] font-semibold uppercase leading-tight tracking-wide",
          className,
        )}
      >
        {info.name}
      </span>
    );

  return (
    <img
      src={url}
      alt={info.name}
      loading="lazy"
      decoding="async"
      {...(box ? { width: box.width, height: box.height, style: box } : {})}
      onLoad={(event) => {
        const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
        if (w && h) setMeasured(w / h);
      }}
      className={cn(
        box ? "max-w-full object-contain" : "h-8 w-auto max-w-full object-contain",
        className,
      )}
    />
  );
}
