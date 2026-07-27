"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/client/format";
import { cn } from "@/lib/utils";
import { productHref } from "@/lib/client/product-url";
import { getCategoryLabel } from "./exhibition-utils";
import type { ExhibitionDoorRow, ExhibitionMeta, ExhibitionTableSection } from "./types";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";

type AdminExhibitionTableProps = {
  sections: ExhibitionTableSection[];
  meta: ExhibitionMeta | null;
  showGroupHeaders: boolean;
  selectedIds: Set<number>;
  pageInteriorIds: number[];
  allPageInteriorSelected: boolean;
  downloadingId: number | null;
  onToggleRow: (id: number) => void;
  onTogglePageSelection: () => void;
  onEdit: (row: ExhibitionDoorRow) => void;
  onDelete: (row: ExhibitionDoorRow) => void;
  onDownloadPriceTag: (row: ExhibitionDoorRow) => void;
};

function AccessoriesCell({ accessories }: { accessories: ExhibitionDoorRow["accessories"] }) {
  const [open, setOpen] = useState(false);

  if (accessories.length === 0) {
    return <span className="text-admin-text-muted">—</span>;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="text-left text-sm text-[var(--color-brand)] hover:underline"
        onClick={() => setOpen((value) => !value)}
      >
        {accessories.length} шт.
      </button>
      {open ? (
        <ul className="space-y-1 text-xs text-admin-text-secondary">
          {accessories.map((item) => (
            <li key={`${item.id}-${item.sku}`}>
              {item.name}
              {item.price > 0 ? ` — ${formatPrice(item.price)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ProductNameCell({ row }: { row: ExhibitionDoorRow }) {
  if (!row.productId) {
    return (
      <div className="min-w-0">
        <p className="font-medium text-admin-text">{row.productName}</p>
        {row.productSku ? (
          <p className="text-xs text-admin-text-muted">{row.productSku}</p>
        ) : null}
      </div>
    );
  }

  const href = productHref({ id: row.productId, slug: row.productSlug });

  return (
    <div className="min-w-0">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-medium text-[var(--color-brand)] underline-offset-2 hover:underline",
        )}
      >
        {row.productName}
      </a>
      {row.productSku ? (
        <p className="text-xs text-admin-text-muted">{row.productSku}</p>
      ) : null}
    </div>
  );
}

export function AdminExhibitionTable({
  sections,
  meta,
  showGroupHeaders,
  selectedIds,
  pageInteriorIds,
  allPageInteriorSelected,
  downloadingId,
  onToggleRow,
  onTogglePageSelection,
  onEdit,
  onDelete,
  onDownloadPriceTag,
}: AdminExhibitionTableProps) {
  const colSpan = 11;

  return (
    <AdminTable>
      <AdminTableHead>
        <AdminTableRow>
          <AdminTableCell header className="w-10">
            <input
              type="checkbox"
              aria-label="Выбрать все межкомнатные на странице"
              checked={pageInteriorIds.length > 0 && allPageInteriorSelected}
              disabled={pageInteriorIds.length === 0}
              onChange={onTogglePageSelection}
            />
          </AdminTableCell>
          <AdminTableCell header>Категория</AdminTableCell>
          <AdminTableCell header>Наименование</AdminTableCell>
          <AdminTableCell header>Цвет</AdminTableCell>
          <AdminTableCell header>Вид покрытия</AdminTableCell>
          <AdminTableCell header>Фабрика</AdminTableCell>
          <AdminTableCell header>Комплектующие</AdminTableCell>
          <AdminTableCell header>Цена</AdminTableCell>
          <AdminTableCell header>Цена комплекта</AdminTableCell>
          <AdminTableCell header className="min-w-[12rem]">
            Действия
          </AdminTableCell>
        </AdminTableRow>
      </AdminTableHead>
      <AdminTableBody>
        {sections.map((section) => (
          <Fragment key={section.key}>
            {showGroupHeaders && section.label ? (
              <AdminTableRow className="bg-admin-surface-muted">
                <AdminTableCell colSpan={colSpan} className="font-semibold text-admin-text">
                  {section.label}
                </AdminTableCell>
              </AdminTableRow>
            ) : null}
            {section.rows.map((row) => {
              const isInterior = row.categoryType === "interior";
              const isSelected = selectedIds.has(row.id);
              const isDownloading = downloadingId === row.id;

              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>
                    <input
                      type="checkbox"
                      aria-label={`Выбрать ${row.productName}`}
                      checked={isSelected}
                      disabled={!isInterior}
                      title={
                        isInterior
                          ? "Выбрать для массового скачивания ценников"
                          : "Макет ценника для входных дверей в разработке"
                      }
                      onChange={() => onToggleRow(row.id)}
                    />
                  </AdminTableCell>
                  <AdminTableCell>{getCategoryLabel(row.categoryType, meta ?? undefined)}</AdminTableCell>
                  <AdminTableCell>
                    <ProductNameCell row={row} />
                  </AdminTableCell>
                  <AdminTableCell>{row.coatingColor || "—"}</AdminTableCell>
                  <AdminTableCell>{row.coatingType || "—"}</AdminTableCell>
                  <AdminTableCell>{row.manufacturerName || "—"}</AdminTableCell>
                  <AdminTableCell>
                    <AccessoriesCell accessories={row.accessories} />
                  </AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap tabular-nums">
                    {row.price != null ? formatPrice(row.price) : "—"}
                  </AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap tabular-nums">
                    {isInterior && row.kitPrice != null ? formatPrice(row.kitPrice) : "—"}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex flex-wrap gap-2">
                      {isInterior ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isDownloading}
                          onClick={() => onDownloadPriceTag(row)}
                        >
                          {isDownloading ? "PDF…" : "Ценник"}
                        </Button>
                      ) : null}
                      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)}>
                        Изменить
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(row)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </Fragment>
        ))}
      </AdminTableBody>
    </AdminTable>
  );
}
