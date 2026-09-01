"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminFormField, AdminInputField, AdminTextareaField } from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { todayIsoDate } from "@/features/admin/install-calendar/calendar-utils";
import {
  emptyInstallForm,
  formFromInstallation,
  type CalendarEntryKind,
  type InstallBrigade,
  type InstallFormState,
  type InteriorInstallation,
} from "@/features/admin/install-calendar/types";

type LeadScheduleSidePanelProps = {
  open: boolean;
  leadId: number;
  leadLabel: string;
  kind: CalendarEntryKind;
  jobId: number | null;
  onClose: () => void;
  onSaved: (item: InteriorInstallation) => void;
  onDeleted?: (jobId: number) => void;
};

const readError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message || `HTTP ${response.status}`;
};

export function LeadScheduleSidePanel({
  open,
  leadId,
  leadLabel,
  kind,
  jobId,
  onClose,
  onSaved,
  onDeleted,
}: LeadScheduleSidePanelProps) {
  const [brigades, setBrigades] = useState<InstallBrigade[]>([]);
  const [form, setForm] = useState<InstallFormState>(() => emptyInstallForm(todayIsoDate(), { kind }));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeBrigades = brigades.filter((item) => item.isActive);
  const formBrigades = brigades.filter(
    (item) => item.isActive || (jobId != null && String(item.id) === form.brigadeId),
  );
  const title =
    kind === "delivery"
      ? jobId
        ? "Доставка"
        : "Новая доставка"
      : jobId
        ? "Монтаж"
        : "Новый монтаж";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    setLoading(true);
    void (async () => {
      try {
        const brigadesRes = await fetch("/api/admin/install-brigades");
        if (!brigadesRes.ok) throw new Error(await readError(brigadesRes));
        const brigadesJson = (await brigadesRes.json()) as { items?: InstallBrigade[] };
        const loadedBrigades = Array.isArray(brigadesJson.items) ? brigadesJson.items : [];
        if (cancelled) return;
        setBrigades(loadedBrigades);
        const defaultBrigadeId =
          kind === "install" && loadedBrigades.find((item) => item.isActive)?.id;

        if (jobId) {
          const jobsRes = await fetch(
            `/api/admin/interior-installations/for-lead?leadId=${encodeURIComponent(String(leadId))}`,
          );
          if (!jobsRes.ok) throw new Error(await readError(jobsRes));
          const jobsJson = (await jobsRes.json()) as { items?: InteriorInstallation[] };
          const job = (jobsJson.items || []).find((entry) => entry.id === jobId);
          if (!job) throw new Error("Запись не найдена");
          if (cancelled) return;
          setForm(formFromInstallation(job));
          return;
        }

        const prefillRes = await fetch(
          `/api/admin/interior-installations/prefill?leadId=${encodeURIComponent(String(leadId))}`,
        );
        if (!prefillRes.ok) throw new Error(await readError(prefillRes));
        const prefill = (await prefillRes.json()) as {
          orderNumber: string;
          specification: string;
          customerName: string;
          phone: string;
          address: string;
        };
        if (cancelled) return;
        setForm(
          emptyInstallForm(todayIsoDate(), {
            kind,
            leadId,
            leadLabel,
            orderNumber: prefill.orderNumber,
            specification: prefill.specification,
            customerName: prefill.customerName,
            phone: prefill.phone,
            address: prefill.address,
            brigadeId: defaultBrigadeId ? String(defaultBrigadeId) : "",
          }),
        );
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить форму");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, jobId, kind, leadId, leadLabel]);

  const canSubmit = useMemo(() => {
    if (loading || saving) return false;
    if (form.kind === "install" && formBrigades.length === 0) return false;
    return Boolean(form.installDate && form.customerName.trim() && form.phone.trim());
  }, [form, formBrigades.length, loading, saving]);

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        kind: form.kind,
        installDate: form.installDate,
        installEndDate: form.installEndDate || form.installDate,
        leadId,
        orderNumber: form.orderNumber,
        doorsSummary: form.doorsSummary,
        specification: form.specification,
        brigadeId: form.kind === "delivery" ? null : Number(form.brigadeId) || null,
        doorsOnSite: form.doorsOnSite,
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      };
      const response = await fetch(
        jobId ? `/api/admin/interior-installations/${jobId}` : "/api/admin/interior-installations",
        {
          method: jobId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      const item = (await response.json()) as InteriorInstallation;
      onSaved(item);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async () => {
    if (!jobId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/interior-installations/${jobId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      onDeleted?.(jobId);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="presentation">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Закрыть"
        onClick={() => !saving && onClose()}
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <h2 className="text-lg font-semibold text-admin-text">{title}</h2>
          <button
            type="button"
            className="text-sm text-admin-text-muted hover:text-admin-text"
            onClick={() => !saving && onClose()}
          >
            Закрыть
          </button>
        </div>
        {error ? (
          <div className="px-5 pt-4">
            <AdminNotice variant="error">{error}</AdminNotice>
          </div>
        ) : null}
        {loading ? (
          <p className="px-5 py-8 text-sm text-admin-text-muted">Загрузка…</p>
        ) : (
          <form onSubmit={(event) => void saveJob(event)} className="flex flex-1 flex-col gap-4 px-5 py-4">
            <AdminFormField label="Заявка">
              <Link
                href={`/admin/leads/${leadId}`}
                className="block truncate rounded border border-admin-border px-3 py-2 text-sm font-medium text-admin-text underline-offset-2 hover:text-brand hover:underline"
                title="Открыть заявку"
              >
                {leadLabel || `Заявка №${leadId}`}
              </Link>
            </AdminFormField>
            <div className="grid grid-cols-2 gap-3">
              <AdminInputField
                id="lead-schedule-date-from"
                label="С"
                type="date"
                required
                value={form.installDate}
                onChange={(event) => {
                  const installDate = event.target.value;
                  setForm((current) => ({
                    ...current,
                    installDate,
                    installEndDate:
                      !current.installEndDate || current.installEndDate < installDate
                        ? installDate
                        : current.installEndDate,
                  }));
                }}
              />
              <AdminInputField
                id="lead-schedule-date-to"
                label="По"
                type="date"
                required
                min={form.installDate}
                value={form.installEndDate || form.installDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, installEndDate: event.target.value }))
                }
              />
            </div>
            <AdminInputField
              id="lead-schedule-order-number"
              label="Номер заказа"
              value={form.orderNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, orderNumber: event.target.value }))
              }
            />
            <AdminTextareaField
              id="lead-schedule-doors-summary"
              label="Краткое описание"
              rows={2}
              value={form.doorsSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, doorsSummary: event.target.value }))
              }
            />
            <AdminTextareaField
              id="lead-schedule-specification"
              label="Спецификация"
              rows={5}
              value={form.specification}
              onChange={(event) =>
                setForm((current) => ({ ...current, specification: event.target.value }))
              }
            />
            {form.kind === "install" ? (
              <AdminFormField label="Бригада" htmlFor="lead-schedule-brigade">
                <select
                  id="lead-schedule-brigade"
                  required
                  value={form.brigadeId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, brigadeId: event.target.value }))
                  }
                  className="flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 py-2 text-sm"
                >
                  <option value="">Выберите бригаду</option>
                  {formBrigades.map((brigade) => (
                    <option key={brigade.id} value={brigade.id}>
                      {brigade.name}
                      {brigade.isActive ? "" : " (скрыта)"}
                    </option>
                  ))}
                </select>
              </AdminFormField>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-admin-text">
              <input
                type="checkbox"
                checked={form.doorsOnSite}
                onChange={(event) =>
                  setForm((current) => ({ ...current, doorsOnSite: event.target.checked }))
                }
              />
              Двери на адресе
            </label>
            <AdminInputField
              id="lead-schedule-customer-name"
              label="Имя заказчика"
              required
              value={form.customerName}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerName: event.target.value }))
              }
            />
            <AdminInputField
              id="lead-schedule-phone"
              label="Телефон"
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <AdminTextareaField
              id="lead-schedule-address"
              label="Адрес"
              rows={2}
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
            <AdminTextareaField
              id="lead-schedule-notes"
              label="Примечание"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <div className="mt-auto flex flex-wrap gap-2 border-t border-admin-border pt-4">
              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Сохраняем…" : jobId ? "Сохранить" : "Создать"}
              </Button>
              {jobId ? (
                <AdminConfirmButton
                  confirmMessage={
                    kind === "delivery"
                      ? "Удалить эту доставку из календаря?"
                      : "Удалить этот монтаж из календаря?"
                  }
                  disabled={saving}
                  onConfirm={() => void deleteJob()}
                >
                  Удалить
                </AdminConfirmButton>
              ) : null}
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
