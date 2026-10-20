import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Avatar,
  Button,
  Form,
  Input,
  Label,
  Modal,
  ScrollShadow,
  SearchField,
  Skeleton,
  Spinner,
  TextArea,
  TextField,
  Tooltip,
  toast,
} from "@heroui/react";
import {
  AlertCircle,
  ArrowDownToLine,
  ChevronDown,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  RefreshCw,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "@/components/icons";
import {
  deleteMail,
  downloadAttachment,
  markNotJunk,
  sendMail,
  setMailSeen,
} from "@/features/mailbox/mailbox.functions";
import {
  mailListQuery,
  mailMessageQuery,
  mailStatusQuery,
  type FolderKey,
} from "@/features/mailbox/queries";
import type { Address, MessageDetail, MessageSummary } from "@/server/mailbox";
import { formatDate, formatNumber, t } from "./i18n";
import { errorMessage, normalize, sessionQuery } from "./model";
import { fadeIn } from "./skeletons";
import { BottomSheet, ConfirmDialog, EmptyState, LoadError, useIsPhone } from "./ui";

/*
 * "Messagerie": the shop's mailbox inside the admin, laid out like a mail app.
 * Computer: folders, list (with search and preview lines) and the open message
 * side by side, a reply box under the message. Phone: the list, then the message
 * full screen with a large "Répondre" button that opens a reply sheet: write,
 * send, done (address, subject and the quoted message are filled in).
 * The e-mail's own layout is shown in a frame where nothing can run.
 */

type Summary = {
  messages: MessageSummary[];
  total: number;
  page: number;
  pageCount: number;
  folders: FolderKey[];
};

/** Address parameters of /admin/messagerie (checked by the route). */
type MailSearch = { dossier?: FolderKey; message?: number; ecrire?: string; objet?: string };

const FOLDER_INFO: Record<FolderKey, { label: string; icon: LucideIcon }> = {
  inbox: { label: "Réception", icon: Inbox },
  sent: { label: "Envoyés", icon: Send },
  junk: { label: "Indésirables", icon: AlertCircle },
  trash: { label: "Corbeille", icon: Trash2 },
};
const ALL_FOLDERS: FolderKey[] = ["inbox", "sent", "junk", "trash"];

/** Total size of attachments (server limit, see MAX_UPLOAD_BYTES). */
const MAX_UPLOAD = 4 * 1024 * 1024;
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Sender colours (HeroUI avatar colours), the same for a sender everywhere. */
const AVATAR_COLORS = ["accent", "success", "warning", "danger", "default"] as const;
function avatarColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

const nameOf = (a: Address | null | undefined) => a?.name?.trim() || a?.address || "";
const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** "14:32" today, "Hier", "12 oct." this year, "12/10/2025" before. */
function shortDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return formatDate(date, { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("Hier");
  if (date.getFullYear() === now.getFullYear())
    return formatDate(date, { day: "numeric", month: "short" });
  return formatDate(date, { day: "2-digit", month: "2-digit", year: "numeric" });
}

const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} ${t("Ko")}`
    : `${formatNumber(bytes / 1024 / 1024, { maximumFractionDigits: 1 })} ${t("Mo")}`;

/** Address of a folder and message (no empty keys in the address bar). */
function mailSearch(folder: FolderKey | undefined, message: number | undefined) {
  return {
    ...(folder && folder !== "inbox" ? { dossier: folder } : {}),
    ...(message ? { message } : {}),
  };
}

/** Personal mail providers: no company logo to show for them. */
const PERSONAL_DOMAINS =
  /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|gmx|proton|protonmail|pm|yandex|mail|zoho|laposte|orange|free|sfr|wanadoo|topnet|planet|gnet|hexabyte)\./i;
const hashes = new Map<string, Promise<string>>();
function sha256(value: string) {
  let hash = hashes.get(value);
  if (!hash) {
    hash = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(value))
      .then((buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""));
    hashes.set(value, hash);
  }
  return hash;
}
/** Pictures that failed once are not asked for again (this session). */
const missingPictures = new Set<string>();

/**
 * Pictures to try for a sender: their profile photo (Gravatar, shared by many
 * e-mail apps), then their company's logo (not for Gmail, Yahoo…). Initials when
 * neither exists.
 */
function useSenderPictures(address: string) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const email = address.trim().toLowerCase();
    if (!email.includes("@") || typeof crypto === "undefined" || !crypto.subtle) return;
    const domain = email.split("@")[1] ?? "";
    let alive = true;
    void sha256(email).then((hash) => {
      if (!alive) return;
      const list = [`https://gravatar.com/avatar/${hash}?s=96&d=404`];
      if (domain && !PERSONAL_DOMAINS.test(domain) && !/mailer-daemon|postmaster/.test(email))
        list.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`);
      setUrls(list.filter((url) => !missingPictures.has(url)));
    });
    return () => {
      alive = false;
    };
  }, [address]);
  return urls;
}

function SenderAvatar({
  address,
  name,
  size,
}: {
  address: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const urls = useSenderPictures(address);
  const [failed, setFailed] = useState(0);
  const src = urls[failed];
  return (
    <Avatar size={size ?? "md"} variant="soft" className="shrink-0">
      {src && (
        <Avatar.Image
          key={src}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="bg-white object-contain"
          onLoadingStatusChange={(status) => {
            if (status !== "error") return;
            missingPictures.add(src);
            setFailed((n) => n + 1);
          }}
        />
      )}
      <Avatar.Fallback color={avatarColor(address || name)}>{initials(name)}</Avatar.Fallback>
    </Avatar>
  );
}

/* ───────── Page ───────── */

export function MailboxPage() {
  const search = useSearch({ strict: false }) as MailSearch;
  const navigate = useNavigate();
  const phone = useIsPhone();
  const folder: FolderKey = search.dossier ?? "inbox";
  const status = useQuery(mailStatusQuery);
  const session = useQuery(sessionQuery);
  const [compose, setCompose] = useState<Draft | null>(null);

  // Opened from a request ("Répondre par e-mail"): the editor starts filled in.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !search.ecrire) return;
    prefilled.current = true;
    setCompose({ ...emptyDraft, to: search.ecrire, subject: search.objet ?? "" });
    void navigate({
      to: "/admin/messagerie",
      search: mailSearch(search.dossier, search.message),
      replace: true,
    });
  }, [search.ecrire, search.objet, search.dossier, search.message, navigate]);

  const openFolder = (next: FolderKey) =>
    void navigate({ to: "/admin/messagerie", search: mailSearch(next, undefined) });
  const openMessage = (uid: number | undefined) => {
    // Phones: the message (or the list) opens at the top of the screen.
    if (phone) window.scrollTo({ top: 0 });
    void navigate({ to: "/admin/messagerie", search: mailSearch(search.dossier, uid) });
  };

  // A failed background refresh keeps what is already on screen.
  if (!status.data && !status.isError)
    return (
      <div className="grid gap-4" aria-busy>
        <Skeleton className="h-12 w-full rounded-full" />
        <ListSkeleton />
      </div>
    );
  if (!status.data)
    return (
      <LoadError
        message={t(errorMessage(status.error, "Boîte mail injoignable."))}
        onRetry={() => void status.refetch()}
      />
    );
  if (!status.data.configured)
    return <NotConfigured superAdmin={session.data?.role === "super_admin"} />;

  const open = search.message;
  const composer = <Composer draft={compose} onClose={() => setCompose(null)} sheet={phone} />;

  if (phone)
    return (
      <div className="grid grid-cols-1 gap-3">
        {open ? (
          <MessageView
            key={`${folder}:${open}`}
            folder={folder}
            uid={open}
            layout="page"
            onClose={() => openMessage(undefined)}
          />
        ) : (
          <>
            <FolderChips folder={folder} unread={status.data.unread} onChange={openFolder} />
            <MessageList folder={folder} selected={undefined} onOpen={openMessage} />
            {!compose && (
              <Button
                aria-label={t("Écrire un e-mail")}
                onPress={() => setCompose(emptyDraft)}
                className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-30 h-14 rounded-full px-5 text-base shadow-lg"
              >
                <Pencil className="size-5" aria-hidden />
                {t("Écrire")}
              </Button>
            )}
          </>
        )}
        {composer}
      </div>
    );

  // Computer: one mail-app frame filling the screen, three panes.
  return (
    <>
      <div className="admin-card grid h-[calc(100dvh-8.5rem)] min-h-[34rem] grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)] overflow-hidden p-0 xl:grid-cols-[11.5rem_minmax(18rem,20rem)_minmax(0,1fr)] 2xl:grid-cols-[13rem_minmax(20rem,24rem)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col gap-1 border-e border-separator bg-surface-secondary/40 p-3 xl:flex">
          <Button className="mb-3 w-full" onPress={() => setCompose(emptyDraft)}>
            <Pencil className="size-4" aria-hidden />
            {t("Écrire un e-mail")}
          </Button>
          <FolderNav folder={folder} unread={status.data.unread} onChange={openFolder} />
          <p
            dir="ltr"
            className="mt-auto truncate px-2 pt-3 text-xs text-muted"
            title={status.data.address}
          >
            {status.data.address}
          </p>
        </aside>
        <section className="flex min-h-0 flex-col border-e border-separator">
          <MessageList
            folder={folder}
            selected={open}
            onOpen={openMessage}
            pane
            // Narrower screens: folders and "Écrire" sit at the top of the list.
            compactNav={
              <div className="grid gap-2 xl:hidden">
                <Button size="sm" className="w-full" onPress={() => setCompose(emptyDraft)}>
                  <Pencil className="size-4" aria-hidden />
                  {t("Écrire un e-mail")}
                </Button>
                <FolderChips
                  folder={folder}
                  unread={status.data.unread}
                  onChange={openFolder}
                  small
                />
              </div>
            }
          />
        </section>
        <section className="flex min-h-0 flex-col">
          {open ? (
            <MessageView
              key={`${folder}:${open}`}
              folder={folder}
              uid={open}
              layout="pane"
              onClose={() => openMessage(undefined)}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div className="grid justify-items-center gap-3 text-muted">
                <span className="grid size-16 place-items-center rounded-full bg-surface-secondary">
                  <MailOpen className="size-7" aria-hidden />
                </span>
                <p className="text-sm">{t("Choisissez un message pour le lire.")}</p>
              </div>
            </div>
          )}
        </section>
      </div>
      {composer}
    </>
  );
}

/* ───────── Not configured ───────── */

function NotConfigured({ superAdmin }: { superAdmin: boolean }) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <section className="admin-card grid gap-4 p-5 sm:p-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-indigo-500 text-white">
          <Mail className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("La messagerie n’est pas encore reliée à votre boîte mail")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {superAdmin
              ? t(
                  "Ajoutez ces réglages dans Netlify (Site configuration → Environment variables), puis redéployez le site :",
                )
              : t("Demandez au super administrateur de la configurer.")}
          </p>
        </div>
        {superAdmin && (
          <dl
            dir="ltr"
            className="grid gap-2 rounded-2xl bg-surface-secondary p-4 font-mono text-sm"
          >
            <div>
              <dt className="font-semibold text-foreground">MAILBOX_USER</dt>
              <dd className="text-muted">contact@autokontorsfax.com</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">MAILBOX_PASSWORD</dt>
              <dd className="text-muted">{t("le mot de passe de la boîte (secret)")}</dd>
            </div>
          </dl>
        )}
        {superAdmin && (
          <p className="flex gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
            {t(
              "Le mot de passe reste sur le serveur : il n’est jamais envoyé au navigateur. Serveur utilisé par défaut : mail.spacemail.com.",
            )}
          </p>
        )}
      </section>
    </div>
  );
}

/* ───────── Folders ───────── */

/** Folders this mailbox has (from the list answer; all four until it arrives). */
function useFolders(folder: FolderKey) {
  const list = useInfiniteQuery(mailListQuery(folder));
  return list.data?.pages[0]?.folders ?? ALL_FOLDERS;
}

function FolderNav({
  folder,
  unread,
  onChange,
}: {
  folder: FolderKey;
  unread: number;
  onChange: (folder: FolderKey) => void;
}) {
  const available = useFolders(folder);
  return (
    <nav aria-label={t("Dossiers")} className="grid gap-0.5">
      {ALL_FOLDERS.filter((key) => available.includes(key)).map((key) => {
        const { label, icon: Icon } = FOLDER_INFO[key];
        const active = key === folder;
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(key)}
            className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
              active
                ? "bg-surface font-semibold text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.08)]"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-accent" : ""}`} aria-hidden />
            <span className="flex-1 text-start">{t(label)}</span>
            {key === "inbox" && unread > 0 && (
              <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-bold leading-5 text-accent-foreground tabular-nums">
                {formatNumber(unread)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function FolderChips({
  folder,
  unread,
  onChange,
  small = false,
}: {
  folder: FolderKey;
  unread: number;
  onChange: (folder: FolderKey) => void;
  small?: boolean;
}) {
  const available = useFolders(folder);
  return (
    <div
      role="tablist"
      aria-label={t("Dossiers")}
      data-no-pull
      className={`flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] ${small ? "" : "-mx-4 px-4 sm:mx-0 sm:px-0"}`}
    >
      {ALL_FOLDERS.filter((key) => available.includes(key)).map((key) => {
        const { label, icon: Icon } = FOLDER_INFO[key];
        const active = key === folder;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`flex shrink-0 items-center gap-2 rounded-full font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
              small ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
            } ${
              active
                ? "bg-foreground text-background"
                : small
                  ? "bg-surface-secondary text-foreground hover:bg-[color-mix(in_oklab,var(--surface-secondary)_80%,var(--foreground)_6%)]"
                  : "bg-surface text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.06)] active:bg-surface-secondary"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {t(label)}
            {key === "inbox" && unread > 0 && (
              <span
                className={`min-w-5 rounded-full px-1.5 text-center text-xs font-bold leading-5 tabular-nums ${
                  active ? "bg-background text-foreground" : "bg-accent text-accent-foreground"
                }`}
              >
                {formatNumber(unread)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── List ───────── */

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-1 p-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 px-2 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageList({
  folder,
  selected,
  onOpen,
  pane = false,
  compactNav,
}: {
  folder: FolderKey;
  selected: number | undefined;
  onOpen: (uid: number) => void;
  /** Computer: a scrolling column with its own header. */
  pane?: boolean;
  /** Shown at the top of the column (folders when there is no folder column). */
  compactNav?: ReactNode;
}) {
  const list = useInfiniteQuery(mailListQuery(folder));
  const [query, setQuery] = useState("");
  const all = useMemo(() => list.data?.pages.flatMap((page) => page.messages) ?? [], [list.data]);
  const messages = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return all;
    return all.filter((m) => {
      const haystack = normalize(
        `${nameOf(m.from)} ${m.from?.address ?? ""} ${m.to.map(nameOf).join(" ")} ${m.subject} ${m.preview}`,
      );
      return words.every((w) => haystack.includes(w));
    });
  }, [all, query]);

  const searchField = (
    <SearchField value={query} onChange={setQuery} aria-label={t("Rechercher un e-mail")} fullWidth>
      <SearchField.Group
        className={
          pane
            ? "h-10 rounded-full bg-surface-secondary px-1"
            : "h-12 rounded-full bg-surface px-1 shadow-[0_1px_2px_rgb(15_23_42/0.04)]"
        }
      >
        <SearchField.SearchIcon />
        <SearchField.Input placeholder={t("Rechercher : nom, objet…")} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );

  let body: ReactNode;
  if (list.isPending) body = <ListSkeleton rows={pane ? 8 : 6} />;
  else if (list.isError)
    body = (
      <div className="p-3">
        <LoadError
          message={t(errorMessage(list.error, "Impossible de charger les e-mails."))}
          onRetry={() => void list.refetch()}
        />
      </div>
    );
  else if (!messages.length)
    body = (
      <EmptyState
        icon={query ? Mail : FOLDER_INFO[folder].icon}
        title={
          query
            ? t("Aucun e-mail ne correspond.")
            : folder === "inbox"
              ? t("Aucun e-mail reçu.")
              : t("Ce dossier est vide.")
        }
        description={
          !query && folder === "inbox" ? t("Les nouveaux messages apparaîtront ici.") : undefined
        }
      />
    );
  else
    body = (
      <>
        <ul
          className={`grid grid-cols-1 ${pane ? "gap-0.5 p-2" : "gap-0.5 p-1.5"} ${fadeIn}`}
          aria-label={t("E-mails")}
        >
          {messages.map((message) => (
            <li key={message.uid} className="min-w-0">
              <MessageRow
                message={message}
                folder={folder}
                selected={message.uid === selected}
                onOpen={() => onOpen(message.uid)}
              />
            </li>
          ))}
        </ul>
        {list.hasNextPage && !query && (
          <div className="grid justify-items-center p-3">
            <Button
              variant="secondary"
              size="sm"
              isPending={list.isFetchingNextPage}
              onPress={() => void list.fetchNextPage()}
            >
              {t("Afficher les messages plus anciens")}
            </Button>
          </div>
        )}
      </>
    );

  if (!pane)
    return (
      <div className="grid grid-cols-1 gap-3">
        {searchField}
        <div className="admin-card min-w-0 overflow-hidden">{body}</div>
      </div>
    );

  const total = list.data?.pages[0]?.total;
  return (
    <>
      <header className="grid gap-3 border-b border-separator p-3">
        {compactNav}
        <div className="flex items-center gap-2 px-1">
          <h1 className="flex-1 text-base font-semibold text-foreground">
            {t(FOLDER_INFO[folder].label)}
          </h1>
          {total !== undefined && (
            <span className="text-xs text-muted tabular-nums">
              {plural(total, "message", "messages")}
            </span>
          )}
          <RefreshButton folder={folder} />
        </div>
        {searchField}
      </header>
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" size={40}>
        {body}
      </ScrollShadow>
    </>
  );
}

function plural(count: number, one: string, many: string) {
  return `${formatNumber(count)} ${t(count > 1 ? many : one)}`;
}

function RefreshButton({ folder }: { folder: FolderKey }) {
  const queryClient = useQueryClient();
  const list = useInfiniteQuery(mailListQuery(folder));
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("Actualiser")}
          onPress={() =>
            void Promise.all([
              list.refetch(),
              queryClient.invalidateQueries({ queryKey: mailStatusQuery.queryKey }),
            ])
          }
        >
          <RefreshCw className={`size-4 ${list.isFetching ? "animate-spin" : ""}`} aria-hidden />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{t("Actualiser")}</Tooltip.Content>
    </Tooltip>
  );
}

function MessageRow({
  message,
  folder,
  selected,
  onOpen,
}: {
  message: MessageSummary;
  folder: FolderKey;
  selected: boolean;
  onOpen: () => void;
}) {
  // In "Envoyés", the person written to; elsewhere, the sender.
  const person = folder === "sent" ? message.to[0] : message.from;
  const who =
    folder === "sent"
      ? message.to.map((a) => nameOf(a)).join(", ") || t("(Sans destinataire)")
      : nameOf(message.from) || t("(Expéditeur inconnu)");
  const unread = !message.seen && folder !== "sent";
  const queryClient = useQueryClient();
  // The message starts loading as soon as a finger or the mouse is on it.
  const prefetch = () =>
    void queryClient.prefetchQuery(mailMessageQuery(folder, message.uid, true));
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerDown={prefetch}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") prefetch();
      }}
      aria-current={selected || undefined}
      className={`relative flex w-full min-w-0 items-start gap-3 rounded-2xl px-2.5 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
        selected ? "bg-accent-soft" : "active:bg-surface-secondary lg:hover:bg-surface-secondary"
      }`}
    >
      {unread && (
        <span
          className="absolute start-0.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-accent"
          aria-label={t("Non lu")}
        />
      )}
      <SenderAvatar address={person?.address ?? ""} name={who} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-baseline justify-between gap-2">
          <span
            dir="auto"
            className={`truncate text-[15px] rtl:text-right ${
              unread ? "font-bold text-foreground" : "font-medium text-foreground/85"
            }`}
          >
            {folder === "sent" && <span className="font-normal text-muted">{t("À :")} </span>}
            {who}
          </span>
          <time
            dateTime={message.date ?? undefined}
            className={`shrink-0 text-xs tabular-nums ${unread ? "font-semibold text-accent" : "text-muted"}`}
          >
            {shortDate(message.date)}
          </time>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            dir="auto"
            className={`truncate text-sm rtl:text-right ${unread ? "font-semibold text-foreground" : "text-foreground/80"}`}
          >
            {message.subject || t("(Sans objet)")}
          </span>
          {message.attachments && (
            <Paperclip className="size-3.5 shrink-0 text-muted" aria-label={t("Pièce jointe")} />
          )}
        </span>
        {message.preview && (
          <span
            dir="auto"
            className="line-clamp-2 text-[13px] leading-snug text-muted rtl:text-right"
          >
            {message.preview}
          </span>
        )}
      </span>
    </button>
  );
}

/* ───────── Reading ───────── */

/** Replies sent from this screen (message → time), shown under the message. */
const replies = new Map<string, string>();

/** A "could not be delivered" report from a mail server, and its likely reason. */
function bounceOf(mail: MessageDetail) {
  const from = mail.from?.address ?? "";
  const isBounce =
    /mailer-daemon|postmaster/i.test(from) ||
    /undeliver|delivery status|failure notice|delivery failure|non remis|échec de (la )?remise/i.test(
      mail.subject,
    );
  if (!isBounce) return null;
  const text = mail.text || "";
  const recipient =
    /Final-Recipient:\s*rfc822;\s*(\S+@\S+)/i.exec(text)?.[1] ??
    /following recipient[^:]*:\s*(\S+@\S+)/i.exec(text)?.[1] ??
    null;
  const unauthenticated = /SPF|DKIM|unauthenticated|5\.7\.26/i.test(text);
  return { recipient, unauthenticated };
}

function useMessageActions(folder: FolderKey, uid: number, onClose: () => void) {
  const queryClient = useQueryClient();
  const refreshLists = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["mail-list"] }),
      queryClient.invalidateQueries({ queryKey: mailStatusQuery.queryKey }),
    ]);
  const unread = useMutation({
    mutationFn: () => setMailSeen({ data: { folder, uid, seen: false } }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["mail-message", folder, uid] });
      await refreshLists();
      toast.success(t("Marqué comme non lu."));
      onClose();
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Opération impossible."))),
  });
  const remove = useMutation({
    mutationFn: () => deleteMail({ data: { folder, uid } }),
    onSuccess: async (result) => {
      queryClient.removeQueries({ queryKey: ["mail-message", folder, uid] });
      await refreshLists();
      toast.success(
        result.deleted ? t("Message supprimé définitivement.") : t("Message mis à la corbeille."),
      );
      onClose();
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Suppression impossible."))),
  });
  const rescue = useMutation({
    mutationFn: () => markNotJunk({ data: { uid } }),
    onSuccess: async () => {
      await refreshLists();
      toast.success(t("Message remis dans la boîte de réception."));
      onClose();
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Opération impossible."))),
  });
  return { unread, remove, rescue };
}

/** Icon button with a tooltip (computer toolbar). */
function ToolButton({
  label,
  icon: Icon,
  onPress,
  pending,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  pending?: boolean;
  danger?: boolean;
}) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Button
          isIconOnly
          variant="ghost"
          aria-label={label}
          isPending={pending ?? false}
          onPress={onPress}
          className={danger ? "text-danger" : ""}
        >
          <Icon className="size-[18px]" aria-hidden />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function MessageView({
  folder,
  uid,
  layout,
  onClose,
}: {
  folder: FolderKey;
  uid: number;
  /** "pane": computer reading column; "page": phone full screen. */
  layout: "pane" | "page";
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const message = useQuery(mailMessageQuery(folder, uid));
  const { unread, remove, rescue } = useMessageActions(folder, uid, onClose);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replying, setReplying] = useState(false);
  const replyKey = `${folder}:${uid}`;
  const [repliedAt, setRepliedAt] = useState(() => replies.get(replyKey) ?? null);
  const onSent = () => {
    const now = new Date().toISOString();
    replies.set(replyKey, now);
    setRepliedAt(now);
  };

  // Opened = read (also when it was loaded ahead without being marked): the list
  // and the unread count follow without reloading.
  const marked = useRef(false);
  useEffect(() => {
    if (!message.data) return;
    if (!message.data.seen && !marked.current) {
      marked.current = true;
      queryClient.setQueryData(["mail-message", folder, uid], { ...message.data, seen: true });
      void setMailSeen({ data: { folder, uid, seen: true } }).then(() =>
        queryClient.invalidateQueries({ queryKey: mailStatusQuery.queryKey }),
      );
    }
    queryClient.setQueryData<InfiniteData<Summary>>(["mail-list", folder], (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => (m.uid === uid ? { ...m, seen: true } : m)),
            })),
          }
        : data,
    );
    void queryClient.invalidateQueries({ queryKey: mailStatusQuery.queryKey });
  }, [message.data, folder, uid, queryClient]);

  if (message.isPending)
    return (
      <div
        className={`grid content-start gap-4 ${layout === "page" ? "admin-card p-5" : "p-6"}`}
        aria-busy
      >
        <Skeleton className="h-7 w-3/4 rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  if (message.isError)
    return (
      <div className={layout === "pane" ? "p-6" : ""}>
        <LoadError
          message={t(errorMessage(message.error, "Impossible d’ouvrir ce message."))}
          onRetry={() => void message.refetch()}
        />
      </div>
    );

  const mail = message.data;
  // No reply to a delivery failure report (it comes from a robot).
  const replyTo = folder !== "sent" && !bounceOf(mail) ? (mail.replyTo[0] ?? mail.from) : null;
  const deleteLabel = folder === "trash" ? t("Supprimer définitivement") : t("Supprimer");
  const onDelete = () => (folder === "trash" ? setConfirmDelete(true) : remove.mutate());

  const header = (
    <>
      <h1 dir="auto" className="text-xl font-bold leading-snug text-foreground rtl:text-right">
        {mail.subject || t("(Sans objet)")}
      </h1>
      <div className="flex min-w-0 items-start gap-3">
        <SenderAvatar address={mail.from?.address ?? ""} name={nameOf(mail.from)} />
        <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span dir="auto" className="font-semibold text-foreground">
              {nameOf(mail.from)}
            </span>
            {mail.from?.name && (
              <bdi dir="ltr" className="truncate text-xs text-muted">
                {mail.from.address}
              </bdi>
            )}
          </p>
          <p className="truncate text-xs text-muted">
            {t("À :")} <bdi dir="ltr">{mail.to.map((a) => nameOf(a)).join(", ")}</bdi>
            {mail.cc.length > 0 && (
              <>
                {" · Cc : "}
                <bdi dir="ltr">{mail.cc.map((a) => nameOf(a)).join(", ")}</bdi>
              </>
            )}
          </p>
        </div>
        {mail.date && (
          <time dateTime={mail.date} className="shrink-0 text-xs text-muted">
            {formatDate(new Date(mail.date), {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        )}
      </div>
    </>
  );

  const bounce = bounceOf(mail);
  const content = (
    <>
      {bounce && (
        <div className="grid gap-1 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-semibold">
            {bounce.recipient
              ? t("Votre e-mail à {email} n’a pas été distribué.", { email: bounce.recipient })
              : t("Un e-mail envoyé n’a pas été distribué.")}
          </p>
          <p className="leading-snug text-foreground/80">
            {bounce.unauthenticated
              ? t(
                  "Raison : le domaine autokontorsfax.com n’est pas encore authentifié (SPF et DKIM manquants). Gmail et d’autres messageries refusent ces e-mails tant que ces réglages DNS ne sont pas ajoutés.",
                )
              : t(
                  "Raison probable : adresse du destinataire erronée ou boîte pleine. Vérifiez l’adresse puis renvoyez.",
                )}
          </p>
        </div>
      )}
      {mail.html ? (
        <MailFrame html={mail.html} />
      ) : (
        <div
          dir="auto"
          className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground"
        >
          {mail.text || t("(Message vide)")}
        </div>
      )}
      {repliedAt && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Send className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden />
          {t("Réponse envoyée à {time}.", {
            time: formatDate(new Date(repliedAt), { hour: "2-digit", minute: "2-digit" }),
          })}
        </p>
      )}
      {mail.files.length > 0 && (
        <section className="grid gap-2 border-t border-separator pt-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t("Pièces jointes")} ({formatNumber(mail.files.length)})
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {mail.files.map((file) => (
              <li key={file.index} className="min-w-0">
                <AttachmentButton folder={folder} uid={uid} file={file} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  const confirm = (
    <ConfirmDialog
      isOpen={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={t("Supprimer définitivement ce message ?")}
      confirmLabel={t("Supprimer")}
      onConfirm={() => remove.mutateAsync()}
    >
      {t("Il ne pourra plus être récupéré.")}
    </ConfirmDialog>
  );

  if (layout === "pane")
    return (
      <>
        <div className="flex items-center gap-1 border-b border-separator px-4 py-2">
          {folder === "junk" && (
            <Button
              size="sm"
              variant="secondary"
              isPending={rescue.isPending}
              onPress={() => rescue.mutate()}
            >
              <ShieldCheck className="size-4" aria-hidden />
              {t("Ce n’est pas un spam")}
            </Button>
          )}
          <span className="flex-1" />
          {folder !== "sent" && (
            <ToolButton
              label={t("Marquer comme non lu")}
              icon={Mail}
              pending={unread.isPending}
              onPress={() => unread.mutate()}
            />
          )}
          <ToolButton
            label={deleteLabel}
            icon={Trash2}
            pending={remove.isPending}
            onPress={onDelete}
            danger
          />
          <ToolButton label={t("Fermer")} icon={X} onPress={onClose} />
        </div>
        <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" size={40}>
          <article className={`grid min-w-0 grid-cols-1 gap-5 p-6 ${fadeIn}`}>
            {header}
            {content}
          </article>
        </ScrollShadow>
        {replyTo && <InlineReply mail={mail} to={replyTo} onSent={onSent} />}
        {confirm}
      </>
    );

  // Phone: full screen, big reply button at the bottom.
  return (
    <>
      <article
        className={`admin-card grid min-w-0 grid-cols-1 gap-4 p-4 pb-5 ${fadeIn} max-lg:slide-in-from-right-8 rtl:max-lg:slide-in-from-left-8`}
      >
        {folder === "junk" && (
          <Button variant="secondary" isPending={rescue.isPending} onPress={() => rescue.mutate()}>
            <ShieldCheck className="size-4" aria-hidden />
            {t("Ce n’est pas un spam")}
          </Button>
        )}
        {header}
        {content}
      </article>
      {/* Room for the action bar. */}
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-separator bg-surface/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pe-[max(1rem,env(safe-area-inset-right))] ps-[max(1rem,env(safe-area-inset-left))] pt-3 backdrop-blur-xl">
        {replyTo ? (
          <Button className="h-12 flex-1 text-base" onPress={() => setReplying(true)}>
            <Reply className="size-5 rtl:-scale-x-100" aria-hidden />
            {t("Répondre")}
          </Button>
        ) : (
          <span className="flex-1" />
        )}
        {folder !== "sent" && (
          <Button
            isIconOnly
            variant="secondary"
            className="size-12"
            aria-label={t("Marquer comme non lu")}
            isPending={unread.isPending}
            onPress={() => unread.mutate()}
          >
            <Mail className="size-5" aria-hidden />
          </Button>
        )}
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 text-danger"
          aria-label={deleteLabel}
          isPending={remove.isPending}
          onPress={onDelete}
        >
          <Trash2 className="size-5" aria-hidden />
        </Button>
      </div>
      {replyTo && (
        <ReplySheet
          mail={mail}
          to={replyTo}
          isOpen={replying}
          onOpenChange={setReplying}
          onSent={onSent}
        />
      )}
      {confirm}
    </>
  );
}

/**
 * The e-mail's own layout, in a frame where nothing can run: no scripts, no forms,
 * links open in a new tab. The frame grows to the height of the message.
 */
function MailFrame({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);
  const doc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid: https: http:; style-src 'unsafe-inline'; font-src data: https:">
<base target="_blank">
<style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.55;color:#18181b;overflow-wrap:anywhere;word-break:break-word}img{max-width:100%;height:auto}table{max-width:100%!important}a{color:#c81e1e}blockquote{margin:0 0 0 .5rem;padding-left:.75rem;border-left:3px solid #e4e4e7;color:#52525b}</style>
</head><body>${html}</body></html>`,
    [html],
  );
  useEffect(() => {
    const el = frame.current;
    if (!el) return undefined;
    let observer: ResizeObserver | null = null;
    const measure = () => {
      const root = el.contentDocument?.documentElement;
      if (root) setHeight(Math.max(120, Math.ceil(root.scrollHeight)));
    };
    const onLoad = () => {
      measure();
      const body = el.contentDocument?.body;
      const View = el.contentWindow as (Window & typeof globalThis) | null;
      if (body && View?.ResizeObserver) {
        observer = new View.ResizeObserver(measure);
        observer.observe(body);
      }
    };
    el.addEventListener("load", onLoad);
    return () => {
      el.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [doc]);
  return (
    <iframe
      ref={frame}
      title={t("Contenu du message")}
      srcDoc={doc}
      // Same origin only so the height can be read; scripts stay disabled.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="w-full rounded-xl bg-white"
      style={{ height }}
    />
  );
}

function AttachmentButton({
  folder,
  uid,
  file,
}: {
  folder: FolderKey;
  uid: number;
  file: { index: number; filename: string; contentType: string; size: number };
}) {
  const download = useMutation({
    mutationFn: () => downloadAttachment({ data: { folder, uid, index: file.index } }),
    onSuccess: (result) => {
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Téléchargement impossible."))),
  });
  return (
    <button
      type="button"
      onClick={() => download.mutate()}
      disabled={download.isPending}
      className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-separator bg-surface px-3 py-2.5 text-start outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-70"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
        {download.isPending ? <Spinner size="sm" /> : <Paperclip className="size-4" aria-hidden />}
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-foreground">{file.filename}</span>
        <span className="text-xs text-muted">{fileSize(file.size)}</span>
      </span>
      <ArrowDownToLine className="size-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}

/* ───────── Replying ───────── */

const replySubject = (subject: string) =>
  /^(re|tr|fwd?)\s*:/i.test(subject) ? subject : `Re: ${subject}`;

/** The reply's text: what was typed, then the original message quoted. */
function replyBody(mail: MessageDetail, typed: string) {
  const when = mail.date
    ? formatDate(new Date(mail.date), { dateStyle: "long", timeStyle: "short" })
    : "";
  const quoted = (mail.text || "")
    .slice(0, 8000)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${typed.trimEnd()}\n\n${t("Le {date}, {name} a écrit :", { date: when, name: nameOf(mail.from) })}\n${quoted}`;
}

function replyThread(mail: MessageDetail) {
  return {
    ...(mail.messageId ? { inReplyTo: mail.messageId } : {}),
    references: [...mail.references, ...(mail.messageId ? [mail.messageId] : [])].slice(-20),
  };
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Sends an e-mail (attachments read in the browser); refreshes "Envoyés". */
function useSend(onSent: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mail: {
      to: string[];
      cc: string[];
      subject: string;
      text: string;
      inReplyTo?: string;
      references?: string[];
      files: File[];
    }) =>
      sendMail({
        data: {
          to: mail.to,
          cc: mail.cc,
          subject: mail.subject.trim(),
          text: mail.text,
          ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo } : {}),
          ...(mail.references?.length ? { references: mail.references } : {}),
          files: await Promise.all(
            mail.files.map(async (file) => ({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              base64: await readAsBase64(file),
            })),
          ),
        },
      }),
    onSuccess: async () => {
      toast.success(t("E-mail envoyé."));
      onSent();
      await queryClient.invalidateQueries({ queryKey: ["mail-list", "sent"] });
    },
    onError: (e) => toast.danger(t(errorMessage(e, "Envoi impossible."))),
  });
}

/** Attachments of a draft: picker button and the chosen files (removable). */
function Attachments({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const total = files.reduce((sum, f) => sum + f.size, 0);
  return (
    <div className="grid gap-2">
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          onChange([...files, ...(event.target.files ?? [])].slice(0, 10));
          event.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex min-w-0 items-center gap-2.5 rounded-xl bg-surface-secondary px-3 py-1.5"
            >
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="shrink-0 text-xs text-muted">{fileSize(file.size)}</span>
              <button
                type="button"
                aria-label={t("Retirer {name}", { name: file.name })}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {total > MAX_UPLOAD && (
        <p className="text-sm text-danger">
          {t("Pièces jointes trop lourdes : 4 Mo au total maximum.")}
        </p>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        onPress={() => picker.current?.click()}
      >
        <Paperclip className="size-4" aria-hidden />
        {t("Joindre un fichier")}
      </Button>
    </div>
  );
}

/** Computer: reply box under the open message (grows when used). */
function InlineReply({
  mail,
  to,
  onSent,
}: {
  mail: MessageDetail;
  to: Address;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [focused, setFocused] = useState(false);
  const send = useSend(() => {
    setText("");
    setFiles([]);
    setFocused(false);
    onSent();
  });
  const open = focused || Boolean(text) || files.length > 0;
  const tooBig = files.reduce((s, f) => s + f.size, 0) > MAX_UPLOAD;
  const submit = () => {
    if (!text.trim() || tooBig) return;
    send.mutate({
      to: [to.address],
      cc: [],
      subject: replySubject(mail.subject),
      text: replyBody(mail, text),
      ...replyThread(mail),
      files,
    });
  };
  return (
    <div className="border-t border-separator bg-surface p-3">
      <div
        className={`rounded-2xl border bg-surface transition-[border-color,box-shadow] ${
          open ? "border-accent/40 shadow-[0_0_0_4px_var(--accent-soft)]" : "border-separator"
        }`}
      >
        <TextField
          value={text}
          onChange={setText}
          aria-label={t("Répondre à {name}", { name: nameOf(to) })}
          fullWidth
        >
          <TextArea
            rows={open ? 5 : 1}
            placeholder={t("Répondre à {name}…", { name: nameOf(to) })}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              // Ctrl/⌘ + Entrée sends.
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submit();
              }
            }}
            className="resize-none border-0 bg-transparent shadow-none focus:ring-0"
          />
        </TextField>
        {open && (
          <div className="flex items-end gap-2 px-2 pb-2">
            <div className="min-w-0 flex-1">
              <Attachments files={files} onChange={setFiles} />
            </div>
            <Button isPending={send.isPending} isDisabled={!text.trim() || tooBig} onPress={submit}>
              <Send className="size-4 rtl:-scale-x-100" aria-hidden />
              {send.isPending ? t("Envoi…") : t("Envoyer")}
            </Button>
          </div>
        )}
      </div>
      {open && (
        <p className="mt-1.5 px-1 text-xs text-muted">
          {t("Le message d’origine est ajouté sous votre réponse.")}
        </p>
      )}
    </div>
  );
}

/** Phone: reply sheet — the text, a big "Envoyer", nothing else to fill in. */
function ReplySheet({
  mail,
  to,
  isOpen,
  onOpenChange,
  onSent,
}: {
  mail: MessageDetail;
  to: Address;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  // Kept while the sheet is closed: swiping it away never loses the text.
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const send = useSend(() => {
    setText("");
    setFiles([]);
    onOpenChange(false);
    onSent();
  });
  const tooBig = files.reduce((s, f) => s + f.size, 0) > MAX_UPLOAD;
  const submit = () => {
    if (!text.trim() || tooBig) return;
    send.mutate({
      to: [to.address],
      cc: [],
      subject: replySubject(mail.subject),
      text: replyBody(mail, text),
      ...replyThread(mail),
      files,
    });
  };
  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => !send.isPending && onOpenChange(open)}
      avoidKeyboard
      title={t("Répondre à {name}", { name: nameOf(to) })}
      description={<bdi dir="auto">{replySubject(mail.subject)}</bdi>}
      action={
        <Button
          size="sm"
          className="h-10 shrink-0 px-4"
          isPending={send.isPending}
          isDisabled={!text.trim() || tooBig}
          onPress={submit}
        >
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {t("Envoyer")}
        </Button>
      }
    >
      <div className="grid gap-3 px-2 pb-2">
        <TextField value={text} onChange={setText} aria-label={t("Votre réponse")} fullWidth>
          <TextArea
            rows={7}
            autoFocus
            placeholder={t("Écrivez votre réponse…")}
            className="min-h-40 text-base"
          />
        </TextField>
        <Attachments files={files} onChange={setFiles} />
        <p className="px-1 text-xs text-muted">
          {t("Le message d’origine est ajouté sous votre réponse.")}
        </p>
      </div>
    </BottomSheet>
  );
}

/* ───────── New e-mail ───────── */

type Draft = { to: string; cc: string; subject: string; text: string };
const emptyDraft: Draft = { to: "", cc: "", subject: "", text: "" };

const splitAddresses = (value: string) =>
  value
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);

/** New e-mail: a sheet on phones, a window on computers. */
function Composer({
  draft,
  onClose,
  sheet,
}: {
  draft: Draft | null;
  onClose: () => void;
  sheet: boolean;
}) {
  const [value, setValue] = useState<Draft>(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // A new draft each time the editor opens.
  useEffect(() => {
    if (!draft) return;
    setValue(draft);
    setFiles([]);
    setShowCc(Boolean(draft.cc));
    setSubmitted(false);
  }, [draft]);

  const send = useSend(onClose);
  const to = splitAddresses(value.to);
  const cc = splitAddresses(value.cc);
  const badTo = !to.length || to.some((a) => !EMAIL.test(a));
  const badCc = cc.some((a) => !EMAIL.test(a));
  const tooBig = files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD;
  const dirty =
    Boolean(draft) &&
    (value.text.trim() !== (draft?.text ?? "").trim() ||
      value.subject !== (draft?.subject ?? "") ||
      files.length > 0);
  const submit = () => {
    setSubmitted(true);
    if (badTo || badCc || tooBig) return;
    send.mutate({ to, cc, subject: value.subject, text: value.text, files });
  };
  const close = () => (dirty && !send.isPending ? setConfirmClose(true) : onClose());

  const fields = (
    <div className="grid gap-4">
      <TextField
        name="to"
        value={value.to}
        onChange={(to) => setValue((v) => ({ ...v, to }))}
        isInvalid={submitted && badTo}
        fullWidth
        autoFocus={!value.to}
      >
        <Label>{t("À")}</Label>
        <Input
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="client@exemple.com"
        />
        {submitted && badTo && (
          <p className="text-sm text-danger">
            {t("Saisissez une ou plusieurs adresses e-mail valides, séparées par des virgules.")}
          </p>
        )}
      </TextField>
      {showCc ? (
        <TextField
          name="cc"
          value={value.cc}
          onChange={(cc) => setValue((v) => ({ ...v, cc }))}
          isInvalid={submitted && badCc}
          fullWidth
        >
          <Label>{t("Copie (Cc)")}</Label>
          <Input dir="ltr" inputMode="email" autoCapitalize="none" spellCheck={false} />
        </TextField>
      ) : (
        <button
          type="button"
          onClick={() => setShowCc(true)}
          className="-mt-2 flex items-center gap-1 justify-self-start text-sm font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronDown className="size-4" aria-hidden />
          {t("Ajouter une copie (Cc)")}
        </button>
      )}
      <TextField
        name="subject"
        value={value.subject}
        onChange={(subject) => setValue((v) => ({ ...v, subject }))}
        fullWidth
      >
        <Label>{t("Objet")}</Label>
        <Input dir="auto" maxLength={300} />
      </TextField>
      <TextField
        name="text"
        value={value.text}
        onChange={(text) => setValue((v) => ({ ...v, text }))}
        fullWidth
        autoFocus={Boolean(value.to)}
      >
        <Label>{t("Message")}</Label>
        <TextArea rows={sheet ? 8 : 10} className="min-h-48" />
      </TextField>
      <Attachments files={files} onChange={setFiles} />
    </div>
  );

  const confirm = (
    <ConfirmDialog
      isOpen={confirmClose}
      onOpenChange={setConfirmClose}
      tone="warning"
      title={t("Abandonner ce message ?")}
      confirmLabel={t("Abandonner")}
      cancelLabel={t("Continuer à écrire")}
      onConfirm={() => onClose()}
    >
      {t("Le texte saisi sera perdu.")}
    </ConfirmDialog>
  );

  if (sheet)
    return (
      <>
        <BottomSheet
          isOpen={Boolean(draft)}
          onOpenChange={(open) => !open && close()}
          avoidKeyboard
          tall
          title={t("Nouvel e-mail")}
          description={t("Envoyé depuis l’adresse de la boutique.")}
          action={
            <Button
              size="sm"
              className="h-10 shrink-0 px-4"
              isPending={send.isPending}
              onPress={submit}
            >
              <Send className="size-4 rtl:-scale-x-100" aria-hidden />
              {t("Envoyer")}
            </Button>
          }
        >
          <div className="px-2 pb-2">{fields}</div>
        </BottomSheet>
        {confirm}
      </>
    );

  return (
    <>
      <Modal.Backdrop
        isOpen={Boolean(draft)}
        onOpenChange={(open) => !open && close()}
        isDismissable={!send.isPending}
      >
        <Modal.Container placement="auto" scroll="inside">
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.CloseTrigger aria-label={t("Fermer")} />
            <Modal.Header>
              <Modal.Heading>{t("Nouvel e-mail")}</Modal.Heading>
              <p className="mt-1 text-sm text-muted">
                {t("Envoyé depuis l’adresse de la boutique.")}
              </p>
            </Modal.Header>
            <Form
              className="contents"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <Modal.Body>{fields}</Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" isDisabled={send.isPending} onPress={close}>
                  {t("Annuler")}
                </Button>
                <Button type="submit" isPending={send.isPending}>
                  <Send className="size-4 rtl:-scale-x-100" aria-hidden />
                  {send.isPending ? t("Envoi…") : t("Envoyer")}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {confirm}
    </>
  );
}
