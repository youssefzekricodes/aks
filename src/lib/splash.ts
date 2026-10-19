/*
 * Splash screen of the admin app (phones / installed app). The page shell draws it
 * (static markup) when the app starts on an admin page; whichever screen is ready
 * first (admin, or the login page) fades it out here, directly on the element, so
 * it works even though the shell itself never redraws.
 */
export const SPLASH_ID = "admin-splash";

export const SPLASH_HTML = `
<div class="flex flex-col items-center gap-5 px-8">
  <img src="/images/aks-logo.png" alt="Auto Kontor Sfax" width="168" height="56" class="h-14 w-auto animate-in fade-in-0 zoom-in-95 duration-500" />
  <p class="text-sm tracking-wide text-white/60">Administration</p>
  <span class="relative h-1 w-28 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
    <span class="splash-bar absolute inset-y-0 w-1/3 rounded-full bg-[oklch(0.62_0.2_27)]"></span>
  </span>
  <span class="sr-only">Chargement de l’administration…</span>
</div>`;

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
