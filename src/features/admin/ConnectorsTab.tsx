import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Modal, Spinner, toast } from "@heroui/react";
import { ArrowRight, Check, LogOut, RefreshCw } from "@/components/icons";
import { FacebookLogo, InstagramLogo } from "@/components/aks/SocialLogos";
import { connectSocial, disconnectSocial, selectSocialPage } from "@/lib/data";
import { socialStatusQuery } from "./SocialCard";
import { ConfirmDialog, PageHeader, StatusChip } from "./ui";

/** sessionStorage keys shared with the /meta-callback page. */
export const META_STATE_KEY = "aks:meta-state";
export const META_RESULT_KEY = "aks:meta-result";

const GRAPH_VERSION = "v23.0";
/** Asked at login when no "Facebook Login for Business" configuration is set. */
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
];

type MetaPage = {
  id: string;
  name: string;
  picture: string | null;
  instagram: { id: string; username: string | null; picture: string | null } | null;
};

const redirectUri = () => `${window.location.origin}/meta-callback`;

/** Sends the admin to Facebook to log in and grant access to the Page. */
function startLogin(appId: string, loginConfigId: string | null | undefined) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(META_STATE_KEY, state);
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (loginConfigId) url.searchParams.set("config_id", loginConfigId);
  else url.searchParams.set("scope", SCOPES.join(","));
  window.location.assign(url.toString());
}

/**
 * Facebook Page + Instagram professional account used to post vehicles.
 * The tokens stay in Supabase (social-publish Edge Function); this page only
 * sees names and pictures.
 */
