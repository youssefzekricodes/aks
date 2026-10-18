import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | undefined;
function loadTurnstile() {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    tag.async = true;
    tag.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error()));
    tag.onerror = () => {
      script = undefined;
      reject(new Error("Turnstile indisponible"));
    };
    document.head.append(tag);
  });
  return script;
}

/** Cloudflare Turnstile widget; change `resetKey` to get a fresh token after a submission. */
export function Turnstile({
  siteKey,
  onToken,
  resetKey = 0,
}: {
  siteKey: string;
  onToken: (token: string | undefined) => void;
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return;
        id = api.render(ref.current, {
          sitekey: siteKey,
          language: "fr",
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(undefined),
          "error-callback": () => callback.current(undefined),
        });
      })
      .catch(() => callback.current(undefined));
    return () => {
      cancelled = true;
      callback.current(undefined);
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, resetKey]);

  return <div ref={ref} className="min-h-[65px]" />;
}
