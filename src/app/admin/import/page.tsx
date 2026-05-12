"use client";

import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CsvRow, parseCsv } from "@/lib/client/csv-parse";
import {
  AttributeDef,
  ColumnMapping,
  SKIP_TARGET,
  applyMapping,
  autoDetectMapping,
  buildTargetGroups,
  loadStoredMapping,
  saveStoredMapping,
} from "@/lib/client/csv-mapping";

type ImportResult = {
  ok: boolean;
  imported: number;
  errors: string[];
};

const SAMPLE_CSV = `sku,name,category,price,imageUrl,model_key,attr:color,attr:glass,attr:thickness,attr:manufacturer,variant_attr:size,variant_attr:opening
ENTRY-BRAVO-01,Браво Сталь 01,Входные двери>>>Премиум,79900,https://picsum.photos/seed/entry-1a/600/800,,Чёрный,,80,Браво,860x2050,Левое
ENTRY-BRAVO-01,Браво Сталь 01,Входные двери>>>Премиум,79900,https://picsum.photos/seed/entry-1a/600/800,,,,,,860x2050,Правое
ENTRY-BRAVO-01,Браво Сталь 01,Входные двери>>>Премиум,79900,https://picsum.photos/seed/entry-1a/600/800,,,,,,960x2050,Левое
INT-CLASSIC-WHITE,Classic 01 Белый,Межкомнатные двери>>>Classic,18900,https://picsum.photos/seed/int-1w/600/800,classic-01,Белый,Прозрачное,,,800x2000,
INT-CLASSIC-WHITE,Classic 01 Белый,Межкомнатные двери>>>Classic,18900,https://picsum.photos/seed/int-1w/600/800,classic-01,,,,,900x2000,
INT-CLASSIC-WHITE-MAT,Classic 01 Белый,Межкомнатные двери>>>Classic,19200,https://picsum.photos/seed/int-1wm/600/800,classic-01,Белый,Матовое,,,800x2000,
INT-CLASSIC-WHITE-MAT,Classic 01 Белый,Межкомнатные двери>>>Classic,19200,https://picsum.photos/seed/int-1wm/600/800,classic-01,,,,,900x2000,
INT-CLASSIC-OAK,Classic 01 Дуб,Межкомнатные двери>>>Classic,19500,https://picsum.photos/seed/int-1o/600/800,classic-01,Дуб,,,,800x2000,
INT-CLASSIC-OAK,Classic 01 Дуб,Межкомнатные двери>>>Classic,19500,https://picsum.photos/seed/int-1o/600/800,classic-01,,,,,900x2000,
`;

