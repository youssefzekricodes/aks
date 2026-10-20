import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  Table,
  TextField,
  toast,
} from "@heroui/react";
import {
  KeyRound,
  UserPen,
  Mail,
  MessageSquare,
  Plus,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  UserCog,
  UserPlus,
} from "@/components/icons";
import {
  createAdmin,
  deleteAdmin,
  mfaRemove,
  resetAdminPassword,
  setAdminName,
  setAdminRole,
  type AdminAccount,
} from "@/features/auth/auth.functions";
import { useDialogTarget } from "./hooks";
import { MfaEnroll } from "./mfa";
import {
  APP_FACTORS_ENABLED,
  FACTOR_LABELS,
  ROLE_LABELS,
  adminsQuery,
  dateTimeFormat,
  displayName,
  emptyPasswordDraft,
  errorMessage,
  passwordProblem,
  sessionQueryKey,
  type Factor,
  type PasswordDraft,
  type Role,
  type Session,
} from "./model";
import { NewPasswordFields } from "./password";
import { t } from "./i18n";
import {
  ConfirmDialog,
  EmptyState,
  LoadError,
  PageHeader,
  RowMenu,
  type RowAction,
  SectionCard,
  StatusChip,
  TableSkeleton,
} from "./ui";
import { AdminCardsSkeleton, fadeIn } from "./skeletons";

const COLUMNS = ["Administrateur", "Rôle", "Double authentification", "Dernière connexion", ""];

const ROLE_HELP: Record<Role, string> = {
  admin: "Catalogue, contenu du site et demandes.",
  super_admin:
    "Tout ce que fait un administrateur, plus la gestion des administrateurs. Double authentification obligatoire.",
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormat.format(date);
};

const otherRole = (role: Role): Role => (role === "super_admin" ? "admin" : "super_admin");

