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
import { formatPrice } from "./dveri-catalog-utils";
import type { DveriCatalogProduct } from "./types";

type AdminDveriCatalogTableProps = {
  rows: DveriCatalogProduct[];
  expandedProductId: number | string | null;
  onToggleProduct: (productId: number | string) => void;
  onBack: () => void;
  detailProduct: DveriCatalogProduct | null;
};

function ProductLink({ product, className }: { product: DveriCatalogProduct; className?: string }) {
  if (!product.url) {
    return <span className={className}>{product.title || "—"}</span>;
  }

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "font-medium text-[var(--color-brand)] underline-offset-2 hover:underline",
        className,
      )}
    >
      {product.title || "—"}
    </a>
  );
}

export function AdminDveriCatalogTable({
  rows,
  expandedProductId,
  onToggleProduct,
  onBack,
  detailProduct,
}: AdminDveriCatalogTableProps) {
  if (detailProduct) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0 space-y-1">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              ← К списку
            </Button>
            <h3 className="text-base font-semibold text-admin-text">
              <ProductLink product={detailProduct} />
            </h3>
            <p className="text-sm text-admin-text-muted">
              Артикул: {detailProduct.vendorCode || "—"} · Категория: {detailProduct.categoryPath || "—"}
            </p>
            {detailProduct.trademark ? (
              <p className="text-sm text-admin-text-muted">Бренд: {detailProduct.trademark}</p>
            ) : null}
          </div>
        </div>

        {detailProduct.optionCount > 0 ? (
          <AdminTable>
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Размер</AdminTableCell>
                <AdminTableCell header>Артикул</AdminTableCell>
                <AdminTableCell header className="text-right">
                  РРЦ
                </AdminTableCell>
                <AdminTableCell header className="text-right">
                  Дилер
                </AdminTableCell>
                <AdminTableCell header>Статус</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {detailProduct.options.map((opt) => (
                <AdminTableRow key={opt.id}>
                  <AdminTableCell>{opt.title || "—"}</AdminTableCell>
                  <AdminTableCell className="font-mono text-sm">{opt.vendorCode || "—"}</AdminTableCell>
                  <AdminTableCell className="text-right tabular-nums">{formatPrice(opt.priceFinal)}</AdminTableCell>
                  <AdminTableCell className="text-right tabular-nums">
                    {formatPrice(opt.priceDealerFinal)}
                  </AdminTableCell>
                  <AdminTableCell>{opt.label || "—"}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <div className="px-4 pb-4 text-sm text-admin-text-muted">У товара нет вариантов размеров.</div>
        )}
      </div>
    );
  }

  return (
    <AdminTable>
      <AdminTableHead>
        <AdminTableRow>
          <AdminTableCell header className="hidden md:table-cell">
            Артикул
          </AdminTableCell>
          <AdminTableCell header>Название</AdminTableCell>
          <AdminTableCell header className="hidden lg:table-cell">
            Категория
          </AdminTableCell>
          <AdminTableCell header className="hidden md:table-cell">
            Бренд
          </AdminTableCell>
          <AdminTableCell header className="text-right">
            РРЦ
          </AdminTableCell>
          <AdminTableCell header className="hidden text-right md:table-cell">
            Дилер
          </AdminTableCell>
          <AdminTableCell header className="hidden md:table-cell">
            Статус
          </AdminTableCell>
          <AdminTableCell header className="hidden md:table-cell">
            Размеры
          </AdminTableCell>
        </AdminTableRow>
      </AdminTableHead>
      <AdminTableBody>
        {rows.map((product) => {
          const isExpanded = String(expandedProductId) === String(product.id);
          const canExpand = product.optionCount > 0;

          return (
            <AdminTableRow key={product.id} className={isExpanded ? "bg-admin-surface-muted" : undefined}>
              <AdminTableCell className="hidden font-mono text-sm md:table-cell">
                {product.vendorCode || "—"}
              </AdminTableCell>
              <AdminTableCell>
                <ProductLink product={product} />
                <div className="mt-1 font-mono text-xs text-admin-text-muted md:hidden">
                  {product.vendorCode || "—"}
                </div>
              </AdminTableCell>
              <AdminTableCell className="hidden max-w-[240px] truncate lg:table-cell">
                {product.categoryPath || "—"}
              </AdminTableCell>
              <AdminTableCell className="hidden md:table-cell">{product.trademark || "—"}</AdminTableCell>
              <AdminTableCell className="text-right tabular-nums">{formatPrice(product.priceFinal)}</AdminTableCell>
              <AdminTableCell className="hidden text-right tabular-nums md:table-cell">
                {formatPrice(product.priceDealerFinal)}
              </AdminTableCell>
              <AdminTableCell className="hidden md:table-cell">{product.label || "—"}</AdminTableCell>
              <AdminTableCell className="hidden md:table-cell">
                {canExpand ? (
                  <button
                    type="button"
                    onClick={() => onToggleProduct(product.id)}
                    className="text-[var(--color-brand)] underline-offset-2 hover:underline"
                  >
                    {product.optionCount}
                  </button>
                ) : (
                  "—"
                )}
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </AdminTableBody>
    </AdminTable>
  );
}