export default function AdminImportPage() {
  const [rawText, setRawText] = useState("");
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingOpen, setMappingOpen] = useState(false);
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/bootstrap");
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data?.attributes) ? (data.attributes as AttributeDef[]) : [];
        if (!cancelled) setAttributes(list);
      } catch {
        // bootstrap is optional — the mapping UI will fall back to base targets only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetGroups = useMemo(() => buildTargetGroups(attributes), [attributes]);

  const recomputeMapping = useCallback(
    (headers: string[]) => {
      if (headers.length === 0) {
        setMapping({});
        return;
      }
      const stored = loadStoredMapping(headers);
      if (stored) {
        setMapping(stored);
        return;
      }
      setMapping(autoDetectMapping(headers, attributes));
    },
    [attributes],
  );

  const parsePreview = useCallback(
    (text: string, openMapping = false) => {
      setParseError("");
      setResult(null);
      if (!text.trim()) {
        setRawRows([]);
        setCsvHeaders([]);
        setMapping({});
        return;
      }
      try {
        const parsed = parseCsv(text);
        if (parsed.length === 0) {
          setRawRows([]);
          setCsvHeaders([]);
          setMapping({});
          setParseError("В CSV не найдено ни одной строки данных");
          return;
        }
        const headerSet = new Set<string>();
        parsed.forEach((row) => Object.keys(row).forEach((key) => headerSet.add(key)));
        const headers = Array.from(headerSet);
        setRawRows(parsed);
        setCsvHeaders(headers);
        recomputeMapping(headers);
        if (openMapping) setMappingOpen(true);
      } catch (error) {
        setRawRows([]);
        setCsvHeaders([]);
        setMapping({});
        setParseError(error instanceof Error ? error.message : "Не удалось распарсить CSV");
      }
    },
    [recomputeMapping],
  );

  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setRawText(value);
    parsePreview(value, false);
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    parsePreview(text, true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertSample = () => {
    setRawText(SAMPLE_CSV);
    parsePreview(SAMPLE_CSV, true);
  };

  const clearAll = () => {
    setRawText("");
    setRawRows([]);
    setCsvHeaders([]);
    setMapping({});
    setParseError("");
    setResult(null);
  };

  const mappedRows = useMemo(() => applyMapping(rawRows, mapping), [rawRows, mapping]);
  const mappedHeaders = useMemo(() => {
    const set = new Set<string>();
    mappedRows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
    return Array.from(set);
  }, [mappedRows]);

  const skuMapped = useMemo(
    () => Object.values(mapping).some((target) => target === "sku"),
    [mapping],
  );

  const runImport = async () => {
    if (mappedRows.length === 0 || importing) return;
    setImporting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/import/csv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });
      const data = (await response.json()) as Partial<ImportResult> & { message?: string };
      if (!response.ok) {
        setResult({
          ok: false,
          imported: 0,
          errors: [data.message || `HTTP ${response.status}`],
        });
        return;
      }
      setResult({
        ok: data.ok !== false,
        imported: Number(data.imported || 0),
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
    } catch (error) {
      setResult({
        ok: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : "Сетевая ошибка"],
      });
    } finally {
      setImporting(false);
    }
  };

  const previewRows = mappedRows.slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Импорт CSV</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Загрузка товаров и характеристик пакетно. Файл парсится в браузере и отправляется на{" "}
            <code className="rounded bg-zinc-100 px-1">POST /api/admin/import/csv</code>. Подробный
            гайд по полям и вариантам — в файле{" "}
            <code className="rounded bg-zinc-100 px-1">docs/csv-import.md</code>.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          ← К админке
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100">
              Выбрать CSV-файл
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={insertSample}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
            >
              Подставить пример
            </button>
            <button
              type="button"
              onClick={() => setMappingOpen(true)}
              disabled={csvHeaders.length === 0}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Сопоставить колонки…
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
              disabled={!rawText && rawRows.length === 0}
            >
              Очистить
            </button>
            <span className="text-xs text-zinc-500">
              {rawRows.length > 0
                ? `Распознано строк: ${rawRows.length}, колонок: ${csvHeaders.length}`
                : "Загрузите файл или вставьте CSV в поле ниже"}
            </span>
          </div>

          <textarea
            className="h-72 w-full rounded border border-zinc-200 bg-white p-3 font-mono text-xs leading-5"
            placeholder="sku,name,category,subcategory,price,attr:color,..."
            value={rawText}
            onChange={onTextChange}
            spellCheck={false}
          />

          {parseError ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {parseError}
            </div>
          ) : null}

          {!skuMapped && rawRows.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Ни одна колонка не сопоставлена с обязательным полем <code className="font-mono">sku</code>.{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setMappingOpen(true)}
              >
                Открыть сопоставление
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runImport}
              disabled={importing || mappedRows.length === 0 || Boolean(parseError) || !skuMapped}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {importing ? "Импортируем…" : `Импортировать ${mappedRows.length || ""}`.trim()}
            </button>
            {result ? (
              <span
                className={`text-sm ${result.ok ? "text-emerald-700" : "text-rose-700"}`}
              >
                {result.ok
                  ? `Готово: импортировано ${result.imported} стр.`
                  : `Импорт завершён с ошибками (успешно: ${result.imported})`}
              </span>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border bg-white p-4 text-sm leading-6">
          <h3 className="font-semibold text-zinc-900">Текущее сопоставление</h3>
          {csvHeaders.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Загрузите CSV — здесь появится таблица соответствия CSV-колонок полям БД. Полный
              справочник полей — в <code className="rounded bg-zinc-100 px-1">docs/csv-import.md</code>.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {csvHeaders.map((header) => {
                const target = mapping[header] || SKIP_TARGET;
                const skipped = target === SKIP_TARGET;
                return (
                  <li key={header} className="flex items-baseline justify-between gap-2">
                    <code className="font-mono text-zinc-700">{header}</code>
                    <span
                      className={`font-mono ${
                        skipped ? "text-zinc-400 line-through" : "text-emerald-700"
                      }`}
                    >
                      {skipped ? "пропуск" : target}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {csvHeaders.length > 0 ? (
            <button
              type="button"
              onClick={() => setMappingOpen(true)}
              className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-100"
            >
              Изменить сопоставление
            </button>
          ) : null}
        </aside>
      </section>

      {mappedRows.length > 0 ? (
        <section className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-zinc-500">
            <span>
              Предпросмотр после сопоставления: {previewRows.length} из {mappedRows.length} строк,{" "}
              {mappedHeaders.length} колонок
            </span>
            {mappedRows.length > previewRows.length ? (
              <span>…ещё {mappedRows.length - previewRows.length} строк не показаны</span>
            ) : null}
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-50">
                <tr>
                  <th className="px-2 py-1 text-zinc-500">#</th>
                  {mappedHeaders.map((header) => (
                    <th key={header} className="whitespace-nowrap px-2 py-1 font-mono text-zinc-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1 text-zinc-400">{idx + 1}</td>
                    {mappedHeaders.map((header) => (
                      <td key={header} className="max-w-[16rem] truncate px-2 py-1 align-top text-zinc-700">
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result && result.errors.length > 0 ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-rose-800">
            Сообщения сервера ({result.errors.length})
          </h3>
          <ul className="max-h-72 space-y-1 overflow-auto text-xs text-rose-900">
            {result.errors.map((error, idx) => (
              <li key={idx} className="font-mono">
                {error}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mappingOpen ? (
        <MappingDialog
          headers={csvHeaders}
          rows={rawRows}
          initialMapping={mapping}
          groups={targetGroups}
          onCancel={() => setMappingOpen(false)}
          onApply={(next) => {
            setMapping(next);
            saveStoredMapping(csvHeaders, next);
            setMappingOpen(false);
          }}
          computeAutoMapping={() => autoDetectMapping(csvHeaders, attributes)}
        />
      ) : null}
    </main>
  );
}

type MappingDialogProps = {
  headers: string[];
  rows: CsvRow[];
  initialMapping: ColumnMapping;
  groups: ReturnType<typeof buildTargetGroups>;
  onCancel: () => void;
  onApply: (next: ColumnMapping) => void;
  computeAutoMapping: () => ColumnMapping;
};

const sampleValueFor = (rows: CsvRow[], header: string): string => {
  for (const row of rows) {
    const value = row[header];
    if (value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

function MappingDialog({
  headers,
  rows,
  initialMapping,
  groups,
  onCancel,
  onApply,
  computeAutoMapping,
}: MappingDialogProps) {
  const [draft, setDraft] = useState<ColumnMapping>(() => ({ ...initialMapping }));

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(draft).forEach((target) => {
      if (!target || target === SKIP_TARGET) return;
      counts.set(target, (counts.get(target) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([target]) => target),
    );
  }, [draft]);

  const skuTarget = useMemo(() => Object.values(draft).includes("sku"), [draft]);

  const updateTarget = (header: string, value: string) => {
    setDraft((prev) => ({ ...prev, [header]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Сопоставление колонок CSV"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[min(100vw-2rem,1280px)] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Сопоставление колонок CSV</h2>
            <p className="text-xs text-zinc-500">
              Выберите, в какое поле БД пойдёт каждая колонка. Незаполненные ячейки никогда не
              перезатирают существующие данные.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="w-[18%] px-4 py-2 align-bottom">Колонка CSV</th>
                <th className="w-[44%] px-4 py-2 align-bottom">Пример</th>
                <th className="w-[38%] min-w-[260px] px-4 py-2 align-bottom">Поле в БД</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header) => {
                const target = draft[header] || SKIP_TARGET;
                const isDuplicate =
                  target !== SKIP_TARGET && duplicates.has(target);
                return (
                  <tr key={header} className="border-t align-top">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-700 break-words">
                      {header}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-600">
                      <div className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere] leading-relaxed">
                        {sampleValueFor(rows, header) || <em className="text-zinc-400">—</em>}
                      </div>
                    </td>
                    <td className="min-w-[260px] px-4 py-2">
                      <select
                        value={target}
                        onChange={(event) => updateTarget(header, event.target.value)}
                        className={`w-full rounded border bg-white px-2 py-1 text-xs ${
                          isDuplicate
                            ? "border-amber-400"
                            : target === SKIP_TARGET
                              ? "border-zinc-200 text-zinc-400"
                              : "border-zinc-200"
                        }`}
                      >
                        {groups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {isDuplicate ? (
                        <p className="mt-1 text-[11px] text-amber-700">
                          Несколько колонок ведут в это поле — последняя по порядку перезапишет
                          предыдущие.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-zinc-50 px-5 py-3 text-xs">
          <div className="space-y-1">
            {!skuTarget ? (
              <p className="text-rose-700">
                Обязательно выберите колонку, которая идёт в поле <code>sku</code>.
              </p>
            ) : (
              <p className="text-zinc-500">
                Маппинг будет запомнен в браузере для CSV с такими же заголовками.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(computeAutoMapping())}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-100"
            >
              Автоопределить заново
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-100"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              disabled={!skuTarget}
              className="rounded bg-black px-3 py-1.5 text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Применить
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
