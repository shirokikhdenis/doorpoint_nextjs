"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/client/format";

type HardwareRow = {
  id: number;
  manufacturerName: string;
  code: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

type HardwareDraft = {
  manufacturerName: string;
  code: string;
  name: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyDraft = (manufacturerName: string): HardwareDraft => ({
  manufacturerName,
  code: "",
  name: "",
  price: "0",
  sortOrder: "0",
  isActive: true,
});

const rowToDraft = (row: HardwareRow): HardwareDraft => ({
  manufacturerName: row.manufacturerName,
  code: row.code,
  name: row.name,
  price: String(row.price),
  sortOrder: String(row.sortOrder),
  isActive: row.isActive,
});

const draftToPayload = (draft: HardwareDraft) => ({
  manufacturerName: draft.manufacturerName.trim(),
  code: draft.code.trim(),
  name: draft.name.trim(),
  price: Number(draft.price) || 0,
  sortOrder: Number(draft.sortOrder) || 0,
  isActive: draft.isActive,
});

export function DoorFinishesHardwareTab() {
  const [manufacturer, setManufacturer] = useState("Аэлита");
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [services, setServices] = useState<HardwareRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, HardwareDraft>>({});
  const [newDraft, setNewDraft] = useState<HardwareDraft>(() => emptyDraft("Аэлита"));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadServices = useCallback(async (nextManufacturer: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextManufacturer) params.set("manufacturer", nextManufacturer);
      const response = await fetch(`/api/admin/door-hardware-services?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as {
        manufacturers: string[];
        services: HardwareRow[];
      };
      setManufacturers(json.manufacturers);
      setServices(json.services);
      const nextDrafts: Record<number, HardwareDraft> = {};
      json.services.forEach((row) => {
        nextDrafts[row.id] = rowToDraft(row);
      });
      setDrafts(nextDrafts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices(manufacturer);
  }, [manufacturer, loadServices]);

  useEffect(() => {
    setNewDraft((current) => ({ ...current, manufacturerName: manufacturer }));
  }, [manufacturer]);

  const saveRow = async (rowId: number) => {
    const draft = drafts[rowId];
    if (!draft || savingId) return;
    setSavingId(rowId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/door-hardware-services/${rowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      setNotice(`Сохранено: ${draft.name}`);
      await loadServices(manufacturer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const createService = async () => {
    if (savingId) return;
    setSavingId("new");
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-hardware-services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(newDraft)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка создания");
      }
      setNotice(`Добавлено: ${newDraft.name}`);
      setNewDraft(emptyDraft(manufacturer));
      await loadServices(manufacturer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка создания");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (rowId: number) => {
    if (savingId || !window.confirm("Удалить услугу?")) return;
    setSavingId(rowId);
    setError("");
    try {
      const response = await fetch(`/api/admin/door-hardware-services/${rowId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice("Услуга удалена");
      await loadServices(manufacturer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title="Фильтр" className="p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Производитель
          <select
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            className="max-w-xs rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            {manufacturers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </AdminCard>

      <AdminCard title="Услуги врезки" className="p-4">
        {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header>Код</AdminTableCell>
              <AdminTableCell header>Название</AdminTableCell>
              <AdminTableCell header>Цена</AdminTableCell>
              <AdminTableCell header>Порядок</AdminTableCell>
              <AdminTableCell header>Активна</AdminTableCell>
              <AdminTableCell header />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {services.map((row) => {
              const draft = drafts[row.id] || rowToDraft(row);
              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>
                    <input
                      value={draft.code}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, code: event.target.value },
                        }))
                      }
                      className="w-full min-w-[6rem] rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      className="w-full min-w-[10rem] rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, price: event.target.value },
                        }))
                      }
                      className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, sortOrder: event.target.value },
                        }))
                      }
                      className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, isActive: event.target.checked },
                        }))
                      }
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingId === row.id}
                        onClick={() => void saveRow(row.id)}
                      >
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(savingId)}
                        onClick={() => void deleteRow(row.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>

      <AdminCard title="Новая услуга" className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Код
            <input
              value={newDraft.code}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, code: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Название
            <input
              value={newDraft.name}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Цена, ₽
            <input
              type="number"
              value={newDraft.price}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, price: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Порядок
            <input
              type="number"
              value={newDraft.sortOrder}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, sortOrder: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void createService()} disabled={savingId === "new"}>
            {savingId === "new" ? "Добавление…" : "Добавить услугу"}
          </Button>
          <span className="ml-3 text-sm text-zinc-500">
            На витрине: +{formatPrice(Number(newDraft.price) || 0)}
          </span>
        </div>
      </AdminCard>
    </div>
  );
}
