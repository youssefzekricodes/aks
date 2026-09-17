/**
 * Frontend-only "authentication".
 * Any e-mail and any password are accepted; the session is just a flag in
 * localStorage. There is no backend and no real security here.
 */
const KEY = "aks-admin-session";

export function signIn(email: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() }));
  }
}

export function signOut() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
}

export function getSession(): { email: string } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as { email: string }) : null;
  } catch {
    return null;
  }
}

export function isSignedIn() {
  return getSession() !== null;
}
