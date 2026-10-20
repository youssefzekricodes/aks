import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Bell, BellOff, X } from "@/components/icons";
import { sendTestPush } from "@/features/auth/auth.functions";
import { t } from "./i18n";
import { errorMessage } from "./model";
import { usePush } from "./push";

/*
 * Notifications of this device (new e-mails, new requests): an invitation on the
 * home screen until they are switched on (or put off for a week), and their
 * settings in "Mon profil".
 */

const SNOOZE_KEY = "aks-push-later";
const SNOOZE_DAYS = 7;

function failure(error: unknown) {
  if (error instanceof Error && error.message === "PERMISSION")
    toast.danger(
      t("Notifications refusées : autorisez-les dans les réglages du téléphone ou du navigateur."),
    );
  else toast.danger(t(errorMessage(error, "Activation impossible.")));
}

/** Home screen: "Activez les notifications" (hidden once on, refused or put off). */
export function NotificationPrompt() {
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    const until = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    return until > Date.now();
  });
  if (hidden || !push.available || push.subscribed !== false) return null;
  if (push.permission === "denied") return null;
  if (!push.supported && !push.needsInstall) return null;

  const later = () => {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5));
    setHidden(true);
  };
  return (
    <section className="admin-card relative flex items-start gap-3 p-4 animate-in fade-in-0 duration-300">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
        <Bell className="size-5" aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 gap-2">
        <div>
          <h2 className="pe-6 text-[15px] font-semibold text-foreground">
            {t("Activez les notifications")}
          </h2>
          <p className="text-sm leading-snug text-muted">
            {push.needsInstall
              ? t(
                  "Sur iPhone : touchez Partager puis « Sur l’écran d’accueil », ouvrez AKS Admin depuis l’écran d’accueil, puis activez-les ici.",
                )
              : t("Soyez prévenu dès qu’un client écrit ou qu’un e-mail arrive.")}
          </p>
        </div>
        {!push.needsInstall && (
          <div className="flex gap-2">
            <Button
              size="sm"
              isPending={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await push.enable();
                  toast.success(t("Notifications activées sur cet appareil."));
                } catch (error) {
                  failure(error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Activer")}
            </Button>
            <Button size="sm" variant="ghost" onPress={later}>
              {t("Plus tard")}
            </Button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={later}
        aria-label={t("Fermer")}
        className="absolute end-2 top-2 grid size-8 place-items-center rounded-full text-muted outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X className="size-4" aria-hidden />
      </button>
    </section>
  );
}

/** "Mon profil": notifications of this device, on/off, and a test. */
export function NotificationSettings() {
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const on = push.subscribed === true && push.permission === "granted";

  let status: string;
  if (!push.available)
    status = t("Les notifications ne sont pas encore configurées sur le serveur.");
  else if (push.needsInstall)
    status = t("Sur iPhone, ouvrez d’abord AKS Admin depuis l’écran d’accueil.");
  else if (!push.supported) status = t("Ce navigateur ne permet pas les notifications.");
  else if (push.permission === "denied")
    status = t("Bloquées : autorisez-les dans les réglages du téléphone ou du navigateur.");
  else if (on) status = t("Activées sur cet appareil : nouveaux e-mails et nouvelles demandes.");
  else status = t("Désactivées sur cet appareil.");

  return (
    <section className="admin-card grid gap-4 p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${on ? "bg-emerald-500" : "bg-slate-400"}`}
        >
          {on ? (
            <Bell className="size-5" aria-hidden />
          ) : (
            <BellOff className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{t("Notifications")}</h2>
          <p className="mt-0.5 text-sm text-muted">{status}</p>
        </div>
      </header>
      {push.available && push.supported && push.permission !== "denied" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={on ? "secondary" : "primary"}
            isPending={busy}
            className="max-sm:flex-1"
            onPress={async () => {
              setBusy(true);
              try {
                if (on) {
                  await push.disable();
                  toast.success(t("Notifications désactivées sur cet appareil."));
                } else {
                  await push.enable();
                  toast.success(t("Notifications activées sur cet appareil."));
                }
              } catch (error) {
                failure(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            {on ? t("Désactiver") : t("Activer les notifications")}
          </Button>
          {on && (
            <Button
              variant="ghost"
              isPending={testing}
              onPress={async () => {
                setTesting(true);
                try {
                  const result = await sendTestPush();
                  if (!result.sent) toast.danger(t("Aucun appareil n’a reçu la notification."));
                } catch (error) {
                  toast.danger(t(errorMessage(error, "Envoi impossible.")));
                } finally {
                  setTesting(false);
                }
              }}
            >
              {t("Envoyer un test")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