export function ConnectorsTab() {
  const queryClient = useQueryClient();
  const status = useQuery(socialStatusQuery);
  const [pages, setPages] = useState<MetaPage[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const handled = useRef(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: socialStatusQuery.queryKey });

  const select = useMutation({
    mutationFn: (pageId: string) => selectSocialPage({ data: { pageId } }),
    onSuccess: async (result) => {
      setPages(null);
      await refresh();
      const ig = (result as { instagram?: { username?: string | null } | null }).instagram;
      toast.success(
        ig
          ? `Facebook et Instagram${ig.username ? ` (@${ig.username})` : ""} connectés.`
          : "Page Facebook connectée. Aucun compte Instagram professionnel n’est lié à cette Page.",
      );
    },
    onError: (e: Error) => setProblem(e.message),
  });

  const connect = useMutation({
    mutationFn: (code: string) => connectSocial({ data: { code, redirectUri: redirectUri() } }),
    onSuccess: ({ pages: found }) => {
      // A single Page: no need to ask.
      if (found.length === 1) select.mutate(found[0]!.id);
      else setPages(found);
    },
    onError: (e: Error) => setProblem(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectSocial(),
    onSuccess: async () => {
      await refresh();
      toast.success("Facebook et Instagram déconnectés.");
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  // Back from Facebook (see /meta-callback): finish the connection once.
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const raw = sessionStorage.getItem(META_RESULT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(META_RESULT_KEY);
    const result = JSON.parse(raw) as { code?: string; error?: string };
    if (result.code) connect.mutate(result.code);
    else if (result.error) setProblem(result.error);
  }, [connect]);

  const data = status.data;
  const working = connect.isPending || select.isPending;
  const appId = data?.appId?.trim() ?? "";
  // A Meta app ID is a number of about 15–16 digits (Paramètres de l’app → Général).
  const appIdValid = /^\d{12,20}$/.test(appId);
  const login = () => appIdValid && startLogin(appId, data?.loginConfigId?.trim() || null);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Connecteurs"
        description="Reliez la Page Facebook et le compte Instagram du showroom : chaque véhicule publié peut alors y être partagé automatiquement, avec ses photos."
      />

      {problem && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Connexion impossible</Alert.Title>
            <Alert.Description>{problem}</Alert.Description>
          </Alert.Content>
          <Button size="sm" variant="ghost" onPress={() => setProblem(null)}>
            Fermer
          </Button>
        </Alert>
      )}
      {working && (
        <Alert status="accent">
          <Alert.Indicator>
            <Spinner size="sm" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Connexion à Facebook en cours…</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      {data?.app && !appIdValid && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>ID d’app Meta incorrect</Alert.Title>
            <Alert.Description>
              Le secret META_APP_ID configuré dans Supabase (« {appId || "vide"} ») n’est pas un ID
              d’app Meta. Copiez l’« ID de l’app » (un nombre d’environ 16 chiffres) depuis
              developers.facebook.com → votre app → Paramètres de l’app → Général, puis remplacez le
              secret dans Supabase → Edge Functions → Secrets.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {data?.error && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Service de publication indisponible</Alert.Title>
            <Alert.Description>
              La publication sur Facebook et Instagram n’est pas encore installée sur ce site.
              Contactez la personne qui gère le site.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ConnectorCard
          logo={<FacebookLogo className="size-10" />}
          name="Facebook"
          subtitle="Page Facebook du showroom"
          loading={status.isPending}
          connected={
            data?.facebook && <Account picture={data.facebook.picture} name={data.facebook.name} />
          }
        >
          {data?.facebook ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                isDisabled={!data.app || !appIdValid || working}
                onPress={login}
              >
                <RefreshCw className="size-4" aria-hidden />
                Changer de Page
              </Button>
              <Button variant="danger-soft" onPress={() => setDisconnecting(true)}>
                <LogOut className="size-4" aria-hidden />
                Déconnecter
              </Button>
            </div>
          ) : (
            <FacebookButton isDisabled={!data?.app || !appIdValid || working} onPress={login} />
          )}
          {!status.isPending && !data?.app && (
            <p className="text-sm text-muted">
              Le connecteur Meta n’est pas encore configuré pour ce site : contactez la personne qui
              gère le site.
            </p>
          )}
        </ConnectorCard>

        <ConnectorCard
          logo={<InstagramLogo className="size-10" />}
          name="Instagram"
          subtitle="Compte professionnel lié à la Page"
          loading={status.isPending}
          connected={
            data?.instagram && (
              <Account
                picture={data.instagram.picture}
                name={data.instagram.username ? `@${data.instagram.username}` : "Compte Instagram"}
              />
            )
          }
        >
          {data?.instagram ? (
            <p className="text-sm text-muted">
              Connecté avec la Page Facebook. Pour en changer, changez de Page ou liez un autre
              compte à la Page, puis reconnectez.
            </p>
          ) : data?.facebook ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted">
                Aucun compte Instagram professionnel n’est lié à la Page « {data.facebook.name} ».
                Liez-le depuis la Page (Paramètres → Comptes liés → Instagram), puis reconnectez.
              </p>
              <div>
                <Button
                  variant="secondary"
                  isDisabled={!data.app || !appIdValid || working}
                  onPress={login}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Reconnecter
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Se connecte automatiquement avec la Page Facebook, si un compte Instagram
              professionnel y est lié.
            </p>
          )}
        </ConnectorCard>
      </div>

      {appId && (
        <p className="text-sm text-muted">
          App Meta utilisée : <span className="tabular font-medium text-foreground">{appId}</span>.
          Elle doit être identique à l’« ID de l’app » affiché sur developers.facebook.com
          (Paramètres de l’app → Général).
        </p>
      )}

      <Modal.Backdrop isOpen={pages !== null} onOpenChange={(open) => !open && setPages(null)}>
        <Modal.Container placement="auto" scroll="inside">
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger aria-label="Fermer" />
            <Modal.Header>
              <Modal.Heading>Choisissez la Page du showroom</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                Les véhicules seront publiés sur cette Page et sur son compte Instagram.
              </p>
            </Modal.Header>
            <Modal.Body>
              <ul className="grid gap-2">
                {(pages ?? []).map((page) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      disabled={select.isPending}
                      onClick={() => select.mutate(page.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-separator p-3 text-start transition-colors hover:border-accent hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60"
                    >
                      <Avatar picture={page.picture} name={page.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{page.name}</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <InstagramLogo className="size-3.5" />
                          {page.instagram
                            ? `@${page.instagram.username ?? "compte lié"}`
                            : "Pas de compte Instagram lié"}
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <ConfirmDialog
        isOpen={disconnecting}
        onOpenChange={setDisconnecting}
        title="Déconnecter Facebook et Instagram ?"
        confirmLabel="Déconnecter"
        onConfirm={() => disconnect.mutateAsync()}
      >
        <p>Les véhicules ne seront plus partagés. Les publications déjà faites restent en ligne.</p>
      </ConfirmDialog>
    </div>
  );
}

function ConnectorCard({
  logo,
  name,
  subtitle,
  loading,
  connected,
  children,
}: {
  logo: ReactNode;
  name: string;
  subtitle: string;
  loading: boolean;
  connected: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid content-start gap-5 rounded-2xl border border-separator bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl border border-separator bg-background">
            {logo}
          </span>
          <div>
            <h2 className="text-base font-semibold">{name}</h2>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {loading ? (
          <Spinner size="sm" aria-label="Vérification" />
        ) : (
          <StatusChip tone={connected ? "success" : "default"}>
            {connected ? "Connecté" : "Non connecté"}
          </StatusChip>
        )}
      </div>
      {connected}
      {children}
    </section>
  );
}

function Avatar({ picture, name }: { picture: string | null; name: string }) {
  return picture ? (
    <img src={picture} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-secondary text-sm font-semibold">
      {name.replace(/^@/, "").charAt(0).toUpperCase()}
    </span>
  );
}

function Account({ picture, name }: { picture: string | null; name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background p-3">
      <Avatar picture={picture} name={name} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <Check className="size-4 text-success" aria-hidden />
    </div>
  );
}

/** Facebook's own button style: blue, white "f". */
function FacebookButton({ isDisabled, onPress }: { isDisabled: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onPress}
      className="inline-flex h-11 items-center justify-center gap-2.5 rounded-full bg-[#0866FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0756d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866FF] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FacebookLogo className="size-5" color="#fff" />
      Se connecter avec Facebook
    </button>
  );
}
