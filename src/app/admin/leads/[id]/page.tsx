"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatCartItemName } from "@/lib/client/cart-item-name";
import { formatPrice } from "@/lib/client/format";
import { computeLeadTotals, type DiscountKind } from "@/lib/client/lead-pricing";

type LeadItem = {
  id: number;
  name: string;
  sku: string;
  color: string;
  price: number;
  quantity: number;
};

type ItemDraft = {
  id: number;
  price: string;
  quantity: string;
};

type LeadDetail = {
  id: number;
  customerName: string;
  address: string;
  phone: string;
  contractNumber: string;
  contractDate: string | null;
  totalPrice: number;
  subtotalPrice: number;
  discountAmount: number;
  discountKind: DiscountKind;
  discountValue: number;
  status: string;
  managerNotes: string;
  createdAt: string;
  updatedAt: string;
  items: LeadItem[];
};

const STATUS_OPTIONS = [
  { value: "new", label: "Новая" },
  { value: "in_progress", label: "В работе" },
  { value: "done", label: "Завершена" },
  { value: "cancelled", label: "Отменена" },
];

const DISCOUNT_OPTIONS: { value: DiscountKind; label: string }[] = [
  { value: "none", label: "Без скидки" },
  { value: "percent", label: "Процент от суммы" },
  { value: "amount", label: "Сумма в ₽" },
];

const formatDate = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ru-RU");
  } catch {
    return value;
  }
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch {
    return value;
  }
};

const toItemDrafts = (items: LeadItem[]): ItemDraft[] =>
  items.map((item) => ({
    id: item.id,
    price: String(item.price),
    quantity: String(item.quantity),
  }));

const parseDraftItems = (items: LeadItem[], drafts: ItemDraft[]) =>
  drafts.map((draft, index) => {
    const price = Number(draft.price);
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Позиция ${index + 1}: некорректная цена`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Позиция ${index + 1}: количество должно быть не меньше 1`);
    }
    return {
      id: draft.id,
      price: Math.floor(price),
      quantity,
      name: items[index]?.name || "",
      sku: items[index]?.sku || "",
      color: items[index]?.color || "",
    };
  });

