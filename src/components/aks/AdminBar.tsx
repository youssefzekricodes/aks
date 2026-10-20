import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeftRight, Pencil } from "@/components/icons";
import { getSession } from "@/features/auth/auth.functions";

/*
 * Orange-yellow strip, always at the top of the public site (sticky), for a signed-in
 * administrator: "you are viewing the site as an administrator", with a way back to
 * the admin (and, on a vehicle page, straight to its editor).
 *
 * The login cookies cannot be read by page scripts (HttpOnly), so the admin leaves
 * a harmless marker on the device (`markAdminDevice`); only then does the site ask
 * the server, and the strip shows only if the server confirms the session. Visitors
 * never trigger that request.
 */
const MARKER = "aks-admin-device";
/** Strip height (px): the site header is pushed down by exactly this much. */
const BAR_HEIGHT = 40;

/** Called by the admin: this device belongs to an administrator. */
export function markAdminDevice(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(MARKER, "1");
    else localStorage.removeItem(MARKER);
  } catch {
    // Private mode without storage: no strip, nothing else changes.
  }
}

export function AdminBar() {
  const queryClient = useQueryClient();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [marked, setMarked] = useState(false);
  useEffect(() => {
    try {
      setMarked(localStorage.getItem(MARKER) === "1");
    } catch {
      // No storage: stays hidden.
    }
  }, []);
  // Same cache entry as the admin's session query.
  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => getSession(),
    enabled: marked,
    staleTime: 60_000,
  });
  // Signed out (elsewhere or expired): forget the marker.
  useEffect(() => {
    if (marked && session.isSuccess && !session.data) markAdminDevice(false);
  }, [marked, session.isSuccess, session.data]);

  const visible = marked && session.data?.mfa === "ok";
  // Height of the strip, so the sticky site header sits right below it.
  useEffect(() => {
    const root = document.documentElement;
    if (!visible) return undefined;
    root.style.setProperty("--admin-bar-h", `${BAR_HEIGHT}px`);
    return () => {
      root.style.removeProperty("--admin-bar-h");
    };
  }, [visible]);

  if (!visible || !session.data) return null;

  // On a vehicle page: open that vehicle in the editor.
  const slug = /^\/vehicule\/([^/]+)/.exec(pathname)?.[1];
  const car = slug
    ? queryClient.getQueryData<{ id: string } | null>(["public-car", slug])
    : undefined;
  const pill =
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-950/15 bg-amber-50/90 px-3 text-[13px] font-semibold text-amber-950 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-amber-950";

  return (
    <div
      role="region"
      aria-label="Mode administrateur"
      style={{ height: BAR_HEIGHT }}
      className="sticky top-0 z-50 bg-[#F5A524] text-amber-950 shadow-[inset_0_-1px_0_rgb(120_53_15/0.15)]"
    >
      <div className="container-page flex h-full items-center justify-center gap-2 text-[13px] sm:gap-3 sm:text-sm">
        <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 truncate">
          <span className="sm:hidden">Vue administrateur</span>
          <span className="hidden sm:inline">
            Vous consultez le site en tant qu’administrateur —{" "}
            <strong className="font-semibold">{session.data.name || session.data.email}</strong>
          </span>
        </p>
        {car?.id && (
          <Link to="/admin/vehicules/$carId" params={{ carId: car.id }} className={pill}>
            <Pencil className="size-3.5" aria-hidden />
            <span className="max-sm:sr-only">Modifier ce véhicule</span>
          </Link>
        )}
        <Link to="/admin" className={pill}>
          <span className="sm:hidden">Admin</span>
          <span className="hidden sm:inline">Retour à l’admin</span>
        </Link>
      </div>
    </div>
  );
}