export function AdminsTab({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const admins = useQuery(adminsQuery);
  const [adding, setAdding] = useState(false);
  const reset = useDialogTarget<AdminAccount>();
  const renaming = useDialogTarget<AdminAccount>();
  const roleChange = useDialogTarget<AdminAccount>();
  const deletion = useDialogTarget<AdminAccount>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminsQuery.queryKey });

  const changeRole = useMutation({
    mutationFn: (admin: AdminAccount) =>
      setAdminRole({ data: { userId: admin.id, role: otherRole(admin.role) } }),
    onSuccess: async (_, admin) => {
      await refresh();
      toast.success(
        t("{email} est maintenant {role}.", {
          email: admin.email,
          role: t(ROLE_LABELS[otherRole(admin.role)]).toLowerCase(),
        }),
      );
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const remove = useMutation({
    mutationFn: (admin: AdminAccount) => deleteAdmin({ data: { userId: admin.id } }),
    onSuccess: async (_, admin) => {
      await refresh();
      toast.success(t("Le compte {email} a été supprimé.", { email: admin.email }));
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const list = [...(admins.data ?? [])].sort(
    (a, b) => Number(b.isSelf) - Number(a.isSelf) || a.email.localeCompare(b.email, "fr"),
  );

  const menuFor = (admin: AdminAccount): (RowAction | false)[] => [
    {
      id: "name",
      label: admin.name ? t("Modifier le nom") : t("Ajouter un nom"),
      icon: UserPen,
      onAction: () => renaming.open(admin),
    },
    {
      id: "reset",
      label: t("Réinitialiser le mot de passe"),
      icon: KeyRound,
      onAction: () => reset.open(admin),
    },
    !admin.isSelf && {
      id: "role",
      label:
        admin.role === "super_admin"
          ? t("Passer administrateur")
          : t("Passer super administrateur"),
      icon: admin.role === "super_admin" ? ShieldOff : ShieldCheck,
      onAction: () => roleChange.open(admin),
    },
    !admin.isSelf && {
      id: "delete",
      label: t("Supprimer"),
      icon: Trash2,
      danger: true,
      onAction: () => deletion.open(admin),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("Administrateurs")}
        description={t(
          "Comptes ayant accès à cette administration. Seuls les super administrateurs voient cette page.",
        )}
        actions={
          <Button className="max-sm:w-full" onPress={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            {t("Ajouter un administrateur")}
          </Button>
        }
      />

      {admins.isError ? (
        <LoadError
          message={errorMessage(admins.error, t("Impossible de charger les administrateurs."))}
          onRetry={() => void admins.refetch()}
        />
      ) : admins.isPending ? (
        <>
          <AdminCardsSkeleton />
          <div className="hidden md:block">
            <TableSkeleton
              label={t("Administrateurs")}
              columns={COLUMNS.map((column) => (column ? t(column) : column))}
              rows={3}
              minWidth="min-w-[760px]"
            />
          </div>
        </>
      ) : (
        <>
          {/* Phones: one card per account. */}
          <ul aria-label={t("Administrateurs")} className={`grid gap-3 md:hidden ${fadeIn}`}>
            {list.map((admin) => (
              <li
                key={admin.id}
                className="flex items-start gap-3 rounded-2xl border border-separator bg-surface p-3"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent"
                >
                  {displayName(admin).charAt(0)}
                </span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2">
                      <span dir="auto" className="truncate font-medium text-foreground">
                        {displayName(admin)}
                      </span>
                      {admin.isSelf && <StatusChip tone="accent">{t("Vous")}</StatusChip>}
                    </p>
                    {admin.name && (
                      <p dir="ltr" className="truncate text-start text-xs text-muted">
                        {admin.email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <StatusChip tone={admin.role === "super_admin" ? "warning" : "default"}>
                      {t(ROLE_LABELS[admin.role])}
                    </StatusChip>
                    <FactorChips admin={admin} />
                  </div>
                  <p className="text-xs text-muted">
                    {t("Dernière connexion : {date}", {
                      date: formatDate(admin.lastSignInAt) ?? t("jamais"),
                    })}
                  </p>
                </div>
                <RowMenu
                  label={t("Actions pour {email}", { email: admin.email })}
                  actions={menuFor(admin)}
                  large
                />
              </li>
            ))}
          </ul>
          <Table className="hidden md:block">
            <Table.ScrollContainer>
              <Table.Content aria-label={t("Administrateurs")} className="min-w-[760px]">
                <Table.Header>
                  <Table.Column isRowHeader>{t("Administrateur")}</Table.Column>
                  <Table.Column>{t("Rôle")}</Table.Column>
                  <Table.Column>{t("Double authentification")}</Table.Column>
                  <Table.Column>{t("Dernière connexion")}</Table.Column>
                  <Table.Column className="w-16 text-end">
                    <span className="sr-only">{t("Actions")}</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState
                      icon={UserCog}
                      title={t("Aucun administrateur.")}
                      description={t("Ajoutez un compte pour donner accès à l’administration.")}
                    />
                  )}
                >
                  {list.map((admin) => (
                    <Table.Row key={admin.id} id={admin.id}>
                      <Table.Cell>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid min-w-0">
                            <span dir="auto" className="truncate font-medium text-foreground">
                              {displayName(admin)}
                            </span>
                            {admin.name && (
                              <span className="truncate text-xs text-muted">{admin.email}</span>
                            )}
                          </span>
                          {admin.isSelf && <StatusChip tone="accent">{t("Vous")}</StatusChip>}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusChip tone={admin.role === "super_admin" ? "warning" : "default"}>
                          {t(ROLE_LABELS[admin.role])}
                        </StatusChip>
                      </Table.Cell>
                      <Table.Cell>
                        <FactorChips admin={admin} />
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {formatDate(admin.lastSignInAt) ?? t("Jamais")}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end">
                          <RowMenu
                            label={t("Actions pour {email}", { email: admin.email })}
                            actions={menuFor(admin)}
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </>
      )}

      <MySecurity session={session} />

      <AddAdminModal isOpen={adding} onOpenChange={setAdding} onCreated={refresh} />

      <RenameModal
        isOpen={renaming.isOpen}
        onOpenChange={renaming.onOpenChange}
        admin={renaming.target}
        onSaved={async () => {
          await refresh();
          // Your own name is also in your session (menus, greeting).
          await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
        }}
      />

      <ResetPasswordModal
        isOpen={reset.isOpen}
        onOpenChange={reset.onOpenChange}
        admin={reset.target}
      />

      <ConfirmDialog
        isOpen={roleChange.isOpen}
        onOpenChange={roleChange.onOpenChange}
        tone="warning"
        title={
          roleChange.target?.role === "super_admin"
            ? t("Retirer les droits de super administrateur ?")
            : t("Donner les droits de super administrateur ?")
        }
        confirmLabel={
          roleChange.target?.role === "super_admin"
            ? t("Passer administrateur")
            : t("Passer super administrateur")
        }
        onConfirm={() => roleChange.target && changeRole.mutateAsync(roleChange.target)}
      >
        <p>
          {roleChange.target?.role === "super_admin"
            ? t("{email} ne pourra plus gérer les administrateurs.", {
                email: roleChange.target.email,
              })
            : t(
                "{email} pourra gérer les administrateurs et devra configurer la double authentification à sa prochaine connexion.",
                { email: roleChange.target?.email ?? t("Ce compte") },
              )}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={deletion.isOpen}
        onOpenChange={deletion.onOpenChange}
        title={t("Supprimer {email} ?", { email: deletion.target?.email ?? t("ce compte") })}
        confirmLabel={t("Supprimer le compte")}
        onConfirm={() => deletion.target && remove.mutateAsync(deletion.target)}
      >
        <p>
          {t(
            "Ce compte perdra immédiatement l’accès à l’administration. Cette action est définitive.",
          )}
        </p>
      </ConfirmDialog>
    </div>
  );
}

/* ───────── Modals ───────── */

function FormModal({
  isOpen,
  onOpenChange,
  pending,
  icon: Icon,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  pendingLabel,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pending: boolean;
  icon: typeof UserPlus;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open);
      }}
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
    >
      <Modal.Container placement="auto" scroll="inside">
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger aria-label={t("Fermer")} />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent">
              <Icon className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>{title}</Modal.Heading>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </Modal.Header>
          <Form onSubmit={onSubmit} className="contents">
            <Modal.Body className="grid gap-4">{children}</Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)}>
                {t("Annuler")}
              </Button>
              <Button type="submit" isPending={pending}>
                {pending ? pendingLabel : submitLabel}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 60;

/** Name of an admin (super admin): set, changed, or removed when left empty. */
function RenameModal({
  isOpen,
  onOpenChange,
  admin,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  admin: AdminAccount | null;
  onSaved: () => unknown;
}) {
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = name ?? admin?.name ?? "";
  const tooLong = value.trim().length > NAME_MAX;
  const save = useMutation({
    mutationFn: () => setAdminName({ data: { userId: admin!.id, name: value.trim() } }),
    onSuccess: async () => {
      await onSaved();
      toast.success(value.trim() ? t("Nom enregistré.") : t("Nom retiré."));
      close(false);
    },
    onError: (e: Error) =>
      setError(
        /inconnue/i.test(e.message)
          ? t("La fonction « admin-users » doit être redéployée sur Supabase pour gérer les noms.")
          : t(e.message),
      ),
  });

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setName(null);
      setError(null);
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={close}
      pending={save.isPending}
      icon={UserPen}
      title={admin?.name ? t("Modifier le nom") : t("Ajouter un nom")}
      description={admin?.email ?? ""}
      submitLabel={t("Enregistrer")}
      pendingLabel={t("Enregistrement…")}
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!admin || tooLong) return;
        save.mutate();
      }}
    >
      {error && <ErrorAlert message={error} />}
      <TextField
        name="name"
        autoComplete="off"
        value={value}
        onChange={setName}
        isInvalid={tooLong}
        fullWidth
        autoFocus
      >
        <Label>{t("Nom et prénom")}</Label>
        <Input dir="auto" placeholder={t("Ex. : Youssef Zekri")} />
        <Description>{t("Laissez vide pour afficher l’adresse e-mail.")}</Description>
        <FieldError>{t("60 caractères maximum.")}</FieldError>
      </TextField>
    </FormModal>
  );
}

function AddAdminModal({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: () => unknown;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [password, setPassword] = useState<PasswordDraft>(emptyPasswordDraft);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createAdmin({
        data: {
          email: email.trim(),
          password: password.password,
          role,
          ...(name.trim() ? { name: name.trim() } : {}),
        },
      }),
    onSuccess: async () => {
      await onCreated();
      toast.success(t("Compte {email} créé.", { email: email.trim() }));
      close(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setEmail("");
      setName("");
      setRole("admin");
      setPassword(emptyPasswordDraft);
      setSubmitted(false);
      setError(null);
    }
  }

  const emailInvalid = !EMAIL.test(email.trim());
  const nameTooLong = name.trim().length > NAME_MAX;

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={close}
      pending={create.isPending}
      icon={UserPlus}
      title={t("Ajouter un administrateur")}
      description={t("Le compte peut se connecter immédiatement avec ce mot de passe.")}
      submitLabel={t("Créer le compte")}
      pendingLabel={t("Création…")}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        setError(null);
        if (emailInvalid || nameTooLong || passwordProblem(password)) return;
        create.mutate();
      }}
    >
      {error && <ErrorAlert message={error} />}
      <TextField
        name="name"
        autoComplete="off"
        value={name}
        onChange={setName}
        isInvalid={nameTooLong}
        fullWidth
        autoFocus
      >
        <Label>{t("Nom et prénom")}</Label>
        <Input dir="auto" placeholder={t("Ex. : Youssef Zekri")} />
        <Description>{t("Facultatif. Affiché à la place de l’adresse e-mail.")}</Description>
        <FieldError>{t("60 caractères maximum.")}</FieldError>
      </TextField>
      <TextField
        name="email"
        type="email"
        autoComplete="off"
        isRequired
        value={email}
        onChange={setEmail}
        isInvalid={submitted && emailInvalid}
        fullWidth
      >
        <Label>{t("E-mail")}</Label>
        <Input dir="ltr" placeholder="prenom.nom@exemple.com" />
        <FieldError>{t("Saisissez une adresse e-mail valide.")}</FieldError>
      </TextField>
      <RadioGroup
        name="role"
        value={role}
        onChange={(value) => setRole(value === "super_admin" ? "super_admin" : "admin")}
      >
        <Label>{t("Rôle")}</Label>
        {(["admin", "super_admin"] as const).map((value) => (
          <Radio key={value} value={value}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(ROLE_LABELS[value])}
            </Radio.Content>
            <Description>{t(ROLE_HELP[value])}</Description>
          </Radio>
        ))}
      </RadioGroup>
      <NewPasswordFields value={password} onChange={setPassword} showErrors={submitted} />
    </FormModal>
  );
}

