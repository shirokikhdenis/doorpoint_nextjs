"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BRIGADE_COLOR_OPTIONS,
  DELIVERY_CHIP_COLOR,
  WEEKDAY_LABELS,
  buildMonthGrid,
  eachIsoDate,
  formatDateRangeLabel,
  monthBounds,
  monthTitle,
  todayIsoDate,
} from "@/features/admin/install-calendar/calendar-utils";
import {
  emptyInstallForm,
  formFromInstallation,
  type CalendarEntryKind,
  type InstallBrigade,
  type InstallFormState,
  type InteriorInstallation,
  type LeadSearchHit,
} from "@/features/admin/install-calendar/types";
import { InstallCalendarTable } from "@/features/admin/install-calendar/install-calendar-table";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminFormField, AdminInputField, AdminTextareaField } from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { cn } from "@/lib/utils";

const readError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message || (await response.text().catch(() => "")) || `HTTP ${response.status}`;
};

const monthFromIso = (iso: string | null) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7)) - 1;
  if (!Number.isInteger(year) || month < 0 || month > 11) return null;
  return { year, month };
};

export function InstallCalendarPage() {
  const searchParams = useSearchParams();
  const focusDate = searchParams.get("date");
  const focusJob = searchParams.get("job");
  const createLeadId = searchParams.get("leadId");
  const createKind = searchParams.get("kind");
  const now = new Date();
  const initialMonth = monthFromIso(focusDate);
  const [year, setYear] = useState(initialMonth?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth?.month ?? now.getMonth());
  const [brigadeFilter, setBrigadeFilter] = useState("");
  const [brigades, setBrigades] = useState<InstallBrigade[]>([]);
  const [jobs, setJobs] = useState<InteriorInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InstallFormState>(emptyInstallForm(todayIsoDate()));
  const [saving, setSaving] = useState(false);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadHits, setLeadHits] = useState<LeadSearchHit[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadSearchHit[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [brigadeDraft, setBrigadeDraft] = useState({ name: "", color: BRIGADE_COLOR_OPTIONS[0] });
  const [savingBrigadeId, setSavingBrigadeId] = useState<number | "new" | null>(null);
  const openedFocusRef = useRef<string | null>(null);
  const leadBlurTimerRef = useRef<number | null>(null);

  const range = useMemo(() => monthBounds(year, month), [year, month]);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = todayIsoDate();
  const jobsByDate = useMemo(() => {
    const map = new Map<string, InteriorInstallation[]>();
    for (const job of jobs) {
      const start = job.installDate;
      const end = job.installEndDate || job.installDate;
      for (const date of eachIsoDate(start, end)) {
        const list = map.get(date) ?? [];
        list.push(job);
        map.set(date, list);
      }
    }
    return map;
  }, [jobs]);
  const activeBrigades = brigades.filter((item) => item.isActive);
  const formBrigades = brigades.filter(
    (item) => item.isActive || (editingId != null && String(item.id) === form.brigadeId),
  );

  const loadBrigades = useCallback(async () => {
    const response = await fetch("/api/admin/install-brigades");
    if (!response.ok) throw new Error(await readError(response));
    const json = (await response.json()) as { items?: InstallBrigade[] };
    setBrigades(Array.isArray(json.items) ? json.items : []);
  }, []);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (brigadeFilter) params.set("brigadeId", brigadeFilter);
    const response = await fetch(`/api/admin/interior-installations?${params.toString()}`);
    if (!response.ok) throw new Error(await readError(response));
    const json = (await response.json()) as { items?: InteriorInstallation[] };
    setJobs(Array.isArray(json.items) ? json.items : []);
  }, [brigadeFilter, range.from, range.to]);

  const reload = useCallback(async () => {
    await Promise.all([loadBrigades(), loadJobs()]);
  }, [loadBrigades, loadJobs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await reload();
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const next = monthFromIso(focusDate);
    if (!next) return;
    setYear(next.year);
    setMonth(next.month);
  }, [focusDate]);

  useEffect(() => {
    const term = leadQuery.trim();
    if (term.length < 2) {
      setLeadHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLeadSearching(true);
        try {
          const response = await fetch(
            `/api/admin/leads?search=${encodeURIComponent(term)}&limit=8`,
          );
          if (!response.ok) return;
          const json = (await response.json()) as { items?: LeadSearchHit[] };
          if (!cancelled) setLeadHits(Array.isArray(json.items) ? json.items : []);
        } finally {
          if (!cancelled) setLeadSearching(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [leadQuery]);

  useEffect(() => {
    if (!panelOpen) {
      setLeadPickerOpen(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/leads?limit=8");
        if (!response.ok) return;
        const json = (await response.json()) as { items?: LeadSearchHit[] };
        if (!cancelled) setRecentLeads(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!cancelled) setRecentLeads([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [panelOpen]);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const openCreate = (date: string, kind: CalendarEntryKind = "install") => {
    setEditingId(null);
    setForm(
      emptyInstallForm(date, {
        kind,
        brigadeId: kind === "install" && activeBrigades[0] ? String(activeBrigades[0].id) : "",
      }),
    );
    setLeadQuery("");
    setLeadHits([]);
    setLeadPickerOpen(false);
    setPanelOpen(true);
    setNotice("");
    setError("");
  };

  const openEdit = (job: InteriorInstallation) => {
    setEditingId(job.id);
    setForm(formFromInstallation(job));
    setLeadQuery("");
    setLeadHits([]);
    setLeadPickerOpen(false);
    setPanelOpen(true);
    setNotice("");
    setError("");
  };

  useEffect(() => {
    if (!focusJob || loading) return;
    const key = `${focusJob}:${focusDate || ""}`;
    if (openedFocusRef.current === key) return;
    const job = jobs.find((item) => String(item.id) === focusJob);
    if (!job) return;
    openedFocusRef.current = key;
    openEdit(job);
  }, [focusDate, focusJob, jobs, loading]);

  const applyLead = async (lead: LeadSearchHit) => {
    if (leadBlurTimerRef.current) window.clearTimeout(leadBlurTimerRef.current);
    setLeadQuery("");
    setLeadHits([]);
    setLeadPickerOpen(false);
    try {
      const response = await fetch(`/api/admin/interior-installations/prefill?leadId=${lead.id}`);
      if (!response.ok) throw new Error(await readError(response));
      const prefill = (await response.json()) as {
        leadId: number;
        orderNumber: string;
        specification: string;
        customerName: string;
        phone: string;
        address: string;
      };
      setForm((current) => ({
        ...current,
        leadId: prefill.leadId,
        leadLabel: [prefill.orderNumber, prefill.customerName].filter(Boolean).join(" · "),
        orderNumber: prefill.orderNumber,
        specification: prefill.specification,
        customerName: prefill.customerName,
        phone: prefill.phone,
        address: prefill.address,
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось подтянуть заявку");
    }
  };

  useEffect(() => {
    if (focusJob || loading || !createLeadId) return;
    const id = Number(createLeadId);
    if (!Number.isInteger(id) || id <= 0) return;
    const kind: CalendarEntryKind = createKind === "delivery" ? "delivery" : "install";
    const key = `create:${kind}:${id}`;
    if (openedFocusRef.current === key) return;
    openedFocusRef.current = key;
    openCreate(today, kind);
    void applyLead({
      id,
      customerName: "",
      phone: "",
      contractNumber: "",
    });
  }, [createKind, createLeadId, focusJob, loading, today]);

  const clearLead = () => {
    setForm((current) => ({ ...current, leadId: null, leadLabel: "" }));
    setLeadPickerOpen(false);
  };

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        kind: form.kind,
        installDate: form.installDate,
        installEndDate: form.installEndDate || form.installDate,
        leadId: form.leadId,
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
        editingId ? `/api/admin/interior-installations/${editingId}` : "/api/admin/interior-installations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      setPanelOpen(false);
      setNotice(
        editingId
          ? form.kind === "delivery"
            ? "Доставка сохранена."
            : "Монтаж сохранён."
          : form.kind === "delivery"
            ? "Доставка добавлена."
            : "Монтаж добавлен.",
      );
      await loadJobs();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async () => {
    if (editingId == null) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/interior-installations/${editingId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      setPanelOpen(false);
      setNotice(form.kind === "delivery" ? "Доставка удалена." : "Монтаж удалён.");
      await loadJobs();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSaving(false);
    }
  };

  const createBrigade = async (event: FormEvent) => {
    event.preventDefault();
    setSavingBrigadeId("new");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/install-brigades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(brigadeDraft),
      });
      if (!response.ok) throw new Error(await readError(response));
      setBrigadeDraft({ name: "", color: BRIGADE_COLOR_OPTIONS[0] });
      setNotice("Бригада добавлена.");
      await loadBrigades();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения бригады");
    } finally {
      setSavingBrigadeId(null);
    }
  };

  const patchBrigade = async (brigade: InstallBrigade, patch: Partial<InstallBrigade>) => {
    setSavingBrigadeId(brigade.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/install-brigades/${brigade.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: patch.name ?? brigade.name,
          color: patch.color ?? brigade.color,
          isActive: patch.isActive ?? brigade.isActive,
          sortOrder: patch.sortOrder ?? brigade.sortOrder,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await loadBrigades();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения бригады");
    } finally {
      setSavingBrigadeId(null);
    }
  };

  const removeBrigade = async (brigade: InstallBrigade) => {
    setSavingBrigadeId(brigade.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/install-brigades/${brigade.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      if (brigadeFilter === String(brigade.id)) setBrigadeFilter("");
      setNotice("Бригада удалена.");
      await loadBrigades();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления бригады");
    } finally {
      setSavingBrigadeId(null);
    }
  };

  return (
    <AdminPage
      title="График доставки/монтажа"
      description="Монтажи и доставки межкомнатных дверей по дням. Один монтаж или доставку можно записать на несколько дней подряд."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => openCreate(today)}>
            Добавить монтаж
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openCreate(today, "delivery")}>
            Добавить доставку
          </Button>
        </div>
      }
    >
      {notice ? (
        <AdminNotice variant="success" onDismiss={() => setNotice("")}>
          {notice}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice variant="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
              ←
            </Button>
            <h2 className="min-w-[12rem] text-center text-lg font-semibold text-admin-text">
              {monthTitle(year, month)}
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
              →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const current = new Date();
                setYear(current.getFullYear());
                setMonth(current.getMonth());
              }}
            >
              Сегодня
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-admin-text-muted">
            Бригада
            <select
              value={brigadeFilter}
              onChange={(event) => setBrigadeFilter(event.target.value)}
              className="h-9 rounded-md border border-admin-input-border bg-admin-input-bg px-2 text-sm text-admin-text"
            >
              <option value="">Все</option>
              {brigades.map((brigade) => (
                <option key={brigade.id} value={brigade.id}>
                  {brigade.name}
                  {brigade.isActive ? "" : " (скрыта)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-admin-text-muted">Загрузка…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[56rem] grid-cols-7 border-l border-t border-admin-border">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="border-b border-r border-admin-border bg-admin-surface-muted px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-admin-text-muted"
                >
                  {label}
                </div>
              ))}
              {cells.map((cell) => {
                const dayJobs = jobsByDate.get(cell.date) ?? [];
                const isToday = cell.date === today;
                return (
                  <div
                    key={cell.date}
                    className={cn(
                      "min-h-[7.5rem] border-b border-r border-admin-border p-1.5",
                      cell.inMonth ? "bg-white" : "bg-zinc-50/80",
                      isToday && "ring-1 ring-inset ring-brand/40",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          cell.inMonth ? "text-admin-text" : "text-admin-text-faint",
                          isToday && "text-brand",
                        )}
                      >
                        {cell.day}
                      </span>
                      <div className="flex items-center">
                        <button
                          type="button"
                          className="rounded px-1 text-[11px] text-admin-text-muted hover:bg-zinc-100 hover:text-admin-text"
                          title="Добавить монтаж"
                          onClick={() => openCreate(cell.date)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="rounded px-1 text-[11px] text-admin-text-muted hover:bg-zinc-100 hover:text-admin-text"
                          title="Добавить доставку"
                          onClick={() => openCreate(cell.date, "delivery")}
                        >
                          д
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayJobs.map((job) => {
                        const isDelivery = job.kind === "delivery";
                        const endDate = job.installEndDate || job.installDate;
                        const rangeLabel = formatDateRangeLabel(job.installDate, endDate);
                        const kindLabel = isDelivery ? "Доставка" : job.brigadeName;
                        const summary = job.doorsSummary.trim();
                        const title = [
                          rangeLabel
                            ? `с ${job.installDate} по ${endDate}`
                            : job.installDate,
                          kindLabel,
                          job.orderNumber || "Без номера",
                          job.customerName,
                          summary,
                          job.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => openEdit(job)}
                            className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white"
                            style={{
                              backgroundColor: isDelivery
                                ? DELIVERY_CHIP_COLOR
                                : job.brigadeColor,
                            }}
                            title={title}
                          >
                            {rangeLabel ? `${rangeLabel} · ` : ""}
                            {summary ||
                              (isDelivery
                                ? `Доставка · ${job.orderNumber || "Без номера"}`
                                : `${job.orderNumber || "Без номера"} · ${job.brigadeName}`)}
                            {job.doorsOnSite ? " · на адресе" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard title="Бригады" description="Скрытая бригада не предлагается в форме, но её монтажи остаются в календаре.">
        <form onSubmit={(event) => void createBrigade(event)} className="mb-4 flex flex-wrap items-end gap-3">
          <AdminInputField
            id="brigade-name"
            label="Новая бригада"
            value={brigadeDraft.name}
            onChange={(event) => setBrigadeDraft((current) => ({ ...current, name: event.target.value }))}
          />
          <AdminFormField label="Цвет" htmlFor="brigade-color">
            <div className="flex gap-1.5">
              {BRIGADE_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  className={cn(
                    "h-7 w-7 rounded-full border-2",
                    brigadeDraft.color === color ? "border-zinc-900" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrigadeDraft((current) => ({ ...current, color }))}
                />
              ))}
            </div>
          </AdminFormField>
          <Button type="submit" size="sm" disabled={savingBrigadeId != null || !brigadeDraft.name.trim()}>
            {savingBrigadeId === "new" ? "Добавляем…" : "Добавить"}
          </Button>
        </form>
        {brigades.length === 0 ? (
          <p className="text-sm text-admin-text-muted">Пока нет бригад — добавьте хотя бы одну, чтобы записывать монтажи.</p>
        ) : (
          <ul className="space-y-2">
            {brigades.map((brigade) => (
              <li
                key={brigade.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-admin-border px-3 py-2"
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: brigade.color }} />
                <input
                  className="min-w-[10rem] flex-1 rounded border border-admin-input-border bg-admin-input-bg px-2 py-1 text-sm"
                  defaultValue={brigade.name}
                  disabled={savingBrigadeId === brigade.id}
                  onBlur={(event) => {
                    const name = event.target.value.trim();
                    if (name && name !== brigade.name) void patchBrigade(brigade, { name });
                  }}
                />
                <label className="flex items-center gap-1.5 text-xs text-admin-text-muted">
                  <input
                    type="checkbox"
                    checked={brigade.isActive}
                    disabled={savingBrigadeId === brigade.id}
                    onChange={(event) => void patchBrigade(brigade, { isActive: event.target.checked })}
                  />
                  Активна
                </label>
                <AdminConfirmButton
                  confirmMessage={`Удалить бригаду «${brigade.name}»? Нельзя, если на неё уже есть монтажи.`}
                  disabled={savingBrigadeId === brigade.id}
                  onConfirm={() => void removeBrigade(brigade)}
                >
                  Удалить
                </AdminConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <InstallCalendarTable
        jobs={jobs}
        open={tableOpen}
        onToggle={() => setTableOpen((current) => !current)}
        onOpenJob={openEdit}
      />

      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="presentation">
          <button
            type="button"
            className="h-full flex-1 cursor-default"
            aria-label="Закрыть"
            onClick={() => !saving && setPanelOpen(false)}
          />
          <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
              <h2 className="text-lg font-semibold text-admin-text">
                {form.kind === "delivery"
                  ? editingId
                    ? "Доставка"
                    : "Новая доставка"
                  : editingId
                    ? "Монтаж"
                    : "Новый монтаж"}
              </h2>
              <button
                type="button"
                className="text-sm text-admin-text-muted hover:text-admin-text"
                onClick={() => setPanelOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <form onSubmit={(event) => void saveJob(event)} className="flex flex-1 flex-col gap-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <AdminInputField
                  id="install-date-from"
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
                  id="install-date-to"
                  label="По"
                  type="date"
                  required
                  min={form.installDate}
                  value={form.installEndDate || form.installDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, installEndDate: event.target.value }))
                  }
                  hint={
                    form.kind === "delivery"
                      ? "Несколько дней подряд — одна доставка"
                      : "Несколько дней подряд — один монтаж"
                  }
                />
              </div>
              <AdminFormField
                label="Заявка"
                hint="Последние заявки в списке. Можно найти по номеру, имени или телефону либо заполнить поля вручную."
              >
                {form.leadId ? (
                  <div className="flex items-center justify-between gap-2 rounded border border-admin-border px-3 py-2 text-sm">
                    <Link
                      href={`/admin/leads/${form.leadId}`}
                      className="min-w-0 truncate font-medium text-admin-text underline-offset-2 hover:text-brand hover:underline"
                      title="Открыть заявку"
                    >
                      {form.leadLabel || `Заявка №${form.leadId}`}
                    </Link>
                    <button type="button" className="shrink-0 text-xs text-admin-text-muted hover:underline" onClick={clearLead}>
                      Отвязать
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className="flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 py-2 text-sm"
                      placeholder="Поиск или выберите из списка…"
                      value={leadQuery}
                      onFocus={() => {
                        if (leadBlurTimerRef.current) window.clearTimeout(leadBlurTimerRef.current);
                        setLeadPickerOpen(true);
                      }}
                      onBlur={() => {
                        leadBlurTimerRef.current = window.setTimeout(() => setLeadPickerOpen(false), 150);
                      }}
                      onChange={(event) => {
                        setLeadQuery(event.target.value);
                        setLeadPickerOpen(true);
                      }}
                    />
                    {leadPickerOpen ? (
                      <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-admin-border bg-white shadow">
                        {leadQuery.trim().length >= 2 ? (
                          leadSearching ? (
                            <li className="px-3 py-2 text-xs text-admin-text-muted">Ищем…</li>
                          ) : leadHits.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-admin-text-muted">Ничего не найдено</li>
                          ) : (
                            leadHits.map((hit) => (
                              <li key={hit.id}>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => void applyLead(hit)}
                                >
                                  <span className="font-medium">
                                    {hit.contractNumber || `Заявка ${hit.id}`}
                                  </span>
                                  <span className="block text-xs text-admin-text-muted">
                                    {hit.customerName} · {hit.phone}
                                  </span>
                                </button>
                              </li>
                            ))
                          )
                        ) : recentLeads.length === 0 ? (
                          <li className="px-3 py-2 text-xs text-admin-text-muted">Пока нет заявок</li>
                        ) : (
                          <>
                            <li className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-admin-text-faint">
                              Последние заявки
                            </li>
                            {recentLeads.map((hit) => (
                              <li key={hit.id}>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => void applyLead(hit)}
                                >
                                  <span className="font-medium">
                                    {hit.contractNumber || `Заявка ${hit.id}`}
                                  </span>
                                  <span className="block text-xs text-admin-text-muted">
                                    {hit.customerName} · {hit.phone}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    ) : null}
                  </div>
                )}
              </AdminFormField>
              <AdminInputField
                id="order-number"
                label="Номер заказа"
                value={form.orderNumber}
                onChange={(event) => setForm((current) => ({ ...current, orderNumber: event.target.value }))}
              />
              <AdminTextareaField
                id="short-description"
                label="Краткое описание"
                rows={2}
                value={form.doorsSummary}
                onChange={(event) => setForm((current) => ({ ...current, doorsSummary: event.target.value }))}
              />
              <AdminTextareaField
                id="specification"
                label="Спецификация"
                rows={5}
                value={form.specification}
                onChange={(event) => setForm((current) => ({ ...current, specification: event.target.value }))}
                hint="Список позиций из заявки. Можно поправить вручную."
              />
              {form.kind === "install" ? (
                <AdminFormField label="Бригада" htmlFor="install-brigade">
                  <select
                    id="install-brigade"
                    required
                    value={form.brigadeId}
                    onChange={(event) => setForm((current) => ({ ...current, brigadeId: event.target.value }))}
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
                id="customer-name"
                label="Имя заказчика"
                required
                value={form.customerName}
                onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              />
              <AdminInputField
                id="customer-phone"
                label="Телефон"
                required
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
              <AdminTextareaField
                id="customer-address"
                label="Адрес"
                rows={2}
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
              <AdminTextareaField
                id="install-notes"
                label="Примечание"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
              <div className="mt-auto flex flex-wrap gap-2 border-t border-admin-border pt-4">
                <Button
                  type="submit"
                  disabled={saving || (form.kind === "install" && formBrigades.length === 0)}
                >
                  {saving ? "Сохраняем…" : editingId ? "Сохранить" : "Создать"}
                </Button>
                {editingId ? (
                  <AdminConfirmButton
                    confirmMessage={
                      form.kind === "delivery"
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
          </aside>
        </div>
      ) : null}
    </AdminPage>
  );
}
