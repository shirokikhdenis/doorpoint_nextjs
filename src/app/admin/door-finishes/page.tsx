"use client";

import Image from "next/image";
import { ChangeEvent, Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductImagePicker } from "@/features/admin/product-image-picker";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { Button } from "@/components/ui/button";
import { uploadAdminStorefrontImage } from "@/features/admin/admin-image-upload";
import { parseCsv, type CsvRow } from "@/lib/client/csv-parse";
import { formatPrice } from "@/lib/client/format";

type DoorFinishRow = {
  id: number;
  manufacturerName: string;
  groupKey: string;
  name: string;
  imageUrl: string;
  priceDelta: number;
  sortOrder: number;
  isActive: boolean;
};

type DoorFinishesResponse = {
  manufacturers: string[];
  groupOrder: string[];
  groupLabels: Record<string, string>;
  finishes: DoorFinishRow[];
  selectedManufacturer: string;
  pickerTemplates: DoorFinishPickerTemplate[];
  pickerSettings: DoorFinishPickerSettings;
};

type DoorFinishPickerTemplate = {
  id: string;
  title: string;
  description: string;
};

type DoorFinishPickerSettings = {
  activeTemplateId: string | null;
  enabledTemplateIds: string[];
};

type FinishDraft = {
  manufacturerName: string;
  groupKey: string;
  name: string;
  imageUrl: string;
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

const FINISH_CSV_SAMPLE = `manufacturer;group_key;name;image_url;price_delta;sort_order
Аэлита;Под мрамор;Дюна графит;;1200;40
Аэлита;Под дерево;Дуб натуральный;;2500;20`;

const FINISH_CSV_COLUMNS = [
  "manufacturer",
  "group_key",
  "name",
  "image_url",
  "price_delta",
  "sort_order",
];

const emptyDraft = (manufacturerName: string): FinishDraft => ({
  manufacturerName,
  groupKey: "solid",
  name: "",
  imageUrl: "",
  priceDelta: "0",
  sortOrder: "0",
  isActive: true,
});

const rowToDraft = (row: DoorFinishRow): FinishDraft => ({
  manufacturerName: row.manufacturerName,
  groupKey: row.groupKey,
  name: row.name,
  imageUrl: row.imageUrl,
  priceDelta: String(row.priceDelta),
  sortOrder: String(row.sortOrder),
  isActive: row.isActive,
});

const draftToPayload = (draft: FinishDraft) => ({
  manufacturerName: draft.manufacturerName.trim(),
  groupKey: draft.groupKey,
  name: draft.name.trim(),
  imageUrl: draft.imageUrl.trim(),
  priceDelta: Number(draft.priceDelta) || 0,
  sortOrder: Number(draft.sortOrder) || 0,
  isActive: draft.isActive,
});

export default function AdminDoorFinishesPage() {
  return (
    <Suspense
      fallback={
        <AdminPage title="Покрытия дверей">
          <AdminCard className="p-6">
            <p className="text-sm text-zinc-500">Загрузка…</p>
          </AdminCard>
        </AdminPage>
      }
    >
      <AdminDoorFinishesContent />
    </Suspense>
  );
}

function AdminDoorFinishesContent() {
  const searchParams = useSearchParams();
  const initialManufacturer = searchParams.get("manufacturer") || "Аэлита";

  const [manufacturer, setManufacturer] = useState(initialManufacturer);
  const [groupFilter, setGroupFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [data, setData] = useState<DoorFinishesResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<number, FinishDraft>>({});
  const [newDraft, setNewDraft] = useState<FinishDraft>(() => emptyDraft(initialManufacturer));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [imageEditId, setImageEditId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [importRows, setImportRows] = useState<CsvRow[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowImageInputRef = useRef<HTMLInputElement>(null);
  const [rowImageUploadId, setRowImageUploadId] = useState<number | null>(null);
  const [imageUploadingId, setImageUploadingId] = useState<number | null>(null);
  const [pickerTemplates, setPickerTemplates] = useState<DoorFinishPickerTemplate[]>([]);
  const [pickerSettings, setPickerSettings] = useState<DoorFinishPickerSettings>({
    activeTemplateId: "modal-grid-tabs",
    enabledTemplateIds: ["modal-grid-tabs"],
  });
  const [pickerSettingsSaving, setPickerSettingsSaving] = useState(false);

  const loadFinishes = useCallback(async (nextManufacturer: string, onlyActive: boolean) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextManufacturer) params.set("manufacturer", nextManufacturer);
      if (onlyActive) params.set("activeOnly", "1");
      const response = await fetch(`/api/admin/door-finishes?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as DoorFinishesResponse;
      setData(json);
      const nextDrafts: Record<number, FinishDraft> = {};
      json.finishes.forEach((row) => {
        nextDrafts[row.id] = rowToDraft(row);
      });
      setDrafts(nextDrafts);
      if (Array.isArray(json.pickerTemplates)) {
        setPickerTemplates(json.pickerTemplates);
      }
      if (json.pickerSettings) {
        setPickerSettings({
          activeTemplateId: json.pickerSettings.activeTemplateId ?? null,
          enabledTemplateIds: Array.isArray(json.pickerSettings.enabledTemplateIds)
            ? json.pickerSettings.enabledTemplateIds
            : [],
        });
      }
      if (!nextManufacturer && json.manufacturers[0]) {
        setManufacturer(json.manufacturers[0]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFinishes(manufacturer, activeOnly);
  }, [manufacturer, activeOnly, loadFinishes]);

  useEffect(() => {
    setNewDraft((current) => ({ ...current, manufacturerName: manufacturer }));
  }, [manufacturer]);

  const groupOptions = useMemo(() => {
    if (!data) return [];
    return data.groupOrder.map((key) => ({
      key,
      label: data.groupLabels[key] || key,
    }));
  }, [data]);

  const visibleFinishes = useMemo(() => {
    if (!data) return [];
    if (groupFilter === "all") return data.finishes;
    return data.finishes.filter((row) => row.groupKey === groupFilter);
  }, [data, groupFilter]);

  const persistRowDraft = async (rowId: number, draft: FinishDraft, successMessage?: string) => {
    if (savingId) return false;
    setSavingId(rowId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/door-finishes/${rowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      setDrafts((current) => ({ ...current, [rowId]: draft }));
      if (successMessage) setNotice(successMessage);
      await loadFinishes(manufacturer, activeOnly);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const saveRow = async (row: DoorFinishRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    await persistRowDraft(row.id, draft, `Сохранено: ${draft.name}`);
  };

  const openRowImageUpload = (rowId: number) => {
    if (savingId) return;
    setRowImageUploadId(rowId);
    rowImageInputRef.current?.click();
  };

  const onRowImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const rowId = rowImageUploadId;
    event.target.value = "";
    setRowImageUploadId(null);
    if (!file || !rowId) return;

    const row = data?.finishes.find((item) => item.id === rowId);
    if (!row) return;

    setImageUploadingId(rowId);
    setNotice("");
    setError("");
    try {
      const imageUrl = await uploadAdminStorefrontImage(file, "finishes");
      const draft = { ...(drafts[rowId] || rowToDraft(row)), imageUrl };
      await persistRowDraft(rowId, draft, `Фото загружено: ${draft.name}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки фото");
    } finally {
      setImageUploadingId(null);
    }
  };

  const saveRowImageFromPicker = async (rowId: number, imageUrl: string) => {
    const row = data?.finishes.find((item) => item.id === rowId);
    if (!row) return;
    const draft = { ...(drafts[rowId] || rowToDraft(row)), imageUrl };
    updateDraft(rowId, { imageUrl });
    await persistRowDraft(rowId, draft, imageUrl ? `Фото сохранено: ${draft.name}` : undefined);
  };

  const createFinish = async () => {
    if (savingId) return;
    setSavingId("new");
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-finishes", {
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
      await loadFinishes(manufacturer, activeOnly);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка создания");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (row: DoorFinishRow) => {
    if (savingId || !window.confirm(`Удалить покрытие «${row.name}»?`)) return;
    setSavingId(row.id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/door-finishes/${row.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice(`Удалено: ${row.name}`);
      await loadFinishes(manufacturer, activeOnly);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (id: number, patch: Partial<FinishDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const parseImportCsv = (text: string) => {
    setImportParseError("");
    setImportResult(null);
    try {
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setImportRows([]);
        setImportParseError("Файл пустой или без строк данных");
        return;
      }
      setImportRows(rows);
    } catch (caught) {
      setImportRows([]);
      setImportParseError(caught instanceof Error ? caught.message : "Ошибка разбора CSV");
    }
  };

  const onImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    parseImportCsv(text);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertSampleCsv = () => {
    parseImportCsv(FINISH_CSV_SAMPLE);
  };

  const clearImport = () => {
    setImportRows([]);
    setImportParseError("");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runCsvImport = async () => {
    if (importRows.length === 0 || importing) return;
    setImporting(true);
    setImportResult(null);
    setError("");
    try {
      const response = await fetch("/api/admin/door-finishes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: importRows,
          defaultManufacturer: manufacturer,
        }),
      });
      const data = (await response.json()) as Partial<ImportResult> & { message?: string };
      if (!response.ok) {
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
        setNotice(`Импортировано покрытий: ${data.imported}`);
        await loadFinishes(manufacturer, activeOnly);
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

  const deleteAllFinishes = async () => {
    if (deletingAll || savingId || !manufacturer) return;
    const activeNote = activeOnly
      ? "\n\nУдалятся все покрытия производителя, не только отфильтрованные в списке."
      : "";
    if (
      !window.confirm(
        `Удалить все покрытия производителя «${manufacturer}»? Действие необратимо.${activeNote}`,
      )
    ) {
      return;
    }

    setDeletingAll(true);
    setNotice("");
    setError("");
    try {
      const params = new URLSearchParams({ manufacturer });
      const response = await fetch(`/api/admin/door-finishes?${params.toString()}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        deleted?: number;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Ошибка удаления");
      }
      setNotice(`Удалено покрытий: ${Number(payload.deleted || 0)}`);
      await loadFinishes(manufacturer, activeOnly);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeletingAll(false);
    }
  };

  const importPreviewRows = useMemo(() => importRows.slice(0, 10), [importRows]);

  const persistPickerSettings = async (next: DoorFinishPickerSettings) => {
    if (pickerSettingsSaving) return false;
    setPickerSettingsSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-finishes/picker-template", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        pickerSettings?: DoorFinishPickerSettings;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Ошибка сохранения шаблона");
      }
      if (payload.pickerSettings) {
        setPickerSettings(payload.pickerSettings);
      }
      setNotice(
        payload.pickerSettings?.enabledTemplateIds.length
          ? "Шаблон палитры сохранён и включён на витрине"
          : "Шаблон палитры отключён — блок выбора покрытия скрыт на витрине",
      );
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения шаблона");
      return false;
    } finally {
      setPickerSettingsSaving(false);
    }
  };

  const togglePickerTemplateEnabled = (templateId: string, enabled: boolean) => {
    const enabledTemplateIds = enabled
      ? [...new Set([...pickerSettings.enabledTemplateIds, templateId])]
      : pickerSettings.enabledTemplateIds.filter((id) => id !== templateId);
    const activeTemplateId =
      pickerSettings.activeTemplateId && enabledTemplateIds.includes(pickerSettings.activeTemplateId)
        ? pickerSettings.activeTemplateId
        : enabledTemplateIds[0] || null;
    const next = { activeTemplateId, enabledTemplateIds };
    setPickerSettings(next);
    void persistPickerSettings(next);
  };

  const setActivePickerTemplate = (templateId: string) => {
    const next = pickerSettings.enabledTemplateIds.includes(templateId)
      ? { ...pickerSettings, activeTemplateId: templateId }
      : {
          activeTemplateId: templateId,
          enabledTemplateIds: [...pickerSettings.enabledTemplateIds, templateId],
        };
    setPickerSettings(next);
    void persistPickerSettings(next);
  };

  const storefrontPickerActive = Boolean(
    pickerSettings.activeTemplateId &&
      pickerSettings.enabledTemplateIds.includes(pickerSettings.activeTemplateId),
  );

  return (
    <AdminPage
      title="Покрытия дверей"
      description="Каталог покрытий для карточек межкомнатных дверей (сейчас — производители с конфигуратором на витрине)."
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <input
        ref={rowImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void onRowImageFileChange(event)}
      />

      <AdminCard title="Шаблон палитры на витрине" className="p-4">
        <p className="text-sm text-zinc-600">
          Выберите, какой вариант выбора покрытия показывать на карточке двери. Можно отключить
          шаблон — тогда блок выбора покрытия на витрине скроется (для сравнения с другими
          вариантами позже).
        </p>
        <div className="mt-4 space-y-3">
          {(pickerTemplates.length > 0 ? pickerTemplates : []).map((template) => {
            const enabled = pickerSettings.enabledTemplateIds.includes(template.id);
            const active = pickerSettings.activeTemplateId === template.id;
            return (
              <div
                key={template.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-zinc-900">{template.title}</p>
                    <p className="text-sm text-zinc-600">{template.description}</p>
                    <p className="text-xs text-zinc-400">id: {template.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={pickerSettingsSaving}
                        onChange={(event) =>
                          togglePickerTemplateEnabled(template.id, event.target.checked)
                        }
                      />
                      Включён
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="radio"
                        name="finish-picker-template"
                        checked={active}
                        disabled={!enabled || pickerSettingsSaving}
                        onChange={() => setActivePickerTemplate(template.id)}
                      />
                      На витрине
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-500">
            {pickerSettingsSaving
              ? "Сохранение…"
              : storefrontPickerActive
                ? `На витрине: ${pickerTemplates.find((t) => t.id === pickerSettings.activeTemplateId)?.title || pickerSettings.activeTemplateId}`
                : "На витрине палитра выключена"}
          </span>
        </div>
      </AdminCard>

      <AdminCard className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[14rem] flex-col gap-1 text-xs text-zinc-600">
            Производитель
            <select
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {(data?.manufacturers || [manufacturer]).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-zinc-600">
            Группа
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="all">Все группы</option>
              {groupOptions.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Только активные
          </label>

          <p className="text-sm text-zinc-500">
            {loading ? "Загрузка…" : `Покрытий: ${visibleFinishes.length}`}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => void deleteAllFinishes()}
            disabled={deletingAll || loading || !manufacturer}
          >
            {deletingAll ? "Удаление…" : "Удалить покрытия"}
          </Button>
        </div>
      </AdminCard>

      <AdminCard title="Список покрытий" className="overflow-hidden p-0">
        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header className="w-24">
                Фото
              </AdminTableCell>
              <AdminTableCell header>Название</AdminTableCell>
              <AdminTableCell header>Группа</AdminTableCell>
              <AdminTableCell header>Наценка</AdminTableCell>
              <AdminTableCell header>Порядок</AdminTableCell>
              <AdminTableCell header>Активно</AdminTableCell>
              <AdminTableCell header className="w-40">
                Действия
              </AdminTableCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {visibleFinishes.length === 0 ? (
              <AdminTableRow>
                <AdminTableCell colSpan={7} className="py-8 text-center text-zinc-500">
                  {loading ? "Загрузка…" : "Покрытий пока нет"}
                </AdminTableCell>
              </AdminTableRow>
            ) : (
              visibleFinishes.map((row) => {
                const draft = drafts[row.id] || rowToDraft(row);
                return (
                  <Fragment key={row.id}>
                    <AdminTableRow>
                      <AdminTableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          {draft.imageUrl ? (
                            <span className="relative block h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                              <Image
                                src={draft.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </span>
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
                              —
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openRowImageUpload(row.id)}
                            disabled={savingId === row.id || imageUploadingId === row.id}
                            className="text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50"
                          >
                            {savingId === row.id || imageUploadingId === row.id
                              ? "Загрузка…"
                              : draft.imageUrl
                                ? "Заменить фото"
                                : "Загрузить фото"}
                          </button>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraft(row.id, { name: event.target.value })}
                          className="w-full min-w-[10rem] rounded border border-zinc-200 px-2 py-1.5 text-sm"
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <select
                          value={draft.groupKey}
                          onChange={(event) => updateDraft(row.id, { groupKey: event.target.value })}
                          className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                        >
                          {groupOptions.map((group) => (
                            <option key={group.key} value={group.key}>
                              {group.label}
                            </option>
                          ))}
                        </select>
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          type="number"
                          value={draft.priceDelta}
                          onChange={(event) => updateDraft(row.id, { priceDelta: event.target.value })}
                          className="w-28 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) => updateDraft(row.id, { sortOrder: event.target.value })}
                          className="w-20 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) => updateDraft(row.id, { isActive: event.target.checked })}
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setImageEditId((current) => (current === row.id ? null : row.id))}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                          >
                            {imageEditId === row.id ? "Скрыть фото" : "Фото"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveRow(row)}
                            disabled={savingId === row.id}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {savingId === row.id ? "…" : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRow(row)}
                            disabled={savingId === row.id}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Удалить
                          </button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                    {imageEditId === row.id ? (
                      <AdminTableRow>
                        <AdminTableCell colSpan={7} className="bg-zinc-50">
                          <div className="py-2">
                            <p className="mb-2 text-sm font-medium text-zinc-900">
                              Пиктограмма: {draft.name}
                            </p>
                            <ProductImagePicker
                              value={draft.imageUrl}
                              onChange={(url) => {
                                updateDraft(row.id, { imageUrl: url });
                                void saveRowImageFromPicker(row.id, url);
                              }}
                              uploadSubdir="finishes"
                              clearLabel="Убрать фото"
                              emptyHint="Пиктограмма покрытия не задана."
                            />
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>

      <AdminCard title="Добавить покрытие" className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Название
            <input
              value={newDraft.name}
              onChange={(event) => setNewDraft((current) => ({ ...current, name: event.target.value }))}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Группа
            <select
              value={newDraft.groupKey}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, groupKey: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
            >
              {groupOptions.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Наценка, ₽
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
            Порядок сортировки
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Пиктограмма</p>
          <ProductImagePicker
            value={newDraft.imageUrl}
            onChange={(url) => setNewDraft((current) => ({ ...current, imageUrl: url }))}
            uploadSubdir="finishes"
            clearLabel="Убрать фото"
            emptyHint="Можно добавить позже."
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={() => void createFinish()} disabled={savingId === "new"}>
            {savingId === "new" ? "Добавление…" : "Добавить покрытие"}
          </Button>
          <span className="text-sm text-zinc-500">
            На витрине: {formatPrice(Number(newDraft.priceDelta) || 0)} к цене полотна
          </span>
        </div>
      </AdminCard>

      <AdminCard title="Импорт из CSV" className="p-4">
        <p className="text-sm text-zinc-600">
          Колонки:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            {FINISH_CSV_COLUMNS.join(";")}
          </code>
          . Разделитель — точка с запятой. Заголовки колонок не чувствительны к регистру (
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">Manufacturer</code> тоже
          подойдёт). В{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">group_key</code> можно писать
          код (<code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">marble</code>) или
          название группы (
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">Под мрамор</code>). Если в
          файле нет колонки{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">manufacturer</code>, будет
          использован выбранный производитель ({manufacturer}).
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onImportFileChange(event)}
            className="text-sm text-zinc-700"
          />
          <Button type="button" variant="outline" size="sm" onClick={insertSampleCsv}>
            Пример CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearImport}
            disabled={importRows.length === 0 && !importParseError}
          >
            Очистить
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

        {importParseError ? (
          <p className="mt-3 text-sm text-rose-600">{importParseError}</p>
        ) : null}

        {importResult ? (
          <div className="mt-3">
            <AdminNotice variant={importResult.ok ? "success" : "error"}>
              Импортировано {importResult.imported} из {importResult.total}
              {importResult.errors.length > 0
                ? `. Ошибки: ${importResult.errors.slice(0, 5).join("; ")}${
                    importResult.errors.length > 5 ? "…" : ""
                  }`
                : ""}
            </AdminNotice>
            {importResult.errors.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs text-rose-700">
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
              Превью (первые {importPreviewRows.length} из {importRows.length})
            </p>
            <table className="min-w-full text-left text-xs text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200">
                  {FINISH_CSV_COLUMNS.map((column) => (
                    <th key={column} className="px-2 py-1.5 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row, index) => (
                  <tr key={index} className="border-b border-zinc-100">
                    {FINISH_CSV_COLUMNS.map((column) => (
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

        <p className="mt-4 text-xs text-zinc-500">
          CLI:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5">
            node scripts/import-door-finishes.js path/to/finishes.csv
          </code>
        </p>
      </AdminCard>
    </AdminPage>
  );
}