function ResetPasswordModal({
  isOpen,
  onOpenChange,
  admin,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  admin: AdminAccount | null;
}) {
  const [password, setPassword] = useState<PasswordDraft>(emptyPasswordDraft);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (userId: string) =>
      resetAdminPassword({ data: { userId, password: password.password } }),
    onSuccess: async () => {
      toast.success(
        t("Mot de passe de {email} réinitialisé.", {
          email: admin?.email ?? t("l’administrateur"),
        }),
      );
      close(false);
      // Your own sessions were revoked: the admin shell sends you back to the login.
      if (admin?.isSelf) await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
    onError: (e: Error) => setError(e.message),
  });

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setPassword(emptyPasswordDraft);
      setSubmitted(false);
      setError(null);
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={close}
      pending={save.isPending}
      icon={KeyRound}
      title={t("Réinitialiser le mot de passe")}
      description={admin?.email ?? ""}
      submitLabel={t("Enregistrer le mot de passe")}
      pendingLabel={t("Enregistrement…")}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        setError(null);
        if (!admin || passwordProblem(password)) return;
        save.mutate(admin.id);
      }}
    >
      {error && <ErrorAlert message={error} />}
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            {admin?.isSelf
              ? t("Vous serez déconnecté de tous vos appareils, y compris celui-ci.")
              : t("L’administrateur sera déconnecté de tous ses appareils.")}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <NewPasswordFields
        label={t("Nouveau mot de passe")}
        value={password}
        onChange={setPassword}
        showErrors={submitted}
      />
    </FormModal>
  );
}

