"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { parseCsv, type CsvRow } from "@/lib/client/csv-parse";
import { formatPrice } from "@/lib/client/format";

type GlassRow = {
  id: number;
  manufacturerName: string;
  parentSku: string;
  glassName: string;
  priceDelta: number;
  sortOrder: number;
  isActive: boolean;
};

type GlassDraft = {
  manufacturerName: string;
  parentSku: string;
  glassName: string;
  priceDelta: string;
  sortOrder: string;
  isActive: boolean;
};

type ImportResult = {
  ok: boolean;
  imported: number;
  total: number;
  errors: string[];
};

const GLASS_CSV_COLUMNS = [
  "manufacturer",
  "parent_sku",
  "glass_name",
  "price_delta",
  "sort_order",
  "is_active",
];

const GLASS_CSV_SAMPLE = `manufacturer;parent_sku;glass_name;price_delta;sort_order;is_active
Аэлита;AE-INF-001;Матовое;1500;10;1
Аэлита;AE-INF-001;Глухое;0;0;1`;

const emptyDraft = (manufacturerName: string): GlassDraft => ({
  manufacturerName,
  parentSku: "",
  glassName: "",
  priceDelta: "0",
  sortOrder: "0",
  isActive: true,
});

const rowToDraft = (row: GlassRow): GlassDraft => ({
  manufacturerName: row.manufacturerName,
  parentSku: row.parentSku,
  glassName: row.glassName,
  priceDelta: String(row.priceDelta),
  sortOrder: String(row.sortOrder),
  isActive: row.isActive,
});

const draftToPayload = (draft: GlassDraft) => ({
  manufacturerName: draft.manufacturerName.trim(),
  parentSku: draft.parentSku.trim(),
  glassName: draft.glassName.trim(),
  priceDelta: Number(draft.priceDelta) || 0,
  sortOrder: Number(draft.sortOrder) || 0,
  isActive: draft.isActive,
});

