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
import {
  ConfirmDialog,
  EmptyState,
  LoadError,
  PageHeader,
  RowMenu,
  type RowAction,
  SectionCard,
  StatusChip,
  CardListSkeleton,
  TableSkeleton,
} from "./ui";

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
  const roleChange = useDialogTarget<AdminAccount>();
  const deletion = useDialogTarget<AdminAccount>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminsQuery.queryKey });

  const changeRole = useMutation({
    mutationFn: (admin: AdminAccount) =>
      setAdminRole({ data: { userId: admin.id, role: otherRole(admin.role) } }),
    onSuccess: async (_, admin) => {
      await refresh();
      toast.success(
        `${admin.email} est maintenant ${ROLE_LABELS[otherRole(admin.role)].toLowerCase()}.`,
      );
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const remove = useMutation({
    mutationFn: (admin: AdminAccount) => deleteAdmin({ data: { userId: admin.id } }),
    onSuccess: async (_, admin) => {
      await refresh();
      toast.success(`Le compte ${admin.email} a été supprimé.`);
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const list = [...(admins.data ?? [])].sort(
    (a, b) => Number(b.isSelf) - Number(a.isSelf) || a.email.localeCompare(b.email, "fr"),
  );

  const menuFor = (admin: AdminAccount): (RowAction | false)[] => [
    {
      id: "reset",
      label: "Réinitialiser le mot de passe",
      icon: KeyRound,
      onAction: () => reset.open(admin),
    },
    !admin.isSelf && {
      id: "role",
      label: admin.role === "super_admin" ? "Passer administrateur" : "Passer super administrateur",
      icon: admin.role === "super_admin" ? ShieldOff : ShieldCheck,
      onAction: () => roleChange.open(admin),
    },
    !admin.isSelf && {
      id: "delete",
      label: "Supprimer",
      icon: Trash2,
      danger: true,
      onAction: () => deletion.open(admin),
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Administrateurs"
        description="Comptes ayant accès à cette administration. Seuls les super administrateurs voient cette page."
        actions={
          <Button className="max-sm:w-full" onPress={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            Ajouter un administrateur
          </Button>
        }
      />

      {admins.isError ? (
        <LoadError
          message={errorMessage(admins.error, "Impossible de charger les administrateurs.")}
          onRetry={() => void admins.refetch()}
        />
      ) : admins.isPending ? (
        <>
          <CardListSkeleton label="Administrateurs" rows={2} />
          <div className="hidden md:block">
            <TableSkeleton
              label="Administrateurs"
              columns={COLUMNS}
              rows={3}
              minWidth="min-w-[760px]"
            />
          </div>
        </>
      ) : (
        <>
          {/* Phones: one card per account. */}
          <ul aria-label="Administrateurs" className="grid gap-3 md:hidden">
            {list.map((admin) => (
              <li
                key={admin.id}
                className="flex items-start gap-3 rounded-2xl border border-separator bg-surface p-3"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent"
                >
                  {admin.email.charAt(0)}
                </span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-foreground">{admin.email}</span>
                    {admin.isSelf && <StatusChip tone="accent">Vous</StatusChip>}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <StatusChip tone={admin.role === "super_admin" ? "warning" : "default"}>
                      {ROLE_LABELS[admin.role]}
                    </StatusChip>
                    <FactorChips admin={admin} />
                  </div>
                  <p className="text-xs text-muted">
                    Dernière connexion : {formatDate(admin.lastSignInAt) ?? "jamais"}
                  </p>
                </div>
                <RowMenu label={`Actions pour ${admin.email}`} actions={menuFor(admin)} large />
              </li>
            ))}
          </ul>
          <Table className="hidden md:block">
            <Table.ScrollContainer>
              <Table.Content aria-label="Administrateurs" className="min-w-[760px]">
                <Table.Header>
                  <Table.Column isRowHeader>Administrateur</Table.Column>
                  <Table.Column>Rôle</Table.Column>
                  <Table.Column>Double authentification</Table.Column>
                  <Table.Column>Dernière connexion</Table.Column>
                  <Table.Column className="w-16 text-end">
                    <span className="sr-only">Actions</span>
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState
                      icon={UserCog}
                      title="Aucun administrateur."
                      description="Ajoutez un compte pour donner accès à l’administration."
                    />
                  )}
                >
                  {list.map((admin) => (
                    <Table.Row key={admin.id} id={admin.id}>
                      <Table.Cell>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-foreground">
                            {admin.email}
                          </span>
                          {admin.isSelf && <StatusChip tone="accent">Vous</StatusChip>}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusChip tone={admin.role === "super_admin" ? "warning" : "default"}>
                          {ROLE_LABELS[admin.role]}
                        </StatusChip>
                      </Table.Cell>
                      <Table.Cell>
                        <FactorChips admin={admin} />
                      </Table.Cell>
                      <Table.Cell className="text-sm text-muted">
                        {formatDate(admin.lastSignInAt) ?? "Jamais"}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex justify-end">
                          <RowMenu label={`Actions pour ${admin.email}`} actions={menuFor(admin)} />
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
            ? "Retirer les droits de super administrateur ?"
            : "Donner les droits de super administrateur ?"
        }
        confirmLabel={
          roleChange.target?.role === "super_admin"
            ? "Passer administrateur"
            : "Passer super administrateur"
        }
        onConfirm={() => roleChange.target && changeRole.mutateAsync(roleChange.target)}
      >
        <p>
          {roleChange.target?.role === "super_admin"
            ? `${roleChange.target.email} ne pourra plus gérer les administrateurs.`
            : `${roleChange.target?.email ?? "Ce compte"} pourra gérer les administrateurs et devra configurer la double authentification à sa prochaine connexion.`}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={deletion.isOpen}
        onOpenChange={deletion.onOpenChange}
        title={`Supprimer ${deletion.target?.email ?? "ce compte"} ?`}
        confirmLabel="Supprimer le compte"
        onConfirm={() => deletion.target && remove.mutateAsync(deletion.target)}
      >
        <p>
          Ce compte perdra immédiatement l’accès à l’administration. Cette action est définitive.
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
          <Modal.CloseTrigger aria-label="Fermer" />
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
                Annuler
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
  const [role, setRole] = useState<Role>("admin");
  const [password, setPassword] = useState<PasswordDraft>(emptyPasswordDraft);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createAdmin({ data: { email: email.trim(), password: password.password, role } }),
    onSuccess: async () => {
      await onCreated();
      toast.success(`Compte ${email.trim()} créé.`);
      close(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function close(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setEmail("");
      setRole("admin");
      setPassword(emptyPasswordDraft);
      setSubmitted(false);
      setError(null);
    }
  }

  const emailInvalid = !EMAIL.test(email.trim());

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={close}
      pending={create.isPending}
      icon={UserPlus}
      title="Ajouter un administrateur"
      description="Le compte peut se connecter immédiatement avec ce mot de passe."
      submitLabel="Créer le compte"
      pendingLabel="Création…"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        setError(null);
        if (emailInvalid || passwordProblem(password)) return;
        create.mutate();
      }}
    >
      {error && <ErrorAlert message={error} />}
      <TextField
        name="email"
        type="email"
        autoComplete="off"
        isRequired
        value={email}
        onChange={setEmail}
        isInvalid={submitted && emailInvalid}
        fullWidth
        autoFocus
      >
        <Label>E-mail</Label>
        <Input placeholder="prenom.nom@exemple.com" />
        <FieldError>Saisissez une adresse e-mail valide.</FieldError>
      </TextField>
      <RadioGroup
        name="role"
        value={role}
        onChange={(value) => setRole(value === "super_admin" ? "super_admin" : "admin")}
      >
        <Label>Rôle</Label>
        {(["admin", "super_admin"] as const).map((value) => (
          <Radio key={value} value={value}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {ROLE_LABELS[value]}
            </Radio.Content>
            <Description>{ROLE_HELP[value]}</Description>
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
      toast.success(`Mot de passe de ${admin?.email ?? "l’administrateur"} réinitialisé.`);
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
      title="Réinitialiser le mot de passe"
      description={admin?.email ?? ""}
      submitLabel="Enregistrer le mot de passe"
      pendingLabel="Enregistrement…"
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
              ? "Vous serez déconnecté de tous vos appareils, y compris celui-ci."
              : "L’administrateur sera déconnecté de tous ses appareils."}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <NewPasswordFields
        label="Nouveau mot de passe"
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
              {FACTOR_LABELS[type as Factor["type"]] ?? type}
            </StatusChip>
          ),
        )
      ) : (
        <StatusChip tone="default">Non requise</StatusChip>
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
      toast.success("Méthode retirée.");
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  return (
    <section id="ma-securite" aria-labelledby="ma-securite-title" className="scroll-mt-24">
      <SectionCard
        title={<span id="ma-securite-title">Ma sécurité</span>}
        description="À chaque connexion, un code à 6 chiffres est envoyé à votre adresse e-mail après le mot de passe."
        {...(APP_FACTORS_ENABLED
          ? {
              actions: (
                <Button variant="secondary" onPress={() => setEnrolling(true)}>
                  <Plus className="size-4" aria-hidden />
                  Ajouter une méthode
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
                      {FACTOR_NAMES[factor.type]}
                    </p>
                    <p className="truncate text-xs text-muted">{factor.label}</p>
                  </div>
                  {factor.type === "email" ? (
                    <StatusChip tone="success">Toujours active</StatusChip>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger-soft"
                      isPending={remove.isPending && remove.variables?.id === factor.id}
                      onPress={() => removal.open(factor)}
                    >
                      Retirer
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
            title="Aucune méthode configurée."
            description="Ajoutez une application d’authentification ou un numéro de téléphone."
          />
        )}
      </SectionCard>

      <Modal.Backdrop isOpen={enrolling} onOpenChange={setEnrolling}>
        <Modal.Container placement="auto" scroll="inside">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger aria-label="Fermer" />
            <Modal.Header>
              <Modal.Icon className="bg-accent-soft text-accent">
                <ShieldCheck className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter une méthode</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {enrolling && (
                <MfaEnroll
                  onEnrolled={async () => {
                    await refreshSession();
                    toast.success("Méthode de double authentification ajoutée.");
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
        title="Retirer cette méthode ?"
        confirmLabel="Retirer"
        onConfirm={() => removal.target && remove.mutateAsync(removal.target)}
      >
        <p>
          {removal.target
            ? `${FACTOR_NAMES[removal.target.type]} (${removal.target.label}) ne permettra plus de valider vos connexions.`
            : null}
        </p>
      </ConfirmDialog>
    </section>
  );
}
