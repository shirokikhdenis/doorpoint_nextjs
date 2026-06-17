"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
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
  createdAt: string;
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

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Завершена",
  cancelled: "Отменена",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-600",
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

const truncateText = (value: string, max = 80) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const parseTab = (value: string | null): LeadTab => {
  if (value === "website" || value === "measure") return value;
  return "salon";
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const tabConfig = TAB_CONFIG[activeTab];

  const [items, setItems] = useState<LeadListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("type", tabConfig.type);
    if (statusFilter) params.set("status", statusFilter);
    const response = await fetch(`/api/admin/leads?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявки");
    }
    const payload = (await response.json()) as { items?: LeadListItem[] };
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [statusFilter, tabConfig.type]);

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

  const handleDelete = async (item: LeadListItem) => {
    setDeletingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/leads/${item.id}`, { method: "DELETE" });
      if (response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось удалить заявку");
      }
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  const showContractColumn = activeTab === "salon";
  const showAmountColumn = activeTab !== "measure";
  const showCommentColumn = activeTab === "website" || activeTab === "measure";

  const tableColumns = useMemo(() => {
    const columns = ["Дата", "ФИО", "Телефон"];
    if (showContractColumn) columns.push("№ договора");
    if (showCommentColumn) columns.push("Комментарий");
    if (showAmountColumn) columns.push("Сумма");
    columns.push("Статус");
    return columns;
  }, [showAmountColumn, showCommentColumn, showContractColumn]);

  return (
    <AdminPage title="Заявки" description={tabConfig.description}>
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
        <div className="mb-4 max-w-xs">
          <AdminSelectField
            id="lead-status-filter"
            label="Статус"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Все</option>
            <option value="new">Новые</option>
            <option value="in_progress">В работе</option>
            <option value="done">Завершённые</option>
            <option value="cancelled">Отменённые</option>
          </AdminSelectField>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState title="Заявок пока нет" />
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
                  <AdminTableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_BADGE[item.status] || STATUS_BADGE.cancelled,
                      )}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/leads/${item.id}`}>Открыть</Link>
                      </Button>
                      <AdminConfirmButton
                        confirmMessage={`Удалить заявку «${item.customerName || `№${item.id}`}»? Действие нельзя отменить.`}
                        disabled={deletingId === item.id}
                        onConfirm={() => handleDelete(item)}
                      >
                        {deletingId === item.id ? "Удаление…" : "Удалить"}
                      </AdminConfirmButton>
                    </div>
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
