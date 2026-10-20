import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DateField,
  DateRangePicker,
  Label,
  RangeCalendar,
  SearchField,
  Spinner,
  Table,
  toast,
} from "@heroui/react";
import { getLocalTimeZone, toCalendarDate, today, type DateValue } from "@internationalized/date";
import {
  Car,
  CheckCircle2,
  Inbox,
  MessageCircle,
  Phone,
  RotateCcw,
  Trash2,
} from "@/components/icons";
import { deleteLead, setLeadHandled, type Lead } from "@/lib/data";
import { useDialogTarget } from "./hooks";
import { t } from "./i18n";
import { LeadsMobile, type Period } from "./LeadsMobile";
import { dateTimeFormat, leadsQueryOptions, normalize, plural } from "./model";
import {
  ConfirmDialog,
  EmptyState,
  ListPagination,
  LoadError,
  PageHeader,
  RowMenu,
  SelectField,
  StatusChip,
  TableSkeleton,
  type RowAction,
  Toolbar,
} from "./ui";

const PAGE_SIZE = 10;
type Filter = "open" | "handled" | "all";
const FILTERS = [
  { id: "open", label: "À traiter" },
  { id: "handled", label: "Traitées" },
  { id: "all", label: "Toutes" },
];
type Range = { start: DateValue; end: DateValue };
const COLUMNS = ["Reçue le", "Contact", "Véhicule", "Message", "Statut", ""];

/** wa.me wants the international number without "+" or "00"; local numbers are Tunisian. */
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return `https://wa.me/${digits.length === 8 ? `216${digits}` : digits}`;
}

