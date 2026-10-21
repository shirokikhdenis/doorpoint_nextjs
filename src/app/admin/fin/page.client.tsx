"use client";

import Link from "next/link";
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
import { formatPrice } from "@/lib/client/format";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, LEAD_STATUS_OPTIONS } from "@/lib/client/lead-status";
import { cn } from "@/lib/utils";

type LeadTypeFilter = "all" | "admin_order" | "cart_lead";

type FinanceLead = {
  id: number;
  type: string;
  customerName: string;
  phone: string;
  contractNumber: string;
  contractDate: string | null;
  totalPrice: number;
  purchaseCost: number;
  status: string;
  firstProductName?: string;
  createdAt: string;
};

type MonthSummary = {
  month: string;
  leadsCount: number;
  revenue: number;
  purchaseCost: number;
  profit: number;
};

type YearTotals = {
  leadsCount: number;
  revenue: number;
  purchaseCost: number;
  profit: number;
};

const TYPE_LABELS: Record<string, string> = {
  admin_order: "Салон",
  cart_lead: "Сайт",
};

const MONTH_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const formatMonthLabel = (monthKey: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const monthIndex = Number(match[2]) - 1;
  const label = MONTH_LABELS[monthIndex] || match[2];
  return `${label} ${match[1]}`;
};

const formatShortDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const leadDate = (item: FinanceLead) => item.contractDate || item.createdAt;

const leadMonthKey = (item: FinanceLead) => {
  const raw = String(leadDate(item) || "");
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly.slice(0, 7);
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

function PurchaseCostInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value || ""));

  useEffect(() => {
    setDraft(String(value || ""));
  }, [value]);

  const commit = () => {
    const parsed = Math.floor(Number(String(draft).replace(/\s/g, "").replace(",", ".")));
    const next = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setDraft(String(next));
    if (next !== value) onSave(next);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="h-8 w-[8.5rem] rounded border border-zinc-200 bg-white px-2 text-right text-sm tabular-nums disabled:bg-zinc-50"
      aria-label="Сумма закупа"
      placeholder="0"
    />
  );
}

