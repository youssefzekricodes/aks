/*
 * Splash screen of the admin app (phones / installed app). The page shell draws it
 * (static markup) when the app starts on an admin page, or when the public site is
 * opened from the admin ("Voir le site"); whichever screen is ready first fades it
 * out here, directly on the element, so it works even though the shell itself
 * never redraws.
 */
export const SPLASH_ID = "admin-splash";

/** Address of the public site when opened from the admin: it starts with the splash. */
export const SITE_FROM_ADMIN = "/?depuis=admin";
/** Search parameter marking that visit (removed from the address once shown). */
export const FROM_ADMIN_PARAM = "depuis";

const splashHtml = (label: string, loading: string) => `
<div class="flex flex-col items-center gap-5 px-8">
  <img src="/images/aks-logo.png" alt="Auto Kontor Sfax" width="168" height="56" class="h-14 w-auto animate-in fade-in-0 zoom-in-95 duration-500" />
  <p class="text-sm tracking-wide text-white/60">${label}</p>
  <span class="relative h-1 w-28 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
    <span class="splash-bar absolute inset-y-0 w-1/3 rounded-full bg-[oklch(0.62_0.2_27)]"></span>
  </span>
  <span class="sr-only">${loading}</span>
</div>`;

export const SPLASH_HTML = splashHtml("Administration", "Chargement de l’administration…");
/** Same screen, when switching from the admin to the public site. */
export const SITE_SPLASH_HTML = splashHtml("Ouverture du site…", "Chargement du site…");

export function hideSplash() {
  const el = document.getElementById(SPLASH_ID);
  if (!el || el.dataset["leaving"]) return;
  el.dataset["leaving"] = "true";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  window.setTimeout(() => {
    el.style.display = "none";
  }, 320);
}