export function DoorFinishesGlassTab() {
  const [manufacturer, setManufacturer] = useState("Аэлита");
  const [parentSkuFilter, setParentSkuFilter] = useState("");
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [options, setOptions] = useState<GlassRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, GlassDraft>>({});
  const [newDraft, setNewDraft] = useState<GlassDraft>(() => emptyDraft("Аэлита"));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [importRows, setImportRows] = useState<CsvRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOptions = useCallback(async (nextManufacturer: string, parentSku: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextManufacturer) params.set("manufacturer", nextManufacturer);
      if (parentSku.trim()) params.set("parent_sku", parentSku.trim());
      const response = await fetch(`/api/admin/door-glass-options?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as {
        manufacturers: string[];
        options: GlassRow[];
      };
      setManufacturers(json.manufacturers);
      setOptions(json.options);
      const nextDrafts: Record<number, GlassDraft> = {};
      json.options.forEach((row) => {
        nextDrafts[row.id] = rowToDraft(row);
      });
      setDrafts(nextDrafts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions(manufacturer, parentSkuFilter);
  }, [manufacturer, parentSkuFilter, loadOptions]);

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
      const response = await fetch(`/api/admin/door-glass-options/${rowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      setNotice(`Сохранено: ${draft.glassName}`);
      await loadOptions(manufacturer, parentSkuFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  };

  const createOption = async () => {
    if (savingId) return;
    setSavingId("new");
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-glass-options", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(newDraft)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка создания");
      }
      setNotice(`Добавлено: ${newDraft.glassName}`);
      setNewDraft(emptyDraft(manufacturer));
      await loadOptions(manufacturer, parentSkuFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка создания");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (rowId: number) => {
    if (savingId || !window.confirm("Удалить опцию стекла?")) return;
    setSavingId(rowId);
    setError("");
    try {
      const response = await fetch(`/api/admin/door-glass-options/${rowId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice("Опция удалена");
      await loadOptions(manufacturer, parentSkuFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSavingId(null);
    }
  };

  const onImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportParseError("");
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setImportParseError("Файл пустой или не распознан");
        setImportRows([]);
        return;
      }
      setImportRows(rows);
    } catch {
      setImportParseError("Не удалось прочитать CSV");
      setImportRows([]);
    }
  };

  const runCsvImport = async () => {
    if (importing || importRows.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const response = await fetch("/api/admin/door-glass-options/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: importRows,
          defaultManufacturer: manufacturer,
        }),
      });
      const data = (await response.json()) as ImportResult & { message?: string };
      if (!response.ok && !data.imported) {
        setImportResult({
          ok: false,
          imported: 0,
          total: importRows.length,
          errors: [data.message || `HTTP ${response.status}`],
        });
        return;
      }
      setImportResult({
        ok: data.ok !== false,
        imported: Number(data.imported || 0),
        total: Number(data.total || importRows.length),
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
      if (Number(data.imported || 0) > 0) {
        setNotice(`Импортировано опций стекла: ${data.imported}`);
        await loadOptions(manufacturer, parentSkuFilter);
      }
    } catch (caught) {
      setImportResult({
        ok: false,
        imported: 0,
        total: importRows.length,
        errors: [caught instanceof Error ? caught.message : "Сетевая ошибка"],
      });
    } finally {
      setImporting(false);
    }
  };

  const importPreviewRows = useMemo(() => importRows.slice(0, 10), [importRows]);

  return (
    <div className="space-y-4">
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title="Фильтр" className="p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Производитель
            <select
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
              className="min-w-[10rem] rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {manufacturers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Родительский SKU
            <input
              value={parentSkuFilter}
              onChange={(event) => setParentSkuFilter(event.target.value)}
              placeholder="Фильтр по products.sku"
              className="min-w-[12rem] rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          В CSV указывается только parent_sku — опции применяются ко всем размерам (вариантам) карточки.
        </p>
      </AdminCard>

      <AdminCard title="Опции стекла" className="p-4">
        {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header>parent_sku</AdminTableCell>
              <AdminTableCell header>Стекло</AdminTableCell>
              <AdminTableCell header>Надбавка</AdminTableCell>
              <AdminTableCell header>Порядок</AdminTableCell>
              <AdminTableCell header>Активна</AdminTableCell>
              <AdminTableCell header />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {options.map((row) => {
              const draft = drafts[row.id] || rowToDraft(row);
              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>
                    <input
                      value={draft.parentSku}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, parentSku: event.target.value },
                        }))
                      }
                      className="w-full min-w-[8rem] rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      value={draft.glassName}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, glassName: event.target.value },
                        }))
                      }
                      className="w-full min-w-[8rem] rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <input
                      type="number"
                      value={draft.priceDelta}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, priceDelta: event.target.value },
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

      <AdminCard title="Новая опция" className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            parent_sku
            <input
              value={newDraft.parentSku}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, parentSku: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Название стекла
            <input
              value={newDraft.glassName}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, glassName: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Надбавка, ₽
            <input
              type="number"
              value={newDraft.priceDelta}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, priceDelta: event.target.value }))
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
          <Button type="button" onClick={() => void createOption()} disabled={savingId === "new"}>
            {savingId === "new" ? "Добавление…" : "Добавить опцию"}
          </Button>
          <span className="ml-3 text-sm text-zinc-500">
            На витрине: +{formatPrice(Number(newDraft.priceDelta) || 0)}
          </span>
        </div>
      </AdminCard>

      <AdminCard title="Импорт из CSV" className="p-4">
        <p className="text-sm text-zinc-600">
          Колонки:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            {GLASS_CSV_COLUMNS.join(";")}
          </code>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onImportFileChange(event)}
            className="text-sm text-zinc-700"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([GLASS_CSV_SAMPLE], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "glass-options-sample.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Пример CSV
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void runCsvImport()}
            disabled={importRows.length === 0 || importing}
          >
            {importing ? "Импорт…" : `Загрузить ${importRows.length || ""} строк`}
          </Button>
        </div>
        {importParseError ? <p className="mt-3 text-sm text-rose-600">{importParseError}</p> : null}
        {importResult ? (
          <div className="mt-3">
            <AdminNotice variant={importResult.ok ? "success" : "error"}>
              Импортировано {importResult.imported} из {importResult.total}
            </AdminNotice>
            {importResult.errors.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-rose-700">
                {importResult.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {importPreviewRows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Превью (первые {importPreviewRows.length} строк)
            </p>
            <table className="min-w-full text-left text-xs text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200">
                  {GLASS_CSV_COLUMNS.map((column) => (
                    <th key={column} className="px-2 py-1.5 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row, index) => (
                  <tr key={index} className="border-b border-zinc-100">
                    {GLASS_CSV_COLUMNS.map((column) => (
                      <td key={column} className="max-w-[12rem] truncate px-2 py-1.5">
                        {row[column] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}
