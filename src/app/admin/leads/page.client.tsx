"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminInputField } from "@/features/admin/ui/admin-form-field";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { LeadStatusSelect } from "@/features/admin/leads/lead-status-select";
import { LeadScheduleCell } from "@/features/admin/leads/lead-schedule-cell";
import { LeadScheduleSidePanel } from "@/features/admin/leads/lead-schedule-side-panel";
import type { CalendarEntryKind, InteriorInstallation } from "@/features/admin/install-calendar/types";
import { formatPrice } from "@/lib/client/format";
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_OPTIONS,
} from "@/lib/client/lead-status";
import { cn } from "@/lib/utils";

type LeadTab = "salon" | "website" | "measure";

type LeadListItem = {
  id: number;
  customerName: string;
  address: string;
  phone: string;
  contractNumber: string;
  contractDate: string | null;
  clientComment: string;
  totalPrice: number;
  status: string;
  arrivalDate?: string | null;
  invoiceNumber?: string;
  measureNote?: string;
  firstProductName?: string;
  firstProductItemId?: number | null;
  installId?: number | null;
  installDate?: string | null;
  installEndDate?: string | null;
  deliveryId?: number | null;
  deliveryDate?: string | null;
  deliveryEndDate?: string | null;
  createdAt: string;
  items?: Array<{ name?: string }>;
};

type LeadLineItem = {
  id: number;
  name: string;
  sku?: string;
  color?: string;
  price: number;
  quantity: number;
};

type SchedulePanelState = {
  leadId: number;
  leadLabel: string;
  kind: CalendarEntryKind;
  jobId: number | null;
};

const TAB_CONFIG: Record<
  LeadTab,
  { label: string; type: string; description: string }
