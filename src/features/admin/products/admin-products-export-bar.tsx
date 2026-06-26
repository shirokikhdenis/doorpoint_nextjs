"use client";

import { useState } from "react";
import {
  downloadProductsCsv,
  type ProductsExportFilters,
  type ProductsExportMode,
} from "@/lib/client/admin-products-export";
import { downloadProductKp } from "@/lib/client/admin-product-kp";

type AdminProductsExportBarProps = {
  filters: ProductsExportFilters;
  selectedCount: number;
  selectedIds: number[];
  onNotice: (message: string, variant?: "info" | "success" | "error") => void;
};

export function AdminProductsExportBar({
  filters,
  selectedCount,
  selectedIds,
  onNotice,
}: AdminProductsExportBarProps) {
  const [mode, setMode] = useState<ProductsExportMode>("import");
  const [exporting, setExporting] = useState<"filtered" | "selected" | null>(null);
  const [generatingKp, setGeneratingKp] = useState(false);

  const runExport = async (scope: "filtered" | "selected") => {
    if (scope === "selected" && selectedIds.length === 0) {
      onNotice("Сначала отметьте товары в таблице", "error");
      return;
    }

    setExporting(scope);
    try {
      await downloadProductsCsv({
        filters: scope === "filtered" ? filters : undefined,
        mode,
        ids: scope === "selected" ? selectedIds : undefined,
      });
      onNotice(
        scope === "selected"
          ? `Экспортировано выбранных: ${selectedIds.length}`
          : "CSV по текущим фильтрам скачан",
        "success",
      );
    } catch (caught) {
      onNotice(caught instanceof Error ? caught.message : "Ошибка экспорта", "error");
    } finally {
      setExporting(null);
    }
  };

  const busy = exporting !== null || generatingKp;
  const canGenerateKp = selectedCount === 1;

  const runKp = async () => {
    if (!canGenerateKp) {
      onNotice("Выберите один товар", "error");
      return;
    }

    setGeneratingKp(true);
    try {
      await downloadProductKp(selectedIds[0]!);
      onNotice("КП скачано", "success");
    } catch (caught) {
      onNotice(caught instanceof Error ? caught.message : "Ошибка формирования КП", "error");
    } finally {
      setGeneratingKp(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">Экспорт CSV</p>
        <p className="text-xs text-zinc-500">
          {mode === "import"
            ? "Формат совместим с импортом: можно отредактировать и залить обратно."
            : "Полный формат: slug, активность, акции, бейджи, порядок на витрине."}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Режим
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as ProductsExportMode)}
            disabled={busy}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none"
          >
            <option value="import">Для импорта</option>
            <option value="full">Полный</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void runExport("filtered")}
          disabled={busy}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
        >
          {exporting === "filtered" ? "Экспорт…" : "По фильтрам"}
        </button>
        <button
          type="button"
          onClick={() => void runExport("selected")}
          disabled={busy || selectedCount === 0}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting === "selected" ? "Экспорт…" : `Выбранные (${selectedCount})`}
        </button>
      </div>
    </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-900">Коммерческое предложение</p>
          <p className="text-xs text-zinc-500">
            PDF с названием, фото и ценами полотна и комплекта по одной выбранной карточке.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runKp()}
          disabled={busy || !canGenerateKp}
          title={canGenerateKp ? "Скачать КП в PDF" : "Выберите один товар"}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generatingKp ? "Формирование…" : "Сделать КП"}
        </button>
      </div>
    </div>
  );
}
