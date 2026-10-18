import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Spinner } from "@heroui/react";
import { META_RESULT_KEY, META_STATE_KEY } from "@/features/admin/ConnectorsTab";

/**
 * Facebook sends the admin back here after "Se connecter avec Facebook". This page
 * is public on purpose: the session cookies (SameSite=Strict) are not sent on a
 * navigation coming from facebook.com, but they are on the in-app navigation that
 * follows. It only checks `state`, keeps the code for the Connecteurs section,
 * and moves on.
 */
export const Route = createFileRoute("/meta-callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Connexion Facebook…" }, { name: "robots", content: "noindex" }],
  }),
  component: MetaCallback,
});

function MetaCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expected = sessionStorage.getItem(META_STATE_KEY);
    sessionStorage.removeItem(META_STATE_KEY);
    const code = params.get("code");
    const result =
      params.get("error") || !code
        ? { error: params.get("error_description") || "Connexion Facebook annulée." }
        : !expected || params.get("state") !== expected
          ? { error: "Lien de connexion expiré ou non valide. Recommencez depuis Connecteurs." }
          : { code };
    sessionStorage.setItem(META_RESULT_KEY, JSON.stringify(result));
    // Drop the code from the address bar and history.
    void navigate({ to: "/admin/connecteurs", replace: true });
  }, [navigate]);
  return (
    <main className="grid min-h-dvh place-items-center">
      <p className="flex items-center gap-3 text-sm text-muted">
        <Spinner size="sm" aria-hidden /> Connexion à Facebook…
      </p>
    </main>
  );
}