export default function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [leadId, setLeadId] = useState<number | null>(null);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [status, setStatus] = useState("new");
  const [managerNotes, setManagerNotes] = useState("");
  const [discountKind, setDiscountKind] = useState<DiscountKind>("none");
  const [discountValue, setDiscountValue] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await params;
      const numericId = Number(resolved.id);
      if (!cancelled) setLeadId(numericId);
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const applyLead = useCallback((payload: LeadDetail) => {
    setLead(payload);
    setItemDrafts(toItemDrafts(payload.items));
    setStatus(payload.status);
    setManagerNotes(payload.managerNotes || "");
    setDiscountKind(payload.discountKind || "none");
    setDiscountValue(String(payload.discountValue || 0));
  }, []);

  const reload = useCallback(async () => {
    if (!leadId) return;
    const response = await fetch(`/api/admin/leads/${leadId}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить заявку");
    }
    applyLead((await response.json()) as LeadDetail);
  }, [leadId, applyLead]);

  useEffect(() => {
    if (!leadId) return;
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
  }, [leadId, reload]);

  const previewItems = useMemo(() => {
    if (!lead) return [];
    try {
      return parseDraftItems(lead.items, itemDrafts);
    } catch {
      return lead.items;
    }
  }, [lead, itemDrafts]);

  const previewTotals = useMemo(() => {
    const discountNumeric = Number(discountValue) || 0;
    return computeLeadTotals(previewItems, discountKind, discountNumeric);
  }, [previewItems, discountKind, discountValue]);

  const updateItemDraft = (id: number, field: "price" | "quantity", value: string) => {
    setItemDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!leadId || !lead || saving) return;

    setSaving(true);
    setNotice("");
    setError("");

    try {
      const items = parseDraftItems(lead.items, itemDrafts).map((item) => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
      }));
      const discountNumeric = Number(discountValue) || 0;
      if (discountKind === "percent" && discountNumeric > 100) {
        throw new Error("Скидка не может быть больше 100%");
      }

      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          managerNotes,
          discountKind,
          discountValue: discountKind === "none" ? 0 : Math.floor(discountNumeric),
          items,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Не удалось сохранить");
      }
      applyLead(payload as LeadDetail);
      setNotice("Изменения сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!leadId || deleting) return;
    const label = lead?.customerName || `№${leadId}`;
    if (!window.confirm(`Удалить заявку «${label}»? Действие нельзя отменить.`)) return;

    setDeleting(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось удалить заявку");
      }
      router.replace("/admin/leads");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <p className="text-zinc-600">Загрузка…</p>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <p className="text-rose-700">{error || "Заявка не найдена"}</p>
        <Link href="/admin/leads" className="mt-3 inline-block text-sm underline">
          ← К списку заявок
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Заявка №{lead.id}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Создана {formatDateTime(lead.createdAt)}
            {lead.updatedAt !== lead.createdAt ? ` · обновлена ${formatDateTime(lead.updatedAt)}` : ""}
          </p>
        </div>
        <Link href="/admin/leads" className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100">
          ← К списку
        </Link>
        <a
          href={`/api/admin/leads/${lead.id}/contract`}
          className="rounded border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
        >
          Скачать договор (.docx)
        </a>
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={deleting}
          className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          {deleting ? "Удаление…" : "Удалить"}
        </button>
      </div>

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="font-medium">Клиент</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">ФИО</dt>
            <dd>{lead.customerName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Телефон</dt>
            <dd>{lead.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Адрес</dt>
            <dd>{lead.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">№ договора</dt>
            <dd>{lead.contractNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Дата договора</dt>
            <dd>{formatDate(lead.contractDate)}</dd>
          </div>
        </dl>
      </section>

      <form onSubmit={(event) => void onSave(event)} className="mt-6 space-y-6">
        <section className="overflow-x-auto rounded border bg-white">
          <h2 className="border-b px-4 py-3 font-medium">Позиции</h2>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Наименование</th>
                <th className="px-4 py-2 font-medium">Артикул</th>
                <th className="w-28 px-4 py-2 font-medium">Цена, ₽</th>
                <th className="w-24 px-4 py-2 font-medium">Кол-во</th>
                <th className="px-4 py-2 text-right font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lead.items.map((item, index) => {
                const draft = itemDrafts[index];
                const price = Number(draft?.price) || 0;
                const quantity = Number(draft?.quantity) || 0;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{formatCartItemName(item.name, item.color)}</p>
                    </td>
                    <td className="px-4 py-3">{item.sku || "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={draft?.price ?? ""}
                        onChange={(event) => updateItemDraft(item.id, "price", event.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={draft?.quantity ?? ""}
                        onChange={(event) => updateItemDraft(item.id, "quantity", event.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatPrice(price * quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="space-y-3 border-t px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-zinc-700">Скидка на договор</span>
              <select
                className="rounded border px-3 py-1.5 text-sm"
                value={discountKind}
                onChange={(event) => {
                  const next = event.target.value as DiscountKind;
                  setDiscountKind(next);
                  if (next === "none") setDiscountValue("0");
                }}
                disabled={saving}
              >
                {DISCOUNT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {discountKind !== "none" ? (
                <input
                  type="number"
                  min={0}
                  max={discountKind === "percent" ? 100 : undefined}
                  step={1}
                  className="w-28 rounded border px-2 py-1.5 text-sm"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  disabled={saving}
                />
              ) : null}
              {discountKind === "percent" ? (
                <span className="text-sm text-zinc-500">%</span>
              ) : null}
              {discountKind === "amount" ? (
                <span className="text-sm text-zinc-500">₽</span>
              ) : null}
            </div>

            <div className="space-y-1 text-right text-sm">
              <div className="text-zinc-600">
                Подытог: <span className="font-medium text-zinc-900">{formatPrice(previewTotals.subtotal)}</span>
              </div>
              {previewTotals.discountAmount > 0 ? (
                <div className="text-rose-700">
                  Скидка:{" "}
                  <span className="font-medium">−{formatPrice(previewTotals.discountAmount)}</span>
                </div>
              ) : null}
              <div className="text-base font-semibold">
                Итого: {formatPrice(previewTotals.total)}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded border bg-white p-4">
          <h2 className="font-medium">Управление</h2>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600" htmlFor="lead-status">
              Статус
            </label>
            <select
              id="lead-status"
              className="w-full max-w-xs rounded border px-3 py-2 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={saving}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600" htmlFor="lead-notes">
              Заметки менеджера
            </label>
            <textarea
              id="lead-notes"
              className="min-h-24 w-full rounded border px-3 py-2 text-sm"
              value={managerNotes}
              onChange={(event) => setManagerNotes(event.target.value)}
              disabled={saving}
            />
          </div>
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </section>
      </form>
    </main>
  );
}
