"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { formatCartItemName } from "@/lib/client/cart-item-name";
import { formatPrice } from "@/lib/client/format";
import { computeLeadTotals, type DiscountKind } from "@/lib/client/lead-pricing";
import { cn } from "@/lib/utils";

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
  type: string;
  customerName: string;
  address: string;
  phone: string;
  contractNumber: string;
  contractDate: string | null;
  clientComment: string;
  sourcePage: string;
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

const LEAD_TYPE_LABELS: Record<string, string> = {
  admin_order: "Салон",
  cart_lead: "С сайта",
  measure_lead: "Замер",
};

const LEAD_TYPE_BADGE: Record<string, string> = {
  admin_order: "bg-violet-100 text-violet-800",
  cart_lead: "bg-sky-100 text-sky-800",
  measure_lead: "bg-emerald-100 text-emerald-800",
};

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

const isMeasureLead = (lead: LeadDetail) => lead.type === "measure_lead";
const hasOrderItems = (lead: LeadDetail) => !isMeasureLead(lead) && lead.items.length > 0;

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
    if (!lead || isMeasureLead(lead)) return [];
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
      const body: Record<string, unknown> = {
        status,
        managerNotes,
      };

      if (hasOrderItems(lead)) {
        const items = parseDraftItems(lead.items, itemDrafts).map((item) => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
        }));
        const discountNumeric = Number(discountValue) || 0;
        if (discountKind === "percent" && discountNumeric > 100) {
          throw new Error("Скидка не может быть больше 100%");
        }
        body.discountKind = discountKind;
        body.discountValue = discountKind === "none" ? 0 : Math.floor(discountNumeric);
        body.items = items;
      }

      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
      <AdminPage title="Заявка">
        <p className="text-zinc-600">Загрузка…</p>
      </AdminPage>
    );
  }

  if (!lead) {
    return (
      <AdminPage title="Заявка">
        <AdminNotice variant="error">{error || "Заявка не найдена"}</AdminNotice>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/leads">К списку заявок</Link>
        </Button>
      </AdminPage>
    );
  }

  const leadDescription = `Создана ${formatDateTime(lead.createdAt)}${
    lead.updatedAt !== lead.createdAt ? ` · обновлена ${formatDateTime(lead.updatedAt)}` : ""
  }`;
  const typeLabel = LEAD_TYPE_LABELS[lead.type] || lead.type;
  const showContractFields = lead.type === "admin_order";
  const showPublicMeta = lead.type === "cart_lead" || lead.type === "measure_lead";

  return (
    <AdminPage
      title={`Заявка №${lead.id}`}
      description={leadDescription}
      actions={
        <>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              LEAD_TYPE_BADGE[lead.type] || "bg-zinc-100 text-zinc-700",
            )}
          >
            {typeLabel}
          </span>
          {hasOrderItems(lead) ? (
            <Button size="sm" asChild>
              <a href={`/api/admin/leads/${lead.id}/contract`}>Скачать договор (.docx)</a>
            </Button>
          ) : null}
          <AdminConfirmButton
            confirmMessage={`Удалить заявку «${lead.customerName || `№${lead.id}`}»? Действие нельзя отменить.`}
            disabled={deleting}
            onConfirm={() => void onDelete()}
          >
            {deleting ? "Удаление…" : "Удалить"}
          </AdminConfirmButton>
        </>
      }
    >
      <AdminCard title="Клиент">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">ФИО</dt>
            <dd>{lead.customerName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Телефон</dt>
            <dd>{lead.phone}</dd>
          </div>
          {showContractFields ? (
            <>
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
            </>
          ) : null}
          {showPublicMeta && lead.clientComment ? (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Комментарий клиента</dt>
              <dd className="whitespace-pre-wrap">{lead.clientComment}</dd>
            </div>
          ) : null}
          {showPublicMeta && lead.sourcePage ? (
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Страница отправки</dt>
              <dd>
                <a
                  href={lead.sourcePage}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sky-700 underline-offset-2 hover:underline"
                >
                  {lead.sourcePage}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </AdminCard>

      <form onSubmit={(event) => void onSave(event)} className="space-y-6">
        {isMeasureLead(lead) ? (
          <AdminCard title="Позиции">
            <AdminEmptyState title="Позиций нет — заявка на замер" />
          </AdminCard>
        ) : (
          <AdminCard title="Позиции" contentClassName="overflow-x-auto p-0">
            {lead.items.length === 0 ? (
              <div className="p-4">
                <AdminEmptyState title="Позиций нет" />
              </div>
            ) : (
              <>
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
                            <p className="font-medium">
                              {formatCartItemName(item.name, item.color)}
                            </p>
                          </td>
                          <td className="px-4 py-3">{item.sku || "—"}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-full rounded border px-2 py-1 text-sm"
                              value={draft?.price ?? ""}
                              onChange={(event) =>
                                updateItemDraft(item.id, "price", event.target.value)
                              }
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
                              onChange={(event) =>
                                updateItemDraft(item.id, "quantity", event.target.value)
                              }
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
                      Подытог:{" "}
                      <span className="font-medium text-zinc-900">
                        {formatPrice(previewTotals.subtotal)}
                      </span>
                    </div>
                    {previewTotals.discountAmount > 0 ? (
                      <div className="text-rose-700">
                        Скидка:{" "}
                        <span className="font-medium">
                          −{formatPrice(previewTotals.discountAmount)}
                        </span>
                      </div>
                    ) : null}
                    <div className="text-base font-semibold">
                      Итого: {formatPrice(previewTotals.total)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </AdminCard>
        )}

        <AdminCard title="Управление">
          <div className="space-y-4">
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
            {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
            {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </AdminCard>
      </form>
    </AdminPage>
  );
}