export default function AdminFinPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<LeadTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [totals, setTotals] = useState<YearTotals>({
    leadsCount: 0,
    revenue: 0,
    purchaseCost: 0,
    profit: 0,
  });
  const [items, setItems] = useState<FinanceLead[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 6; y -= 1) years.push(y);
    return years;
  }, [currentYear]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const typeQuery = typeFilter === "all" ? "" : typeFilter;

  const reloadSummary = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (typeQuery) params.set("type", typeQuery);
    const response = await fetch(`/api/admin/fin/summary?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить сводку");
    }
    const payload = (await response.json()) as {
      months?: MonthSummary[];
      totals?: YearTotals;
    };
    setMonths(Array.isArray(payload.months) ? payload.months : []);
    setTotals(
      payload.totals || {
        leadsCount: 0,
        revenue: 0,
        purchaseCost: 0,
        profit: 0,
      },
    );
  }, [year, typeQuery]);

  const reloadLeads = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("limit", "300");
    if (typeQuery) params.set("type", typeQuery);
    if (selectedMonth) params.set("month", selectedMonth);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const response = await fetch(`/api/admin/fin/leads?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявки");
    }
    const payload = (await response.json()) as { items?: FinanceLead[] };
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [year, typeQuery, selectedMonth, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSummary(true);
      setError("");
      try {
        await reloadSummary();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки сводки");
        }
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSummary]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingLeads(true);
      setError("");
      try {
        await reloadLeads();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки заявок");
        }
      } finally {
        if (!cancelled) setLoadingLeads(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadLeads]);

  const handlePurchaseCostSave = async (item: FinanceLead, purchaseCost: number) => {
    setSavingId(item.id);
    setError("");
    const previous = item;
    const previousProfit = item.totalPrice - item.purchaseCost;
    const nextProfit = item.totalPrice - purchaseCost;
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, purchaseCost } : row)),
    );
    setMonths((current) =>
      current.map((row) => {
        if (row.month !== leadMonthKey(item)) return row;
        return {
          ...row,
          purchaseCost: row.purchaseCost - previous.purchaseCost + purchaseCost,
          profit: row.profit - previousProfit + nextProfit,
        };
      }),
    );
    setTotals((current) => ({
      ...current,
      purchaseCost: current.purchaseCost - previous.purchaseCost + purchaseCost,
      profit: current.profit - previousProfit + nextProfit,
    }));
    try {
      const response = await fetch(`/api/admin/leads/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purchaseCost }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить закуп");
      }
      const updated = (await response.json()) as FinanceLead;
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                purchaseCost:
                  updated.purchaseCost !== undefined ? Number(updated.purchaseCost) || 0 : purchaseCost,
              }
            : row,
        ),
      );
    } catch (caught) {
      setItems((current) => current.map((row) => (row.id === item.id ? previous : row)));
      void reloadSummary().catch(() => undefined);
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const monthsByKey = useMemo(() => {
    const map = new Map(months.map((row) => [row.month, row]));
    return map;
  }, [months]);

  const calendarMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      return (
        monthsByKey.get(key) || {
          month: key,
          leadsCount: 0,
          revenue: 0,
          purchaseCost: 0,
          profit: 0,
        }
      );
    });
  }, [year, monthsByKey]);

  return (
    <AdminPage
      title="Финучёт"
      description="Только заявки со статусами: оформлена, в пути, на складе, отгружена. Прибыль = сумма договора − сумма закупа."
      className="max-w-none"
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-36">
          <AdminSelectField
            id="fin-year"
            label="Год"
            value={String(year)}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setSelectedMonth("");
            }}
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </AdminSelectField>
        </div>
        <div className="w-44">
          <AdminSelectField
            id="fin-type"
            label="Источник"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as LeadTypeFilter)}
          >
            <option value="all">Все с суммой</option>
            <option value="admin_order">Салон</option>
            <option value="cart_lead">Сайт</option>
          </AdminSelectField>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Заявок за год</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {loadingSummary ? "…" : totals.leadsCount.toLocaleString("ru-RU")}
          </p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Выручка</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {loadingSummary ? "…" : formatPrice(totals.revenue)}
          </p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Закуп</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {loadingSummary ? "…" : formatPrice(totals.purchaseCost)}
          </p>
        </AdminCard>
        <AdminCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Прибыль</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tabular-nums",
              !loadingSummary && totals.profit < 0 ? "text-rose-700" : "text-emerald-700",
            )}
          >
            {loadingSummary ? "…" : formatPrice(totals.profit)}
          </p>
        </AdminCard>
      </div>

      <AdminCard className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900">По месяцам — {year}</h2>
          {selectedMonth ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMonth("")}>
              Показать все месяцы
            </Button>
          ) : null}
        </div>
        {loadingSummary ? (
          <p className="py-6 text-center text-sm text-zinc-500">Загрузка сводки…</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Месяц</AdminTableCell>
                <AdminTableCell header>Заявок</AdminTableCell>
                <AdminTableCell header>Выручка</AdminTableCell>
                <AdminTableCell header>Закуп</AdminTableCell>
                <AdminTableCell header>Прибыль</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {calendarMonths.map((row) => {
                const active = selectedMonth === row.month;
                const empty = row.leadsCount === 0;
                return (
                  <AdminTableRow
                    key={row.month}
                    className={cn(
                      "cursor-pointer",
                      active && "bg-sky-50",
                      empty && "text-zinc-400",
                    )}
                    onClick={() => setSelectedMonth(active ? "" : row.month)}
                  >
                    <AdminTableCell className="font-medium">{formatMonthLabel(row.month)}</AdminTableCell>
                    <AdminTableCell className="tabular-nums">{row.leadsCount || "—"}</AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap tabular-nums">
                      {row.leadsCount ? formatPrice(row.revenue) : "—"}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap tabular-nums">
                      {row.leadsCount ? formatPrice(row.purchaseCost) : "—"}
                    </AdminTableCell>
                    <AdminTableCell
                      className={cn(
                        "whitespace-nowrap font-medium tabular-nums",
                        row.leadsCount && row.profit < 0 ? "text-rose-700" : "",
                        row.leadsCount && row.profit > 0 ? "text-emerald-700" : "",
                      )}
                    >
                      {row.leadsCount ? formatPrice(row.profit) : "—"}
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-sm text-zinc-600" htmlFor="fin-search">
              Поиск
            </label>
            <input
              id="fin-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ФИО, телефон или № договора"
              className="w-full max-w-md rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <p className="self-end pb-2 text-sm text-zinc-500">
            {selectedMonth
              ? `Заявки: ${formatMonthLabel(selectedMonth)}`
              : `Заявки за ${year} год`}
          </p>
        </div>

        {loadingLeads ? (
          <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            title={debouncedSearch || selectedMonth ? "Ничего не найдено" : "Заявок пока нет"}
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Дата</AdminTableCell>
                <AdminTableCell header>Источник</AdminTableCell>
                <AdminTableCell header>ФИО</AdminTableCell>
                <AdminTableCell header>№ договора</AdminTableCell>
                <AdminTableCell header>Товар</AdminTableCell>
                <AdminTableCell header>Сумма договора</AdminTableCell>
                <AdminTableCell header>Закуп</AdminTableCell>
                <AdminTableCell header>Прибыль</AdminTableCell>
                <AdminTableCell header>Статус</AdminTableCell>
                <AdminTableCell header />
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {items.map((item) => {
                const profit = item.totalPrice - item.purchaseCost;
                const statusMeta = LEAD_STATUS_COLORS[item.status] || LEAD_STATUS_COLORS.not_issued;
                return (
                  <AdminTableRow key={item.id}>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatShortDate(leadDate(item))}
                    </AdminTableCell>
                    <AdminTableCell>{TYPE_LABELS[item.type] || item.type}</AdminTableCell>
                    <AdminTableCell>{item.customerName}</AdminTableCell>
                    <AdminTableCell>
                      {item.contractNumber ? (
                        <Link
                          href={`/admin/leads/${item.id}`}
                          className="text-sm text-brand underline underline-offset-2 hover:opacity-80"
                        >
                          {item.contractNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="max-w-[14rem] truncate">
                      {item.firstProductName || "—"}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap font-medium tabular-nums">
                      {formatPrice(item.totalPrice)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <PurchaseCostInput
                        value={item.purchaseCost}
                        disabled={savingId === item.id}
                        onSave={(purchaseCost) => void handlePurchaseCostSave(item, purchaseCost)}
                      />
                    </AdminTableCell>
                    <AdminTableCell
                      className={cn(
                        "whitespace-nowrap font-medium tabular-nums",
                        profit < 0 ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {formatPrice(profit)}
                    </AdminTableCell>
                    <AdminTableCell style={{ backgroundColor: statusMeta.background }}>
                      <span className="text-sm" style={{ color: statusMeta.color }}>
                        {LEAD_STATUS_LABELS[item.status] ||
                          LEAD_STATUS_OPTIONS.find((option) => option.value === item.status)?.label ||
                          item.status}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/leads/${item.id}`}>Открыть</Link>
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>
    </AdminPage>
  );
}