> = {
  salon: {
    label: "Заявки салона",
    type: "admin_order",
    description: "Заявки, созданные администратором из корзины.",
  },
  website: {
    label: "Заявки с сайта",
    type: "cart_lead",
    description: "Заявки, отправленные клиентами из корзины на сайте.",
  },
  measure: {
    label: "Заявки на замер",
    type: "measure_lead",
    description: "Заявки на бесплатный замер без корзины.",
  },
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const cellPad = "px-1.5 py-1.5";
const cellHead = cn(cellPad, "whitespace-normal break-words leading-tight");

const leadScheduleLabel = (item: LeadListItem) =>
  [item.contractNumber, item.customerName].filter(Boolean).join(" · ");

const leadClipboardText = (item: LeadListItem) =>
  [item.address, item.phone, item.customerName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("\n");

const truncateText = (value: string, max = 80) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const parseTab = (value: string | null): LeadTab => {
  if (value === "website" || value === "measure") return value;
  return "salon";
};

const todayIsoDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type CreateLeadForm = {
  contractDate: string;
  customerName: string;
  address: string;
  phone: string;
  contractNumber: string;
  productName: string;
  amount: string;
};

const emptyCreateForm = (): CreateLeadForm => ({
  contractDate: todayIsoDate(),
  customerName: "",
  address: "",
  phone: "",
  contractNumber: "",
  productName: "",
  amount: "",
});

function LeadStatusMultiFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const label =
    selected.length === 0
      ? "Все"
      : selected.length === 1
        ? (LEAD_STATUS_LABELS[selected[0]] ?? selected[0])
        : `Выбрано: ${selected.length}`;

  return (
    <div ref={rootRef} className="relative min-w-[12rem]">
      <label className="mb-1 block text-sm text-zinc-600" htmlFor="lead-status-filter">
        Статус
      </label>
      <button
        id="lead-status-filter"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-30 mt-1 w-full min-w-[14rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-1.5">
            <button
              type="button"
              className="text-xs text-zinc-600 hover:text-zinc-900"
              onClick={() => onChange([])}
            >
              Все
            </button>
            {selected.length > 0 ? (
              <button
                type="button"
                className="text-xs text-zinc-600 hover:text-zinc-900"
                onClick={() => onChange([])}
              >
                Сбросить
              </button>
            ) : null}
          </div>
          {LEAD_STATUS_OPTIONS.map((item) => {
            const checked = selected.includes(item.value);
            return (
              <label
                key={item.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.value)}
                  className="size-4 rounded border-zinc-300"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LeadProductNameInput({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      type="text"
      value={draft}
      disabled={disabled}
      maxLength={500}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next !== value.trim()) onSave(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className="h-7 w-full min-w-0 rounded border border-zinc-200 bg-white px-1.5 text-xs disabled:bg-zinc-50"
      aria-label="Наименование товара"
      placeholder="—"
    />
  );
}

function LeadInvoiceNumberInput({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      type="text"
      value={draft}
      disabled={disabled}
      maxLength={120}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next !== value.trim()) onSave(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className="h-7 w-full min-w-0 rounded border border-zinc-200 bg-white px-1.5 text-xs disabled:bg-zinc-50"
      aria-label="Комментарии"
      placeholder="—"
    />
  );
}

function LeadMeasureNoteInput({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      type="text"
      value={draft}
      disabled={disabled}
      maxLength={300}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next !== value.trim()) onSave(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className="h-7 w-full min-w-0 rounded border border-zinc-200 bg-white px-1.5 text-xs disabled:bg-zinc-50"
      aria-label="Замер"
      placeholder="Текст замера"
    />
  );
}

export default function AdminLeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const tabConfig = TAB_CONFIG[activeTab];

  const [items, setItems] = useState<LeadListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [hideEstimates, setHideEstimates] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateLeadForm>(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<number | null>(null);
  const [schedulePanel, setSchedulePanel] = useState<SchedulePanelState | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<number, LeadLineItem[]>>({});
  const [expandLoadingId, setExpandLoadingId] = useState<number | null>(null);
  const [expandError, setExpandError] = useState("");

  const copyLeadContact = async (item: LeadListItem) => {
    const text = leadClipboardText(item);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLeadId(item.id);
      window.setTimeout(() => {
        setCopiedLeadId((current) => (current === item.id ? null : current));
      }, 1500);
    } catch {
      setError("Не удалось скопировать в буфер обмена");
    }
  };

  const openSchedulePanel = (
    item: LeadListItem,
    kind: CalendarEntryKind,
    jobId: number | null,
  ) => {
    setSchedulePanel({
      leadId: item.id,
      leadLabel: leadScheduleLabel(item),
      kind,
      jobId,
    });
  };

  const applyScheduleSaved = (saved: InteriorInstallation) => {
    setItems((current) =>
      current.map((row) => {
        if (row.id !== saved.leadId) return row;
        if (saved.kind === "delivery") {
          return {
            ...row,
            deliveryId: saved.id,
            deliveryDate: saved.installDate,
            deliveryEndDate: saved.installEndDate || saved.installDate,
          };
        }
        return {
          ...row,
          installId: saved.id,
          installDate: saved.installDate,
          installEndDate: saved.installEndDate || saved.installDate,
        };
      }),
    );
  };

  const applyScheduleDeleted = (leadId: number, kind: CalendarEntryKind) => {
    setItems((current) =>
      current.map((row) => {
        if (row.id !== leadId) return row;
        if (kind === "delivery") {
          return {
            ...row,
            deliveryId: null,
            deliveryDate: null,
            deliveryEndDate: null,
          };
        }
        return {
          ...row,
          installId: null,
          installDate: null,
          installEndDate: null,
        };
      }),
    );
  };

  const setActiveTab = (tab: LeadTab) => {
    setExpandedId(null);
    setExpandError("");
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "salon") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/admin/leads?${query}` : "/admin/leads");
  };

  const toggleExpandLead = async (leadId: number) => {
    if (expandedId === leadId) {
      setExpandedId(null);
      setExpandError("");
      return;
    }
    setExpandedId(leadId);
    setExpandError("");
    if (expandedItems[leadId]) return;

    setExpandLoadingId(leadId);
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; items?: LeadLineItem[] }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }
      const lines = Array.isArray(payload?.items) ? payload.items : [];
      setExpandedItems((current) => ({ ...current, [leadId]: lines }));
    } catch (caught) {
      setExpandError(
        caught instanceof Error ? caught.message : "Не удалось загрузить позиции",
      );
      setExpandedItems((current) => ({ ...current, [leadId]: [] }));
    } finally {
      setExpandLoadingId(null);
    }
  };

  const openCreateLead = () => {
    setCreateError("");
    setError("");
    setCreateForm(emptyCreateForm());
    setCreateOpen(true);
    void (async () => {
      try {
        const response = await fetch("/api/admin/leads/next-contract-number", {
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as {
          contractNumber?: string;
        } | null;
        const next = String(payload?.contractNumber || "").trim();
        if (!next) return;
        setCreateForm((current) =>
          current.contractNumber.trim() ? current : { ...current, contractNumber: next },
        );
      } catch {
        // User can type the number manually.
      }
    })();
  };

  const closeCreateLead = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateError("");
  };

  const handleCreateLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;

    const customerName = createForm.customerName.trim();
    const phone = createForm.phone.trim();
    const productName = createForm.productName.trim();
    const amountRaw = createForm.amount.replace(/\s/g, "").replace(",", ".");
    const amount = Number(amountRaw);

    if (customerName.length < 2) {
      setCreateError("Укажите ФИО (минимум 2 символа)");
      return;
    }
    if (phone.length < 2) {
      setCreateError("Укажите телефон");
      return;
    }
    if (!productName) {
      setCreateError("Укажите наименование");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setCreateError("Укажите корректную сумму");
      return;
    }

    setCreating(true);
    setCreateError("");
    setError("");
    try {
      if (activeTab !== "salon") {
        setActiveTab("salon");
      }
      setStatusFilter([]);
      setSearch("");
      setDebouncedSearch("");

      const response = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName,
          address: createForm.address.trim(),
          phone,
          contractNumber: createForm.contractNumber.trim(),
          contractDate: createForm.contractDate || null,
          items: [{ name: productName, price: Math.floor(amount), quantity: 1 }],
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; id?: number }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }

      const listParams = new URLSearchParams();
      listParams.set("type", "admin_order");
      listParams.set("hideEstimates", hideEstimates ? "1" : "0");
      const listResponse = await fetch(`/api/admin/leads?${listParams.toString()}`);
      if (!listResponse.ok) {
        const listPayload = await listResponse.json().catch(() => ({}));
        throw new Error(listPayload.message || "Заявка создана, но список не обновился");
      }
      const listPayload = (await listResponse.json()) as { items?: LeadListItem[] };
      setItems(Array.isArray(listPayload.items) ? listPayload.items : []);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm());
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Не удалось создать заявку");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("type", tabConfig.type);
    if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
    params.set("hideEstimates", hideEstimates ? "1" : "0");
    if (debouncedSearch) params.set("search", debouncedSearch);
    const response = await fetch(`/api/admin/leads?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявки");
    }
    const payload = (await response.json()) as { items?: LeadListItem[] };
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [statusFilter, hideEstimates, debouncedSearch, tabConfig.type]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await reload();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handlePatch = async (
    item: LeadListItem,
    patch: {
      status?: string;
      arrivalDate?: string | null;
      measureNote?: string;
      firstProductName?: string;
      invoiceNumber?: string;
    },
  ) => {
    setSavingId(item.id);
    setError("");
    const previous = item;
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, ...patch } : row)),
    );
    try {
      const response = await fetch(`/api/admin/leads/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить заявку");
      }
      const updated = (await response.json()) as LeadListItem;
      const nextProductName =
        updated.firstProductName ??
        updated.items?.[0]?.name ??
        patch.firstProductName ??
        item.firstProductName;
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                status: updated.status ?? row.status,
                arrivalDate: updated.arrivalDate !== undefined ? updated.arrivalDate : row.arrivalDate,
                measureNote: updated.measureNote !== undefined ? updated.measureNote : row.measureNote,
                invoiceNumber:
                  updated.invoiceNumber !== undefined ? updated.invoiceNumber : row.invoiceNumber,
                firstProductName:
                  nextProductName !== undefined ? nextProductName : row.firstProductName,
              }
            : row,
        ),
      );
    } catch (caught) {
      setItems((current) => current.map((row) => (row.id === item.id ? previous : row)));
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const showContractColumn = activeTab === "salon";
  const showProductNameColumn = activeTab === "salon" || activeTab === "website";
  const showAmountColumn = activeTab !== "measure";
  const showCommentColumn = activeTab === "website" || activeTab === "measure";
  const showScheduleColumns = activeTab === "salon";

  const tableColumns = useMemo(() => {
    const columns = ["Дата", "ФИО", "Адрес", "Телефон"];
    if (showContractColumn) columns.push("№ договора");
    if (showProductNameColumn) columns.push("Наименование товара");
    if (showCommentColumn) columns.push("Комментарий");
    if (showAmountColumn) columns.push("Сумма");
    columns.push("Статус", "Дата прихода", "Комментарии", "Замер");
    if (showScheduleColumns) columns.push("Доставка", "Монтаж");
    return columns;
  }, [showAmountColumn, showCommentColumn, showContractColumn, showProductNameColumn, showScheduleColumns]);

  const tableColSpan = tableColumns.length + 1;

  return (
    <AdminPage
      title="Заявки"
      description={tabConfig.description}
      className="max-w-none"
      actions={
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 text-lg leading-none"
          disabled={creating}
          title="Добавить заявку"
          aria-label="Добавить заявку"
          onClick={openCreateLead}
        >
          +
        </Button>
      }
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_CONFIG) as LeadTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition",
              activeTab === tab
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
            )}
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      <AdminCard contentClassName="p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-sm text-zinc-600" htmlFor="lead-search">
              Поиск
            </label>
            <input
              id="lead-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ФИО или № договора"
              className="w-full max-w-md rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={hideEstimates}
              onChange={(event) => setHideEstimates(event.target.checked)}
              className="size-4 rounded border-zinc-300"
            />
            Скрыть расчеты
          </label>
          <LeadStatusMultiFilter selected={statusFilter} onChange={setStatusFilter} />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            title={debouncedSearch ? "Ничего не найдено" : "Заявок пока нет"}
          />
        ) : (
          <AdminTable
            className="overflow-x-auto"
            tableClassName="w-full table-fixed text-xs leading-snug"
          >
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header className={cn(cellPad, "w-8")} />
                {tableColumns.map((column) => (
                  <AdminTableCell key={column} header className={cellHead}>
                    {column}
                  </AdminTableCell>
                ))}
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {items.map((item) => (
                <Fragment key={item.id}>
                <AdminTableRow>
                  <AdminTableCell className={cn(cellPad, "w-8 align-middle")}>
                    <button
                      type="button"
                      onClick={() => void toggleExpandLead(item.id)}
                      aria-expanded={expandedId === item.id}
                      aria-label={
                        expandedId === item.id ? "Свернуть позиции" : "Показать позиции"
                      }
                      title={expandedId === item.id ? "Свернуть" : "Позиции заявки"}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      {expandLoadingId === item.id ? "…" : expandedId === item.id ? "▾" : "▸"}
                    </button>
                  </AdminTableCell>
                  <AdminTableCell className={cn(cellPad, "whitespace-nowrap tabular-nums")}>
                    {formatDateTime(item.createdAt)}
                  </AdminTableCell>
                  <AdminTableCell className={cn(cellPad, "break-words")}>
                    {item.customerName}
                  </AdminTableCell>
                  <AdminTableCell className={cn(cellPad, "break-words")}>
                    {item.address?.trim() ? (
                      <button
                        type="button"
                        onClick={() => void copyLeadContact(item)}
                        title="Скопировать: адрес, телефон, ФИО"
                        className="line-clamp-3 max-w-full text-left text-xs text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                      >
                        {copiedLeadId === item.id ? "Скопировано" : item.address.trim()}
                      </button>
                    ) : (
                      "—"
                    )}
                  </AdminTableCell>
                  <AdminTableCell className={cn(cellPad, "break-all tabular-nums")}>
                    {item.phone}
                  </AdminTableCell>
                  {showContractColumn ? (
                    <AdminTableCell className={cn(cellPad, "break-all")}>
                      {item.contractNumber ? (
                        <Link
                          href={`/admin/leads/${item.id}`}
                          className="text-xs text-brand underline underline-offset-2 hover:opacity-80"
                        >
                          {item.contractNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </AdminTableCell>
                  ) : null}
                  {showProductNameColumn ? (
                    <AdminTableCell className={cellPad}>
                      {item.firstProductItemId ? (
                        <LeadProductNameInput
                          value={item.firstProductName || ""}
                          disabled={savingId === item.id}
                          onSave={(firstProductName) =>
                            void handlePatch(item, { firstProductName })
                          }
                        />
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </AdminTableCell>
                  ) : null}
                  {showCommentColumn ? (
                    <AdminTableCell className={cn(cellPad, "break-words")}>
                      {truncateText(item.clientComment, 60) || "—"}
                    </AdminTableCell>
                  ) : null}
                  {showAmountColumn ? (
                    <AdminTableCell className={cn(cellPad, "whitespace-nowrap font-medium tabular-nums")}>
                      {formatPrice(item.totalPrice)}
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell
                    className={cellPad}
                    style={{
                      backgroundColor: (LEAD_STATUS_COLORS[item.status] || LEAD_STATUS_COLORS.not_issued)
                        .background,
                    }}
                  >
                    <LeadStatusSelect
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(status) => void handlePatch(item, { status })}
                      className="min-w-0 w-full px-1 py-1 text-[11px]"
                    />
                  </AdminTableCell>
                  <AdminTableCell className={cellPad}>
                    <input
                      type="date"
                      value={item.arrivalDate || ""}
                      disabled={savingId === item.id}
                      onChange={(event) =>
                        void handlePatch(item, { arrivalDate: event.target.value || null })
                      }
                      className="h-7 w-full min-w-0 rounded border border-zinc-200 bg-white px-1 text-xs disabled:bg-zinc-50"
                      aria-label="Дата прихода"
                    />
                  </AdminTableCell>
                  <AdminTableCell className={cellPad}>
                    <LeadInvoiceNumberInput
                      value={item.invoiceNumber || ""}
                      disabled={savingId === item.id}
                      onSave={(invoiceNumber) => void handlePatch(item, { invoiceNumber })}
                    />
                  </AdminTableCell>
                  <AdminTableCell className={cellPad}>
                    {item.status === "measure" ? (
                      <LeadMeasureNoteInput
                        value={item.measureNote || ""}
                        disabled={savingId === item.id}
                        onSave={(measureNote) => void handlePatch(item, { measureNote })}
                      />
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </AdminTableCell>
                  {showScheduleColumns ? (
                    <>
                      <AdminTableCell className={cn(cellPad, "break-words")}>
                        <LeadScheduleCell
                          from={item.deliveryDate}
                          to={item.deliveryEndDate}
                          kind="delivery"
                          disabled={savingId === item.id}
                          onAdd={() => openSchedulePanel(item, "delivery", null)}
                          onEdit={() =>
                            openSchedulePanel(item, "delivery", item.deliveryId ?? null)
                          }
                        />
                      </AdminTableCell>
                      <AdminTableCell className={cn(cellPad, "break-words")}>
                        <LeadScheduleCell
                          from={item.installDate}
                          to={item.installEndDate}
                          kind="install"
                          disabled={savingId === item.id}
                          onAdd={() => openSchedulePanel(item, "install", null)}
                          onEdit={() => openSchedulePanel(item, "install", item.installId ?? null)}
                        />
                      </AdminTableCell>
                    </>
                  ) : null}
                </AdminTableRow>
                {expandedId === item.id ? (
                  <AdminTableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <AdminTableCell colSpan={tableColSpan} className="px-3 py-3">
                      {expandLoadingId === item.id ? (
                        <p className="text-sm text-zinc-500">Загрузка позиций…</p>
                      ) : expandError ? (
                        <p className="text-sm text-red-600">{expandError}</p>
                      ) : (expandedItems[item.id] || []).length === 0 ? (
                        <p className="text-sm text-zinc-500">В заявке нет позиций</p>
                      ) : (
                        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Наименование</th>
                                <th className="px-3 py-2 font-semibold">Артикул</th>
                                <th className="px-3 py-2 font-semibold">Цвет</th>
                                <th className="px-3 py-2 font-semibold text-right">Цена</th>
                                <th className="px-3 py-2 font-semibold text-right">Кол-во</th>
                                <th className="px-3 py-2 font-semibold text-right">Сумма</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {(expandedItems[item.id] || []).map((line) => (
                                <tr key={line.id}>
                                  <td className="px-3 py-2 break-words text-zinc-900">
                                    {line.name || "—"}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600">
                                    {line.sku || "—"}
                                  </td>
                                  <td className="px-3 py-2 break-words text-zinc-600">
                                    {line.color || "—"}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">
                                    {formatPrice(line.price)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums">
                                    {line.quantity}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right font-medium tabular-nums">
                                    {formatPrice(line.price * line.quantity)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                ) : null}
                </Fragment>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>

      {schedulePanel ? (
        <LeadScheduleSidePanel
          open
          leadId={schedulePanel.leadId}
          leadLabel={schedulePanel.leadLabel}
          kind={schedulePanel.kind}
          jobId={schedulePanel.jobId}
          onClose={() => setSchedulePanel(null)}
          onSaved={applyScheduleSaved}
          onDeleted={(jobId) => {
            applyScheduleDeleted(schedulePanel.leadId, schedulePanel.kind);
            if (schedulePanel.jobId === jobId) {
              setSchedulePanel(null);
            }
          }}
        />
      ) : null}

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-lead-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateLead();
          }}
        >
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="create-lead-title" className="text-lg font-semibold text-zinc-900">
                Новая заявка
              </h2>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                disabled={creating}
                onClick={closeCreateLead}
              >
                Закрыть
              </button>
            </div>

            {createError ? (
              <div className="mb-3">
                <AdminNotice variant="error">{createError}</AdminNotice>
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={(event) => void handleCreateLead(event)}>
              <AdminInputField
                id="create-lead-date"
                label="Дата"
                type="date"
                required
                value={createForm.contractDate}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, contractDate: event.target.value }))
                }
              />
              <AdminInputField
                id="create-lead-name"
                label="ФИО"
                required
                autoComplete="name"
                value={createForm.customerName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, customerName: event.target.value }))
                }
              />
              <AdminInputField
                id="create-lead-address"
                label="Адрес"
                autoComplete="street-address"
                value={createForm.address}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, address: event.target.value }))
                }
              />
              <AdminInputField
                id="create-lead-phone"
                label="Телефон"
                required
                autoComplete="tel"
                value={createForm.phone}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <AdminInputField
                id="create-lead-contract"
                label="Номер договора"
                value={createForm.contractNumber}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    contractNumber: event.target.value,
                  }))
                }
              />
              <AdminInputField
                id="create-lead-product"
                label="Наименование"
                required
                value={createForm.productName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, productName: event.target.value }))
                }
              />
              <AdminInputField
                id="create-lead-amount"
                label="Сумма"
                required
                inputMode="decimal"
                placeholder="0"
                value={createForm.amount}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" disabled={creating} onClick={closeCreateLead}>
                  Отмена
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Создание…" : "Создать"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
