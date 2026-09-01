"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminSelectField } from "@/features/admin/ui/admin-form-field";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { LeadStatusSelect } from "@/features/admin/leads/lead-status-select";
import { formatUpcomingDateLabel } from "@/features/admin/install-calendar/calendar-utils";
import { formatPrice } from "@/lib/client/format";
import { LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS } from "@/lib/client/lead-status";
import { cn } from "@/lib/utils";

type LeadTab = "salon" | "website" | "measure";

type LeadListItem = {
  id: number;
  customerName: string;
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
  createdAt: string;
  installDate?: string | null;
  installEndDate?: string | null;
  deliveryDate?: string | null;
  deliveryEndDate?: string | null;
  items?: Array<{ name?: string }>;
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const formatScheduleDate = (from?: string | null, to?: string | null) => {
  if (!from) return "—";
  return formatUpcomingDateLabel(from, to || from) || "—";
};

const truncateText = (value: string, max = 80) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const parseTab = (value: string | null): LeadTab => {
  if (value === "website" || value === "measure") return value;
  return "salon";
};

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
      className="h-8 w-[14rem] max-w-[20vw] rounded border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-50"
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
      className="h-8 w-[9rem] rounded border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-50"
      aria-label="Номер счёта"
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
      className="h-8 w-[11rem] rounded border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-50"
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
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const setActiveTab = (tab: LeadTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "salon") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/admin/leads?${query}` : "/admin/leads");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("type", tabConfig.type);
    if (statusFilter) params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const response = await fetch(`/api/admin/leads?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявки");
    }
    const payload = (await response.json()) as { items?: LeadListItem[] };
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [statusFilter, debouncedSearch, tabConfig.type]);

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
    const columns = ["Дата", "ФИО", "Телефон"];
    if (showContractColumn) columns.push("№ договора");
    if (showProductNameColumn) columns.push("Наименование товара");
    if (showCommentColumn) columns.push("Комментарий");
    if (showAmountColumn) columns.push("Сумма");
    columns.push("Статус", "Дата прихода", "Номер счёта", "Замер");
    if (showScheduleColumns) columns.push("Монтаж", "Доставка");
    return columns;
  }, [showAmountColumn, showCommentColumn, showContractColumn, showProductNameColumn, showScheduleColumns]);

  return (
    <AdminPage title="Заявки" description={tabConfig.description} className="max-w-none">
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

      <AdminCard>
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
          <div className="max-w-xs">
            <AdminSelectField
              id="lead-status-filter"
              label="Статус"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Все</option>
              {LEAD_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AdminSelectField>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            title={debouncedSearch ? "Ничего не найдено" : "Заявок пока нет"}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                {tableColumns.map((column) => (
                  <AdminTableCell key={column} header>
                    {column}
                  </AdminTableCell>
                ))}
                <AdminTableCell header />
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {items.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell className="whitespace-nowrap">
                    {formatDateTime(item.createdAt)}
                  </AdminTableCell>
                  <AdminTableCell>{item.customerName}</AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap">{item.phone}</AdminTableCell>
                  {showContractColumn ? (
                    <AdminTableCell>{item.contractNumber || "—"}</AdminTableCell>
                  ) : null}
                  {showProductNameColumn ? (
                    <AdminTableCell>
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
                    <AdminTableCell className="max-w-xs">
                      {truncateText(item.clientComment) || "—"}
                    </AdminTableCell>
                  ) : null}
                  {showAmountColumn ? (
                    <AdminTableCell className="whitespace-nowrap font-medium">
                      {formatPrice(item.totalPrice)}
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell
                    style={{
                      backgroundColor: (LEAD_STATUS_COLORS[item.status] || LEAD_STATUS_COLORS.not_issued)
                        .background,
                    }}
                  >
                    <LeadStatusSelect
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(status) => void handlePatch(item, { status })}
                    />
                  </AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap">
                    {item.status === "in_transit" ? (
                      <input
                        type="date"
                        value={item.arrivalDate || ""}
                        disabled={savingId === item.id}
                        onChange={(event) =>
                          void handlePatch(item, { arrivalDate: event.target.value || null })
                        }
                        className="h-8 w-[10.5rem] rounded border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-50"
                        aria-label="Дата прихода"
                      />
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <LeadInvoiceNumberInput
                      value={item.invoiceNumber || ""}
                      disabled={savingId === item.id}
                      onSave={(invoiceNumber) => void handlePatch(item, { invoiceNumber })}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
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
                      <AdminTableCell className="whitespace-nowrap">
                        {formatScheduleDate(item.installDate, item.installEndDate)}
                      </AdminTableCell>
                      <AdminTableCell className="whitespace-nowrap">
                        {formatScheduleDate(item.deliveryDate, item.deliveryEndDate)}
                      </AdminTableCell>
                    </>
                  ) : null}
                  <AdminTableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/leads/${item.id}`}>Открыть</Link>
                    </Button>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>
    </AdminPage>
  );
}
