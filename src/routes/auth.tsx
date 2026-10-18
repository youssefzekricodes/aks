import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Label, TextField, toast } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { getSession, signIn, signOut } from "@/features/auth/auth.functions";
import { MfaEnroll, MfaVerify } from "@/features/admin/mfa";
import { sessionQueryKey, type Factor } from "@/features/admin/model";
import { PasswordField } from "@/features/admin/password";
import logo from "@/assets/aks-logo.png.asset.json";

const title = "Espace administration — Auto Kontor Sfax";
const description = "Connexion à l'espace de gestion du showroom Auto Kontor Sfax.";

type Step = { kind: "password" } | { kind: "mfa"; mfa: "verify" | "enroll"; factors: Factor[] };

export const Route = createFileRoute("/auth")({
  ssr: false,
  // Already signed in: go straight to the admin, or resume at the 2FA step.
  beforeLoad: async () => {
    const session = await getSession().catch(() => null);
    if (session?.mfa === "ok") throw redirect({ to: "/admin" });
    return { pendingMfa: session ? { mfa: session.mfa, factors: session.factors } : null };
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pendingMfa } = Route.useRouteContext();
  const [step, setStep] = useState<Step>(() =>
    pendingMfa
      ? { kind: "mfa", mfa: pendingMfa.mfa, factors: pendingMfa.factors }
      : { kind: "password" },
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Announce the new step to screen readers by moving focus to its title.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step.kind]);

  async function enterAdmin() {
    toast.success("Connexion réussie");
    // Drop any session cached by a previous visit so the admin reads the new one.
    queryClient.removeQueries({ queryKey: sessionQueryKey });
    await navigate({ to: "/admin" });
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn({ data: { email, password } });
      if (result.mfa === "ok") {
        await enterAdmin();
        return;
      }
      setPassword("");
      setStep({ kind: "mfa", mfa: result.mfa, factors: result.factors });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Connexion impossible.";
      setError(message);
      toast.danger(message);
    } finally {
      setPending(false);
    }
  };

  async function leave() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      toast.danger("Déconnexion impossible. Veuillez réessayer.");
      return;
    } finally {
      setSigningOut(false);
    }
    setError(null);
    setStep({ kind: "password" });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-16 text-foreground">
      <main className="w-full max-w-sm">
        <Link
          to="/"
          aria-label="Auto Kontor Sfax — retour au site"
          // Dark plate keeps the white-and-red logo in its original colours.
          className="mx-auto flex w-fit items-center rounded-lg bg-[oklch(0.17_0.004_286)] px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <img
            src={logo.url}
            alt=""
            width={132}
            height={44}
            className="h-11 w-[132px] object-contain"
          />
        </Link>

        <section
          aria-labelledby="auth-title"
          className="mt-8 rounded-2xl border border-separator bg-surface p-6 sm:p-8"
        >
          <p className="text-xs font-medium text-muted">Auto Kontor Sfax · Administration</p>
          <h1
            id="auth-title"
            ref={heading}
            tabIndex={-1}
            className="mt-1 text-xl font-semibold text-foreground outline-none"
          >
            {step.kind === "password" ? "Connexion" : "Double authentification"}
          </h1>

          {step.kind === "password" ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Connectez-vous avec votre compte administrateur.
              </p>

              <Form onSubmit={onSubmit} className="mt-6 grid gap-4">
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}
                <TextField
                  name="email"
                  type="email"
                  autoComplete="username"
                  isRequired
                  value={email}
                  onChange={setEmail}
                  fullWidth
                >
                  <Label>E-mail</Label>
                  <Input />
                </TextField>
                <PasswordField
                  label="Mot de passe"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                />
                <Button type="submit" fullWidth isPending={pending} className="mt-2">
                  {pending ? "Connexion…" : "Se connecter"}
                </Button>
              </Form>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                {step.mfa === "verify"
                  ? "Confirmez votre identité avec votre deuxième méthode de connexion."
                  : "Configurez une deuxième méthode de connexion pour protéger votre compte."}
              </p>
              <div className="mt-6">
                {step.mfa === "verify" ? (
                  <MfaVerify factors={step.factors} onVerified={enterAdmin} />
                ) : (
                  <MfaEnroll required onEnrolled={enterAdmin} />
                )}
              </div>
              <div className="mt-6 border-t border-separator pt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  isPending={signingOut}
                  onPress={() => void leave()}
                >
                  Se déconnecter
                </Button>
              </div>
            </>
          )}
        </section>

        <Link
          to="/"
          className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-sm text-sm text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour au site
        </Link>
      </main>
    </div>
  );
}
