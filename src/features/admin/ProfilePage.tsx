import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Skeleton,
  TextField,
  toast,
} from "@heroui/react";
import { ChevronRight, ImagePlus, Mail, ShieldCheck, UserCog } from "@/components/icons";
import { changeEmail, setName } from "@/features/auth/auth.functions";
import { AvatarDialog } from "./AvatarDialog";
import { t } from "./i18n";
import {
  ROLE_LABELS,
  displayName,
  errorMessage,
  profileQuery,
  sessionQuery,
  sessionQueryKey,
  type Session,
} from "./model";
import { fadeIn } from "./skeletons";
import { AdminAvatar, LoadError, PageHeader } from "./ui";

/*
 * "Mon profil": the signed-in admin's photo, display name and e-mail address.
 * The name and photo apply at once; a new e-mail only replaces the old one once
 * the link Supabase sends has been opened (until then it is shown as waiting).
 */

const NAME_MAX = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProfilePage({ session: initial }: { session: Session }) {
  const session = useQuery({ ...sessionQuery, initialData: initial }).data ?? initial;
  const profile = useQuery(profileQuery);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const isSuperAdmin = session.role === "super_admin";

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="max-lg:hidden">
        <PageHeader
          title={t("Mon profil")}
          description={t("Votre nom, votre adresse e-mail et votre photo.")}
        />
      </div>

      {/* Who is signed in: photo (tap to change), name, e-mail, role. */}
      <section className="admin-card flex flex-col items-center gap-3 px-5 py-6 text-center">
        <button
          type="button"
          onClick={() => setAvatarOpen(true)}
          aria-label={session.avatarUrl ? t("Changer ma photo") : t("Ajouter ma photo")}
          className="relative rounded-full outline-none focus-visible:ring-4 focus-visible:ring-focus/40 active:scale-[0.98]"
        >
          <AdminAvatar
            email={displayName(session)}
            url={session.avatarUrl}
            className="size-24 text-4xl ring-4 ring-surface shadow-[0_8px_20px_-8px_rgb(15_23_42/0.35)]"
          />
          <span className="absolute -bottom-0.5 -end-0.5 grid size-9 place-items-center rounded-full bg-accent text-accent-foreground ring-4 ring-surface">
            <ImagePlus className="size-4" aria-hidden />
          </span>
        </button>
        <div className="grid min-w-0 max-w-full gap-0.5">
          <p
            dir="auto"
            className={`truncate text-xl font-bold ${session.name ? "text-foreground" : "text-muted"}`}
          >
            {session.name || t("Nom non renseigné")}
          </p>
          <p dir="ltr" className="truncate text-sm text-muted">
            {session.email}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-muted">
          <UserCog className="size-3.5" aria-hidden />
          {t(ROLE_LABELS[session.role])}
        </span>
      </section>

      {profile.isError ? (
        <LoadError
          message={t("Impossible de charger votre profil.")}
          onRetry={() => profile.refetch()}
        />
      ) : profile.data ? (
        <div className={`grid gap-5 ${fadeIn}`}>
          <NameCard current={profile.data.name} />
          <EmailCard current={profile.data.email} pending={profile.data.pendingEmail} />
        </div>
      ) : (
        <div className="grid gap-5" aria-hidden>
          <Skeleton className="h-44 rounded-[1.25rem]" />
          <Skeleton className="h-56 rounded-[1.25rem]" />
        </div>
      )}

      {isSuperAdmin && (
        <Link
          to="/admin/administrateurs"
          hash="ma-securite"
          className="admin-card flex items-center gap-3 px-4 py-3.5 outline-none active:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="text-[15px] font-semibold text-foreground">{t("Ma sécurité")}</span>
            <span className="text-xs text-muted">
              {t("Double authentification et codes de connexion")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
        </Link>
      )}

      <AvatarDialog
        email={displayName(session)}
        url={session.avatarUrl}
        isOpen={avatarOpen}
        onOpenChange={setAvatarOpen}
      />
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card grid gap-4 p-4 sm:p-5">
      <header>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

function NameCard({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const [name, setNameDraft] = useState(current ?? "");
  const clean = name.trim().replace(/\s+/g, " ");
  const changed = clean !== (current ?? "");
  const tooLong = clean.length > NAME_MAX;
  const save = useMutation({
    mutationFn: () => setName({ data: { name: clean } }),
    onSuccess: async (result) => {
      setNameDraft(result.name ?? "");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
        queryClient.invalidateQueries({ queryKey: profileQuery.queryKey }),
      ]);
      toast.success(result.name ? t("Nom enregistré.") : t("Nom retiré."));
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Enregistrement du nom impossible."))),
  });

  return (
    <Card
      title={t("Votre nom")}
      description={t("Affiché dans l’administration et sur le bandeau orange du site.")}
    >
      <Form
        className="grid gap-3 sm:flex sm:items-start"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (changed && !tooLong) save.mutate();
        }}
      >
        <TextField
          name="name"
          autoComplete="name"
          value={name}
          onChange={setNameDraft}
          isInvalid={tooLong}
          fullWidth
          className="sm:flex-1"
        >
          <Label>{t("Nom et prénom")}</Label>
          <Input dir="auto" placeholder={t("Ex. : Youssef Zekri")} maxLength={NAME_MAX + 20} />
          <FieldError>{t("60 caractères maximum.")}</FieldError>
        </TextField>
        <Button
          type="submit"
          isDisabled={!changed || tooLong}
          isPending={save.isPending}
          className="max-sm:w-full sm:mt-6"
        >
          {save.isPending ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </Form>
    </Card>
  );
}

function EmailCard({ current, pending }: { current: string; pending: string | null }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const clean = email.trim().toLowerCase();
  const invalid = !EMAIL.test(clean) || clean.length > 254;
  const same = clean === current.toLowerCase();
  const change = useMutation({
    mutationFn: () => changeEmail({ data: { email: clean } }),
    onSuccess: async () => {
      setEmail("");
      setSubmitted(false);
      await queryClient.invalidateQueries({ queryKey: profileQuery.queryKey });
      toast.success(t("Lien de confirmation envoyé. Ouvrez-le pour terminer le changement."));
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Changement d’adresse impossible."))),
  });

  return (
    <Card
      title={t("Adresse e-mail")}
      description={t("Celle que vous utilisez pour vous connecter.")}
    >
      <p className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface-secondary px-3 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-muted">
          <Mail className="size-4" aria-hidden />
        </span>
        <span className="grid min-w-0">
          <span className="text-xs text-muted">{t("Adresse actuelle")}</span>
          <span dir="ltr" className="truncate text-start text-sm font-medium text-foreground">
            {current}
          </span>
        </span>
      </p>

      {pending && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("En attente de confirmation")}</Alert.Title>
            <Alert.Description>
              {t("Ouvrez le lien envoyé à {email} pour terminer le changement.", {
                email: pending,
              })}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Form
        className="grid gap-3 sm:flex sm:items-start"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSubmitted(true);
          if (!invalid && !same) change.mutate();
        }}
      >
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          isInvalid={submitted && (invalid || same)}
          fullWidth
          className="sm:flex-1"
        >
          <Label>{t("Nouvelle adresse")}</Label>
          <Input dir="ltr" inputMode="email" placeholder="prenom.nom@exemple.com" />
          <Description>
            {t(
              "Un lien de confirmation vous sera envoyé. Votre adresse ne change qu’après l’avoir ouvert.",
            )}
          </Description>
          <FieldError>
            {same
              ? t("C’est déjà votre adresse actuelle.")
              : t("Saisissez une adresse e-mail valide.")}
          </FieldError>
        </TextField>
        <Button
          type="submit"
          variant="secondary"
          isDisabled={!clean}
          isPending={change.isPending}
          className="max-sm:w-full sm:mt-6"
        >
          {change.isPending ? t("Envoi…") : t("Changer l’adresse")}
        </Button>
      </Form>
    </Card>
  );
}
