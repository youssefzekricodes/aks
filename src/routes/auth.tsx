import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { signIn } from "@/features/auth/auth.functions";
import { Btn } from "@/components/aks/Btn";
import logo from "@/assets/aks-logo.png.asset.json";

const title = "Espace administration — Auto Kontor Sfax";
const description = "Connexion à l'espace de gestion du showroom Auto Kontor Sfax.";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pending, setPending] = useState(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await signIn({ data: { email, password } });
      toast.success("Connexion réussie");
      await navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto flex w-fit items-center gap-3">
          <img
            src={logo.url}
            alt="Auto Kontor Sfax"
            width={132}
            height={44}
            className="h-11 w-[132px] object-contain"
          />
          <span className="font-display text-sm font-bold uppercase tracking-[0.22em]">
            Auto Kontor <span className="text-primary">Sfax</span>
          </span>
        </Link>

        <div className="glass-panel mt-8 rounded-2xl p-7 sm:p-9">
          <h1 className="text-2xl font-bold">Espace administration</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connectez-vous avec votre compte administrateur.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground"
              />
            </div>
            <Btn disabled={pending} type="submit" size="lg" className="w-full">
              Se connecter
            </Btn>
          </form>
        </div>
      </div>
    </div>
  );
}