export function LeadsTab() {
  const queryClient = useQueryClient();
  const leads = useQuery(leadsQueryOptions);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const deletion = useDialogTarget<Lead>();
  const key = leadsQueryOptions.queryKey;

  const handled = useMutation({
    mutationFn: (data: { id: string; handled: boolean }) => setLeadHandled({ data }),
    onMutate: async ({ id, handled: done }) => {
      setPending((current) => new Set(current).add(id));
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (list) =>
        list?.map((lead) => (lead.id === id ? { ...lead, handled: done } : lead)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.danger(e.message);
    },
    onSuccess: (_, { handled: done }) =>
      toast.success(t(done ? "Demande marquée comme traitée." : "Demande remise à traiter.")),
    onSettled: (_data, _error, { id }) => {
      setPending((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead({ data: { id } }),
    onSuccess: () => {
      toast.success(t("Demande supprimée."));
      return queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const all = leads.data ?? [];
  const query = normalize(search.trim());
  const queryDigits = search.replace(/\D/g, "");
  const tz = getLocalTimeZone();
  const from = range ? toCalendarDate(range.start).toDate(tz).getTime() : -Infinity;
  const to = range ? toCalendarDate(range.end).add({ days: 1 }).toDate(tz).getTime() : Infinity;
  const filtered = all.filter((lead) => {
    if (filter !== "all" && lead.handled !== (filter === "handled")) return false;
    const received = new Date(lead.created_at).getTime();
    if (received < from || received >= to) return false;
    if (!query) return true;
    return (
      normalize(`${lead.name} ${lead.email ?? ""} ${lead.message ?? ""} ${lead.phone}`).includes(
        query,
      ) ||
      (queryDigits.length >= 3 && lead.phone.replace(/\D/g, "").includes(queryDigits))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const openCount = all.filter((lead) => !lead.handled).length;
  const filtersActive = query !== "" || range !== null || filter !== "open";

  const resetFilters = () => {
    setSearch("");
    setRange(null);
    setPeriod("all");
    setFilter("open");
    setPage(1);
  };

  const emptyState =
    all.length === 0 ? (
      <EmptyState
        icon={Inbox}
        title={t("Aucune demande reçue pour l’instant.")}
        description={t("Les messages du formulaire de contact apparaîtront ici.")}
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title={t(!filtersActive ? "Aucune demande à traiter." : "Aucune demande ne correspond.")}
        description={t(
          !filtersActive
            ? "Toutes les demandes ont été traitées."
            : "Modifiez la recherche, le statut ou la période.",
        )}
        action={
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              resetFilters();
              setFilter("all");
            }}
          >
            {t("Afficher toutes les demandes")}
          </Button>
        }
      />
    );

  const choosePeriod = (next: Period) => {
    setPeriod(next);
    setRange(
      next === "all"
        ? null
        : { start: today(tz).subtract({ days: Number(next) - 1 }), end: today(tz) },
    );
    setPage(1);
  };

  return (
    <>
      {/* Phones: conversation cards grouped by day. */}
      <div className="lg:hidden">
        <LeadsMobile
          all={all}
          filtered={filtered}
          isPending={leads.isPending}
          error={
            leads.isError ? (
              <LoadError
                message={t("Impossible de charger les demandes.")}
                onRetry={() => leads.refetch()}
              />
            ) : null
          }
          filter={filter}
          onFilter={(next) => {
            setFilter(next);
            setPage(1);
          }}
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          period={period}
          onPeriod={choosePeriod}
          pending={pending}
          telOf={telOf}
          whatsappUrl={whatsappUrl}
          menu={(lead) =>
            leadMenu(
              lead,
              () => handled.mutate({ id: lead.id, handled: !lead.handled }),
              () => deletion.open(lead),
            )
          }
          onToggle={(lead) => handled.mutate({ id: lead.id, handled: !lead.handled })}
          onReset={() => {
            resetFilters();
            setFilter("all");
          }}
        />
      </div>

      <div className="grid gap-6 max-lg:hidden">
        <PageHeader
          title={t("Demandes")}
          description={
            leads.data
              ? t("Messages envoyés depuis le formulaire du site · {count}", {
                  count: plural(openCount, "demande à traiter", "demandes à traiter"),
                })
              : t("Messages envoyés depuis le formulaire du site.")
          }
        />

        <Toolbar label={t("Filtrer les demandes")}>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="min-w-0 flex-1 basis-64"
            fullWidth
          >
            <Label>{t("Rechercher")}</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t("Nom, téléphone ou message…")} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <SelectField
            label={t("Statut")}
            value={filter}
            options={FILTERS.map((option) => ({ ...option, label: t(option.label) }))}
            onChange={(value) => {
              setFilter(value as Filter);
              setPage(1);
            }}
            className="w-full sm:w-44"
          />
          <DateRangePicker
            value={range}
            onChange={(value) => {
              setRange(value);
              setPage(1);
            }}
            maxValue={today(tz)}
            className="w-full sm:w-80"
          >
            <Label>{t("Reçues entre le")}</Label>
            <DateField.Group fullWidth>
              <DateField.Input slot="start">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateRangePicker.RangeSeparator />
              <DateField.Input slot="end">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DateRangePicker.Trigger aria-label={t("Choisir les dates")}>
                  <DateRangePicker.TriggerIndicator />
                </DateRangePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <DateRangePicker.Popover>
              <RangeCalendar aria-label={t("Période de réception")}>
                <RangeCalendar.Header>
                  <RangeCalendar.YearPickerTrigger>
                    <RangeCalendar.YearPickerTriggerHeading />
                    <RangeCalendar.YearPickerTriggerIndicator />
                  </RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {(date) => <RangeCalendar.Cell date={date} />}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
                <RangeCalendar.YearPickerGrid>
                  <RangeCalendar.YearPickerGridBody>
                    {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                  </RangeCalendar.YearPickerGridBody>
                </RangeCalendar.YearPickerGrid>
              </RangeCalendar>
            </DateRangePicker.Popover>
          </DateRangePicker>
          {filtersActive && (
            <Button variant="tertiary" onPress={resetFilters}>
              {t("Réinitialiser")}
            </Button>
          )}
        </Toolbar>

        {leads.isError ? (
          <LoadError
            message={t("Impossible de charger les demandes.")}
            onRetry={() => leads.refetch()}
          />
        ) : leads.isPending ? (
          <TableSkeleton
            label={t("Demandes")}
            columns={COLUMNS.map((column) => (column ? t(column) : column))}
            minWidth="min-w-[880px]"
          />
        ) : (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t("Demandes de contact")} className="min-w-[880px]">
                  <Table.Header>
                    <Table.Column className="w-40">{t("Reçue le")}</Table.Column>
                    <Table.Column isRowHeader>{t("Contact")}</Table.Column>
                    <Table.Column>{t("Véhicule")}</Table.Column>
                    <Table.Column className="w-80">{t("Message")}</Table.Column>
                    <Table.Column>{t("Statut")}</Table.Column>
                    <Table.Column className="w-14">
                      <span className="sr-only">{t("Actions")}</span>
                    </Table.Column>
                  </Table.Header>
                  <Table.Body renderEmptyState={() => emptyState}>
                    {rows.map((lead) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        pending={pending.has(lead.id)}
                        onToggle={() => handled.mutate({ id: lead.id, handled: !lead.handled })}
                        onDelete={() => deletion.open(lead)}
                      />
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
            {filtered.length > 0 && (
              <ListPagination
                page={current}
                pageCount={pageCount}
                onChange={setPage}
                summary={t("{from}–{to} sur {total}", {
                  from: String((current - 1) * PAGE_SIZE + 1),
                  to: String(Math.min(current * PAGE_SIZE, filtered.length)),
                  total: plural(filtered.length, "demande", "demandes"),
                })}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={deletion.isOpen}
        onOpenChange={deletion.onOpenChange}
        title={t("Supprimer cette demande ?")}
        confirmLabel={t("Supprimer")}
        onConfirm={() => deletion.target && remove.mutateAsync(deletion.target.id)}
      >
        <p>
          {t("La demande de")} <strong>{deletion.target?.name}</strong>{" "}
          {t("sera définitivement supprimée. Cette action est irréversible.")}
        </p>
      </ConfirmDialog>
    </>
  );
}

function LeadRow({
  lead,
  pending,
  onToggle,
  onDelete,
}: {
  lead: Lead;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const message = lead.message?.trim() ?? "";
  const long = message.length > 120 || message.includes("\n");
  const tel = `tel:${lead.phone.replace(/[^\d+]/g, "")}`;
  return (
    <Table.Row id={lead.id}>
      <Table.Cell className="whitespace-nowrap text-sm text-muted">
        <time dateTime={lead.created_at}>{dateTimeFormat.format(new Date(lead.created_at))}</time>
      </Table.Cell>
      <Table.Cell>
        <p className="font-medium text-foreground">{lead.name}</p>
        <a href={tel} className="block text-sm text-accent hover:underline">
          <bdi dir="ltr">{lead.phone}</bdi>
        </a>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="block break-all text-sm text-accent hover:underline"
          >
            {lead.email}
          </a>
        )}
      </Table.Cell>
      <Table.Cell className="text-sm">
        {lead.car_slug ? (
          <a
            href={`/vehicule/${lead.car_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {lead.car_slug}
          </a>
        ) : (
          <span className="text-muted">—</span>
        )}
      </Table.Cell>
      <Table.Cell>
        {message ? (
          <div className="max-w-80">
            <p
              id={`lead-message-${lead.id}`}
              className={`text-sm ${expanded ? "whitespace-pre-line" : "line-clamp-2"}`}
            >
              {message}
            </p>
            {long && (
              <Button
                size="sm"
                variant="ghost"
                className="-ms-3 mt-1"
                aria-expanded={expanded}
                aria-controls={`lead-message-${lead.id}`}
                onPress={() => setExpanded((v) => !v)}
              >
                {t(expanded ? "Réduire" : "Lire la suite")}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </Table.Cell>
      <Table.Cell>
        <span className="inline-flex items-center gap-2">
          <StatusChip tone={lead.handled ? "success" : "warning"}>
            {t(lead.handled ? "Traitée" : "À traiter")}
          </StatusChip>
          {pending && <Spinner size="sm" aria-label={t("Mise à jour du statut")} />}
        </span>
      </Table.Cell>
      <Table.Cell className="text-end">
        <RowMenu
          label={t("Actions pour la demande de {name}", { name: lead.name })}
          actions={leadMenu(lead, onToggle, onDelete)}
        />
      </Table.Cell>
    </Table.Row>
  );
}

const telOf = (lead: Lead) => `tel:${lead.phone.replace(/[^\d+]/g, "")}`;

function leadMenu(lead: Lead, onToggle: () => void, onDelete: () => void): (RowAction | false)[] {
  const tel = telOf(lead);
  return [
    {
      id: "toggle",
      label: t(lead.handled ? "Marquer à traiter" : "Marquer traitée"),
      icon: lead.handled ? RotateCcw : CheckCircle2,
      onAction: onToggle,
    },
    { id: "call", label: t("Appeler"), icon: Phone, href: tel },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: whatsappUrl(lead.phone),
      external: true,
    },
    !!lead.car_slug && {
      id: "car",
      label: t("Voir le véhicule"),
      icon: Car,
      href: `/vehicule/${lead.car_slug}`,
      external: true,
    },
    { id: "delete", label: t("Supprimer"), icon: Trash2, onAction: onDelete, danger: true },
  ];
}
