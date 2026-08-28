"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminSelectField } from "@/features/admin/ui/admin-form-field";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { buildDveriPriceReconcileReport, formatPrice, formatSignedPriceDiff } from "./dveri-catalog-utils";
import type {
  DveriCatalogCategory,
  DveriCatalogProduct,
  DveriPriceReconcileReport,
  DveriPriceReconcileRow,
  DveriPricingRulesState,
} from "./types";

type AdminDveriCatalogPriceReconcileProps = {
  categories: DveriCatalogCategory[];
  products: DveriCatalogProduct[];
  pricingRules: DveriPricingRulesState;
  pricingRulesReady: boolean;
  storefrontPrices?: Record<string, number>;
};

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-admin-border bg-admin-surface-muted text-admin-text";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ReconcileSection({
  title,
  description,
  rows,
  diffTone,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  rows: DveriPriceReconcileRow[];
  diffTone: "neutral" | "warning" | "danger";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (rows.length === 0) return null;

  const diffClass =
    diffTone === "danger"
      ? "text-rose-700"
      : diffTone === "warning"
        ? "text-amber-700"
        : "text-zinc-600";

  return (
    <div className="rounded-lg border border-admin-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-admin-surface-muted"
      >
        <div>
          <h4 className="text-sm font-semibold text-admin-text">{title}</h4>
          <p className="text-xs text-admin-text-muted">{description}</p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums text-admin-text-secondary">
          {rows.length} {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-admin-border">
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Артикул</AdminTableCell>
                <AdminTableCell header>Товар</AdminTableCell>
                <AdminTableCell header className="hidden lg:table-cell">
                  Размер
                </AdminTableCell>
                <AdminTableCell header className="text-right">
                  Калькулируемая
                </AdminTableCell>
                <AdminTableCell header className="text-right">
                  На витрине
                </AdminTableCell>
                <AdminTableCell header className="text-right">
                  Разница
                </AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {rows.map((row) => (
                <AdminTableRow key={`${row.productId}:${row.vendorCode}:${row.optionTitle ?? ""}`}>
                  <AdminTableCell className="font-mono text-sm">{row.vendorCode}</AdminTableCell>
                  <AdminTableCell>
                    <div className="max-w-[320px] truncate">{row.productTitle}</div>
                    <div className="truncate text-xs text-admin-text-muted lg:hidden">
                      {row.optionTitle || "—"}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="hidden lg:table-cell">{row.optionTitle || "—"}</AdminTableCell>
                  <AdminTableCell className="text-right tabular-nums">
                    {formatPrice(row.calculatedPrice)}
                  </AdminTableCell>
                  <AdminTableCell className="text-right tabular-nums">
                    {formatPrice(row.storefrontPrice)}
                  </AdminTableCell>
                  <AdminTableCell className={`text-right tabular-nums ${diffClass}`}>
                    {formatSignedPriceDiff(row.diff)}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </div>
      ) : null}
    </div>
  );
}

export function AdminDveriCatalogPriceReconcile({
  categories,
  products,
  pricingRules,
  pricingRulesReady,
  storefrontPrices,
}: AdminDveriCatalogPriceReconcileProps) {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [report, setReport] = useState<DveriPriceReconcileReport | null>(null);

  const runReconcile = () => {
    const next = buildDveriPriceReconcileReport({
      products,
      categories,
      pricingRules,
      storefrontPrices,
      categoryId,
    });
    setReport(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-admin-text-muted">
        Сравниваются артикулы dveri.com с ценами на витрине (по{" "}
        <code className="text-xs">variant_attr:manufacturer_id</code>) в выбранной категории и её
        подкатегориях. Для товаров с размерами сверка идёт по каждому артикулу варианта.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <AdminSelectField
          id="dveri-reconcile-category"
          label="Категория для сверки"
          value={categoryId != null ? String(categoryId) : ""}
          onChange={(e) => {
            setCategoryId(e.target.value ? Number(e.target.value) : null);
            setReport(null);
          }}
          className="min-w-[280px]"
        >
          <option value="">Выберите категорию…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.path || cat.title}
            </option>
          ))}
        </AdminSelectField>
        <Button
          type="button"
          onClick={runReconcile}
          disabled={!pricingRulesReady || categoryId == null}
        >
          Сверить цены
        </Button>
      </div>

      {report ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-admin-text">{report.categoryTitle}</h4>
            <p className="text-xs text-admin-text-muted">
              Сравнено позиций: {report.totalCompared}
              {report.skippedNoStorefront > 0
                ? ` · без цены на витрине: ${report.skippedNoStorefront}`
                : ""}
              {report.skippedNoCalculated > 0
                ? ` · без калькулируемой: ${report.skippedNoCalculated}`
                : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Цена совпала" value={report.matchCount} tone="success" />
            <SummaryCard
              label="На витрине ниже"
              value={report.storefrontLowerCount}
              tone="warning"
            />
            <SummaryCard
              label="На витрине выше"
              value={report.storefrontHigherCount}
              tone="danger"
            />
          </div>

          <ReconcileSection
            title="На витрине выше калькулируемой"
            description="Позиции, где текущая витринная цена больше расчётной по формуле."
            rows={report.storefrontHigher}
            diffTone="danger"
            defaultOpen
          />
          <ReconcileSection
            title="На витрине ниже калькулируемой"
            description="Позиции, где витринная цена ниже расчётной — возможная недооценка на сайте."
            rows={report.storefrontLower}
            diffTone="warning"
            defaultOpen
          />
          <ReconcileSection
            title="Цены совпали"
            description="Калькулируемая и витринная цены совпадают."
            rows={report.matches}
            diffTone="neutral"
            defaultOpen={false}
          />
        </div>
      ) : null}
    </div>
  );
}
