"use client";

import { Button } from "@/components/ui/button";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { cn } from "@/lib/utils";
import {
  formatNum,
  getStockValue,
  getWarehouseBreakdown,
  stockToneClass,
  warehouseLabel,
} from "./promet-stock-utils";
import type { PrometStockRow } from "./types";

type AdminPrometStockTableProps = {
  rows: PrometStockRow[];
  warehouses: string[];
  warehouseCol: string;
  expandedProductId: string | number | null;
  onToggleProduct: (productId: string | number) => void;
  onBack: () => void;
  detailRow: PrometStockRow | null;
};

function ArticleButton({
  article,
  active,
  onClick,
  className,
}: {
  article: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left font-medium text-[var(--color-brand)] underline-offset-2 hover:underline",
        active && "underline",
        className,
      )}
    >
      {article || "—"}
    </button>
  );
}

export function AdminPrometStockTable({
  rows,
  warehouses,
  warehouseCol,
  expandedProductId,
  onToggleProduct,
  onBack,
  detailRow,
}: AdminPrometStockTableProps) {
  if (detailRow) {
    const breakdown = getWarehouseBreakdown(detailRow, warehouses);
    const total = Number(detailRow["Факт"] ?? 0);
    const name = String(detailRow["Наименование"] ?? "—");
    const article = String(detailRow["Артикул"] ?? "—");

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0 space-y-1">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              ← К списку
            </Button>
            <h3 className="text-base font-semibold text-admin-text">{name}</h3>
            <p className="text-sm text-admin-text-muted">
              Артикул: {article} · Итого: {formatNum(total)}
            </p>
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header>Склад / филиал</AdminTableCell>
              <AdminTableCell header className="text-right">
                Остаток
              </AdminTableCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            <AdminTableRow className="bg-admin-surface-muted">
              <AdminTableCell className="font-semibold text-admin-text">Итого (Факт)</AdminTableCell>
              <AdminTableCell className={cn("text-right font-semibold", stockToneClass(total))}>
                {formatNum(total)}
              </AdminTableCell>
            </AdminTableRow>
            {breakdown.map((item) => (
              <AdminTableRow key={item.col}>
                <AdminTableCell>{item.name}</AdminTableCell>
                <AdminTableCell className={cn("text-right tabular-nums", stockToneClass(item.stock))}>
                  {formatNum(item.stock)}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </div>
    );
  }

  const stockHeader = warehouseCol ? `Остаток (${warehouseLabel(warehouseCol)})` : "Факт";
  const stockShort = warehouseCol ? warehouseLabel(warehouseCol) : "Факт";

  return (
    <AdminTable>
      <AdminTableHead>
        <AdminTableRow>
          <AdminTableCell header className="hidden md:table-cell">
            Артикул
          </AdminTableCell>
          <AdminTableCell header>Наименование</AdminTableCell>
          <AdminTableCell header className="text-right">
            <span className="hidden md:inline">{stockHeader}</span>
            <span className="md:hidden">{stockShort}</span>
          </AdminTableCell>
          <AdminTableCell header className="hidden md:table-cell">
            Статус
          </AdminTableCell>
          <AdminTableCell header className="hidden text-right md:table-cell">
            Цена
          </AdminTableCell>
          <AdminTableCell header className="hidden md:table-cell">
            Группа
          </AdminTableCell>
        </AdminTableRow>
      </AdminTableHead>
      <AdminTableBody>
        {rows.map((row) => {
          const productId = row["ID товара"];
          const article = String(row["Артикул"] ?? "");
          const name = String(row["Наименование"] ?? "");
          const stock = getStockValue(row, warehouseCol);
          const isExpanded = String(expandedProductId) === String(productId);

          return (
            <AdminTableRow key={String(productId)} className={isExpanded ? "bg-admin-surface-muted" : undefined}>
              <AdminTableCell className="hidden md:table-cell">
                <ArticleButton
                  article={article}
                  active={isExpanded}
                  onClick={() => onToggleProduct(productId as string | number)}
                />
              </AdminTableCell>
              <AdminTableCell>
                <div className="font-medium text-admin-text">{name || "—"}</div>
                <ArticleButton
                  article={article}
                  active={isExpanded}
                  onClick={() => onToggleProduct(productId as string | number)}
                  className="mt-1 text-xs md:hidden"
                />
              </AdminTableCell>
              <AdminTableCell className={cn("text-right tabular-nums", stockToneClass(stock))}>
                {formatNum(stock)}
              </AdminTableCell>
              <AdminTableCell className="hidden md:table-cell">{String(row["Статус"] ?? "")}</AdminTableCell>
              <AdminTableCell className="hidden text-right tabular-nums md:table-cell">
                {formatNum(Number(row["Цена"] ?? 0))}
              </AdminTableCell>
              <AdminTableCell className="hidden md:table-cell">{String(row["Группа"] ?? "")}</AdminTableCell>
            </AdminTableRow>
          );
        })}
      </AdminTableBody>
    </AdminTable>
  );
}
