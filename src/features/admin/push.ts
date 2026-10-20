import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPushConfig,
  removePushSubscription,
  savePushSubscription,
} from "@/features/auth/auth.functions";
import { getLocale } from "./i18n";

/*
 * Push notifications on this device (new e-mails, new requests): the browser
 * subscribes with the site's public key, the server keeps the subscription. iPhone:
 * only from the installed app (Add to Home Screen), iOS 16.4 or later.
 */

export const pushConfigQuery = {
  queryKey: ["push-config"],
  queryFn: () => getPushConfig(),
  staleTime: Infinity,
  retry: false,
} as const;

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosBrowserTab() {
  if (typeof window === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.register("/sw.js"))
  );
}

const keyBytes = (base64url: string) => {
  const raw = atob(base64url.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Asks permission (must follow a tap), subscribes and registers this device. */
export async function enablePush(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("PERMISSION");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  const json = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  await savePushSubscription({
    data: { endpoint: json.endpoint, keys: json.keys, locale: getLocale() },
  });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscription({ data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}

/** State of the notifications on this device, and the actions. */
export function usePush() {
  const config = useQuery(pushConfigQuery);
  const supported = pushSupported();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setPermission("unsupported");
      setSubscribed(false);
      return;
    }
    setPermission(Notification.permission);
    const reg = await navigator.serviceWorker.getRegistration("/");
    setSubscribed(Boolean(await reg?.pushManager.getSubscription()));
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publicKey = config.data?.publicKey ?? null;
  return {
    /** Server side set up (VAPID keys). */
    available: Boolean(publicKey),
    supported,
    /** iPhone in Safari (not the installed app): must add to Home Screen first. */
    needsInstall: !supported && isIosBrowserTab(),
    permission,
    subscribed,
    enable: async () => {
      if (!publicKey) return;
      try {
        await enablePush(publicKey);
      } finally {
        await refresh();
      }
    },
    disable: async () => {
      try {
        await disablePush();
      } finally {
        await refresh();
      }
    },
  };
}
