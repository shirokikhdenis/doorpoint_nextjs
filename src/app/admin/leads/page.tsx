"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type LeadListItem = {
  id: number;
  customerName: string;
  phone: string;
  contractNumber: string;
  contractDate: string | null;
  totalPrice: number;
  status: string;
  createdAt: string;
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

export default function AdminLeadsPage() {
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const response = await fetch(`/api/admin/leads?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявки");
    }
    const payload = (await response.json()) as { items?: LeadListItem[] };
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [statusFilter]);

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

  return (
    <AdminPage
      title="Заявки"
      description="Заявки, созданные администратором из корзины."
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

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
                <AdminTableCell header>Дата</AdminTableCell>
                <AdminTableCell header>ФИО</AdminTableCell>
                <AdminTableCell header>Телефон</AdminTableCell>
                <AdminTableCell header>№ договора</AdminTableCell>
                <AdminTableCell header>Сумма</AdminTableCell>
                <AdminTableCell header>Статус</AdminTableCell>
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
                  <AdminTableCell>{item.contractNumber || "—"}</AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap font-medium">
                    {formatPrice(item.totalPrice)}
                  </AdminTableCell>
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
