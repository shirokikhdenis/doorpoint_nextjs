"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/client/format";

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
    const label = item.customerName || `№${item.id}`;
    if (!window.confirm(`Удалить заявку «${label}»? Действие нельзя отменить.`)) return;

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
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Заявки</h1>
          <p className="mt-1 text-sm text-zinc-600">Заявки, созданные администратором из корзины.</p>
        </div>
        <Link href="/admin" className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100">
          ← Admin
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-zinc-600" htmlFor="lead-status-filter">
          Статус:
        </label>
        <select
          id="lead-status-filter"
          className="rounded border px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Все</option>
          <option value="new">Новые</option>
          <option value="in_progress">В работе</option>
          <option value="done">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded border bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Дата</th>
              <th className="px-4 py-2 font-medium">ФИО</th>
              <th className="px-4 py-2 font-medium">Телефон</th>
              <th className="px-4 py-2 font-medium">№ договора</th>
              <th className="px-4 py-2 font-medium">Сумма</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Загрузка…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Заявок пока нет.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/60">
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">{item.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.contractNumber || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatPrice(item.totalPrice)}</td>
                  <td className="px-4 py-3">{STATUS_LABELS[item.status] || item.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/leads/${item.id}`} className="text-sm underline">
                        Открыть
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="text-sm text-rose-700 hover:underline disabled:opacity-60"
                      >
                        {deletingId === item.id ? "Удаление…" : "Удалить"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