/* ───────── Ma sécurité ───────── */

const FACTOR_ICONS = { email: Mail, totp: Smartphone, phone: MessageSquare } as const;
const FACTOR_NAMES = {
  email: "Code par e-mail",
  totp: "Application d’authentification",
  phone: "SMS",
} as const;

/** The signed-in super admin's own second factors. */
/** Two-step confirmation methods of an account. */
function FactorChips({ admin }: { admin: AdminAccount }) {
  return (
    <div className="flex flex-wrap gap-1">
      {admin.role === "super_admin" || admin.mfa.length ? (
        // Super admins always confirm by e-mail code, plus any app/SMS factor.
        [...new Set([...(admin.role === "super_admin" ? ["email"] : []), ...admin.mfa])].map(
          (type) => (
            <StatusChip key={type} tone="success">
              {t(FACTOR_LABELS[type as Factor["type"]] ?? type)}
            </StatusChip>
          ),
        )
      ) : (
        <StatusChip tone="default">{t("Non requise")}</StatusChip>
      )}
    </div>
  );
}

export function MySecurity({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const removal = useDialogTarget<Factor>();
  const factors = session.factors;

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });

  const remove = useMutation({
    mutationFn: (factor: Factor) => mfaRemove({ data: { factorId: factor.id } }),
    onSuccess: async () => {
      await refreshSession();
      toast.success(t("Méthode retirée."));
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  return (
    <section id="ma-securite" aria-labelledby="ma-securite-title" className="scroll-mt-24">
      <SectionCard
        title={<span id="ma-securite-title">{t("Ma sécurité")}</span>}
        description={t(
          "À chaque connexion, un code à 6 chiffres est envoyé à votre adresse e-mail après le mot de passe.",
        )}
        {...(APP_FACTORS_ENABLED
          ? {
              actions: (
                <Button variant="secondary" onPress={() => setEnrolling(true)}>
                  <Plus className="size-4" aria-hidden />
                  {t("Ajouter une méthode")}
                </Button>
              ),
            }
          : {})}
      >
        {factors.length ? (
          <ul className="grid divide-y divide-separator rounded-xl border border-separator">
            {factors.map((factor) => {
              const Icon = FACTOR_ICONS[factor.type];
              return (
                <li key={factor.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t(FACTOR_NAMES[factor.type])}
                    </p>
                    <p className="truncate text-xs text-muted">{factor.label}</p>
                  </div>
                  {factor.type === "email" ? (
                    <StatusChip tone="success">{t("Toujours active")}</StatusChip>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger-soft"
                      isPending={remove.isPending && remove.variables?.id === factor.id}
                      onPress={() => removal.open(factor)}
                    >
                      {t("Retirer")}
                      <span className="sr-only"> {factor.label}</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title={t("Aucune méthode configurée.")}
            description={t("Ajoutez une application d’authentification ou un numéro de téléphone.")}
          />
        )}
      </SectionCard>

      <Modal.Backdrop isOpen={enrolling} onOpenChange={setEnrolling}>
        <Modal.Container placement="auto" scroll="inside">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger aria-label={t("Fermer")} />
            <Modal.Header>
              <Modal.Icon className="bg-accent-soft text-accent">
                <ShieldCheck className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>{t("Ajouter une méthode")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {enrolling && (
                <MfaEnroll
                  onEnrolled={async () => {
                    await refreshSession();
                    toast.success(t("Méthode de double authentification ajoutée."));
                    setEnrolling(false);
                  }}
                />
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <ConfirmDialog
        isOpen={removal.isOpen}
        onOpenChange={removal.onOpenChange}
        title={t("Retirer cette méthode ?")}
        confirmLabel={t("Retirer")}
        onConfirm={() => removal.target && remove.mutateAsync(removal.target)}
      >
        <p>
          {removal.target
            ? t("{method} ({label}) ne permettra plus de valider vos connexions.", {
                method: t(FACTOR_NAMES[removal.target.type]),
                label: removal.target.label,
              })
            : null}
        </p>
      </ConfirmDialog>
    </section>
  );
}
