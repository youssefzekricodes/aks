import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Spinner, toast } from "@heroui/react";
import { Bell, BellOff, X } from "@/components/icons";
import { getNotificationHealth, sendTestPush } from "@/features/auth/auth.functions";
import { formatNumber, t } from "./i18n";
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
      <HealthCheck />
    </section>
  );
}

/** One line of the check: ok / to fix, and what to do. */
function Check({ ok, title, detail }: { ok: boolean | null; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${
          ok === null ? "bg-slate-400" : ok ? "bg-emerald-500" : "bg-danger"
        }`}
        aria-hidden
      >
        {ok === null ? "–" : ok ? "✓" : "!"}
      </span>
      <span className="grid min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="break-words text-xs text-muted">{detail}</span>
      </span>
    </li>
  );
}

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));

/** "Vérifier": what notifications depend on, each with what to do when it is not right. */
function HealthCheck() {
  const [open, setOpen] = useState(false);
  const health = useQuery({
    queryKey: ["notification-health"],
    queryFn: () => getNotificationHealth(),
    enabled: open,
    staleTime: 0,
    retry: false,
  });
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="justify-self-start text-sm font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
      >
        {t("Vérifier la configuration")}
      </button>
    );
  if (health.isPending)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner size="sm" /> {t("Vérification…")}
      </p>
    );
  if (health.isError)
    return (
      <p className="text-sm text-danger">
        {t(errorMessage(health.error, "Vérification impossible."))}
      </p>
    );
  const { push, mailbox, watch } = health.data;
  const ago = watch ? minutesAgo(watch.at) : null;
  const watchSkip = watch?.result?.["skipped"];
  return (
    <div className="grid gap-3 rounded-2xl bg-surface-secondary p-4">
      <ul className="grid gap-3">
        <Check
          ok={push.configured}
          title={t("Clés de notification sur le serveur")}
          detail={
            push.configured
              ? t("Présentes.")
              : t(
                  "Manquantes : ajoutez VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans Netlify (npm run push:keys), puis redéployez.",
                )
          }
        />
        <Check
          ok={push.storage === "netlify"}
          title={t("Mémoire partagée des appareils")}
          detail={
            push.storage === "netlify"
              ? t("Netlify Blobs : actif.")
              : t("Mémoire locale (développement) : en ligne, Netlify Blobs doit être utilisé.")
          }
        />
        <Check
          ok={push.myDevices > 0}
          title={t("Vos appareils inscrits")}
          detail={t("{mine} à vous, {all} au total. Touchez « Activer » sur chaque téléphone.", {
            mine: formatNumber(push.myDevices),
            all: formatNumber(push.devices),
          })}
        />
        <Check
          ok={mailbox.configured ? (mailbox.ok ?? false) : false}
          title={t("Boîte mail")}
          detail={
            !mailbox.configured
              ? t("Non configurée : MAILBOX_USER et MAILBOX_PASSWORD manquent dans Netlify.")
              : mailbox.ok
                ? t("Connectée : {count} non lus.", { count: formatNumber(mailbox.unread ?? 0) })
                : t(mailbox.error ?? "Erreur inconnue.")
          }
        />
        <Check
          ok={watch ? !watch.error && !watchSkip && (ago ?? 99) <= 5 : false}
          title={t("Vérification automatique des e-mails (chaque minute)")}
          detail={
            !watch
              ? t(
                  "Jamais exécutée : elle tourne seulement sur le site en ligne, après un déploiement.",
                )
              : watch.error
                ? t("Erreur il y a {min} min : {error}", {
                    min: formatNumber(ago ?? 0),
                    error: watch.error,
                  })
                : watchSkip === "push"
                  ? t("En pause : les clés de notification manquent.")
                  : watchSkip === "mailbox"
                    ? t("En pause : la boîte mail n’est pas configurée.")
                    : (ago ?? 0) > 5
                      ? t("Dernier passage il y a {min} min : elle semble arrêtée.", {
                          min: formatNumber(ago ?? 0),
                        })
                      : t("Dernier passage il y a {min} min.", { min: formatNumber(ago ?? 0) })
          }
        />
      </ul>
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        isPending={health.isFetching}
        onPress={() => void health.refetch()}
      >
        {t("Vérifier à nouveau")}
      </Button>
    </div>
  );
}
