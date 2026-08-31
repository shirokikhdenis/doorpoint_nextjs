"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PRODUCT_BADGE_HIT } from "@/lib/client/product-badges";
import { formatProductDisplayName } from "@/lib/client/product-display-name";
import { toPublicImageSrc } from "@/lib/client/image-src";
import {
  ActiveStatusBadge,
  AttributeCell,
  DisplayOrderInput,
  HitBadgeToggle,
  SalePriceInput,
  SaleToggle,
} from "./admin-product-cells";
import { ProductSeoEditor } from "./product-seo-editor";
import { AdminProductEditor } from "./admin-product-editor";
import { COLUMN_LABELS } from "./constants";
import type {
  AttributeDef,
  CategoryRef,
  ColumnVisibility,
  ProductRow,
  ProductsTableSortDir,
  SubcategoryRef,
} from "./types";

const stickyHead = "sticky top-0 z-10 bg-zinc-50";
const stickyNameHead = "sticky left-10 z-20 bg-zinc-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";
const stickyCheckHead = "sticky left-0 z-20 bg-zinc-50";
const stickyNameCell =
  "sticky left-10 z-[5] bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-zinc-50";
const stickyCheckCell = "sticky left-0 z-[5] bg-white group-hover:bg-zinc-50";

function SortableTh({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  className = "",
  align = "left",
  extra,
}: {
  label: ReactNode;
  sortKey: string;
  sortBy: string;
  sortDir: ProductsTableSortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
  extra?: ReactNode;
}) {
  const active = sortBy === sortKey;
  const justify =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th
      className={className}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={active ? (sortDir === "asc" ? "По убыванию" : "По возрастанию") : "Сортировать"}
        className={`inline-flex w-full items-center gap-0.5 ${justify} text-inherit hover:text-zinc-800`}
      >
        <span className="truncate">{label}</span>
        {extra}
        <span
          className={`shrink-0 text-[9px] ${active ? "text-zinc-800" : "text-zinc-300"}`}
          aria-hidden
        >
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

type AdminProductsTableProps = {
  rows: ProductRow[];
  attributes: AttributeDef[];
  categories: CategoryRef[];
  subcategories: SubcategoryRef[];
  columnVisibility: ColumnVisibility;
  compact: boolean;
  editMode?: boolean;
  loading: boolean;
  selectedIds: Set<number>;
  sortBy: string;
  sortDir: ProductsTableSortDir;
  onSort: (key: string) => void;
  onToggleRow: (id: number) => void;
  onSaved: () => void;
};

export function AdminProductsTable({
  rows,
  attributes,
  categories,
  subcategories,
  columnVisibility,
  compact,
  editMode = false,
  loading,
  selectedIds,
  sortBy,
  sortDir,
  onSort,
  onToggleRow,
  onSaved,
}: AdminProductsTableProps) {
  const cellPad = compact ? "px-1.5 py-0.5" : "px-2 py-1";
  const textSize = compact ? "text-[10px]" : "text-xs";
  const visibleAttributeColumns = columnVisibility.attributes ? attributes : [];
  const showColumn = (key: keyof typeof COLUMN_LABELS) =>
    columnVisibility[key] && !(compact && key === "photos");

  const fixedVisibleCount = (Object.keys(COLUMN_LABELS) as Array<keyof typeof COLUMN_LABELS>).filter(
    (key) => showColumn(key),
  ).length;
  const colSpan = 1 + fixedVisibleCount + visibleAttributeColumns.length;

  return (
    <div className="max-h-[calc(100vh-16rem)] overflow-auto">
      <table className={`w-full min-w-[960px] text-left ${textSize}`}>
        <thead className={`${stickyHead} text-[10px] uppercase tracking-wide text-zinc-500`}>
          <tr>
            <th className={`${stickyCheckHead} w-10 ${cellPad}`}>
              <span className="sr-only">Выбор</span>
            </th>
            {showColumn("order") ? (
              <SortableTh
                className={`whitespace-nowrap ${cellPad}`}
                align="right"
                label={COLUMN_LABELS.order}
                sortKey="order"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("id") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.id}
                sortKey="id"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("sku") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.sku}
                sortKey="sku"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("name") ? (
              <SortableTh
                className={`${stickyNameHead} ${compact ? "min-w-[160px]" : "min-w-[220px]"} ${cellPad}`}
                label={COLUMN_LABELS.name}
                sortKey="name"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("category") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.category}
                sortKey="category"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("subcategory") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.subcategory}
                sortKey="subcategory"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("price") ? (
              <SortableTh
                className={cellPad}
                align="right"
                label={COLUMN_LABELS.price}
                sortKey="price"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("compareAtPrice") ? (
              <SortableTh
                className={cellPad}
                align="right"
                label={COLUMN_LABELS.compareAtPrice}
                sortKey="compareAtPrice"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("hit") ? (
              <SortableTh
                className={cellPad}
                align="center"
                label={COLUMN_LABELS.hit}
                sortKey="hit"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("sale") ? (
              <SortableTh
                className={cellPad}
                align="center"
                label={COLUMN_LABELS.sale}
                sortKey="sale"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("active") ? (
              <SortableTh
                className={cellPad}
                align="center"
                label={COLUMN_LABELS.active}
                sortKey="active"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("variants") ? (
              <SortableTh
                className={cellPad}
                align="right"
                label={COLUMN_LABELS.variants}
                sortKey="variants"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("images") ? (
              <SortableTh
                className={cellPad}
                align="right"
                label={COLUMN_LABELS.images}
                sortKey="images"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {showColumn("modelKey") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.modelKey}
                sortKey="modelKey"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
            {visibleAttributeColumns.map((attribute) => (
              <SortableTh
                key={attribute.id}
                className={`whitespace-nowrap ${cellPad}`}
                label={attribute.name}
                sortKey={`attr.${attribute.code}`}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                extra={
                  attribute.isVariantAxis ? (
                    <span className="ml-0.5 rounded bg-violet-100 px-1 text-[9px] text-violet-700">
                      var
                    </span>
                  ) : null
                }
              />
            ))}
            {showColumn("photos") ? (
              <SortableTh
                className={cellPad}
                label={COLUMN_LABELS.photos}
                sortKey="photos"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-zinc-500">
                {loading ? "Загрузка…" : "Товары не найдены"}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const selected = selectedIds.has(row.id);
              const imageSrc = compact ? "" : toPublicImageSrc(row.primaryImageUrl || row.imageUrls[0]);
              const displayName = formatProductDisplayName({
                name: row.name,
                color: row.attributes?.color,
                glass: row.attributes?.glass,
                manufacturer: row.attributes?.manufacturer,
                category: row.category,
              });
              return (
                <tr
                  key={row.id}
                  className={`group border-t border-zinc-100 ${selected ? "bg-sky-50/60" : "hover:bg-zinc-50"}`}
                >
                  <td
                    className={`${stickyCheckCell} ${cellPad} align-middle ${selected ? "!bg-sky-50/60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(row.id)}
                      aria-label={`Выбрать ${row.name}`}
                      className={`rounded border-zinc-300 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
                    />
                  </td>
                  {showColumn("order") ? (
                    <td className={`${cellPad} align-middle`}>
                      <DisplayOrderInput
                        productId={row.id}
                        displayOrder={row.displayOrder ?? 0}
                        onSaved={onSaved}
                        compact={compact}
                      />
                    </td>
                  ) : null}
                  {showColumn("id") ? (
                    <td className={`${cellPad} text-zinc-500`}>{row.id}</td>
                  ) : null}
                  {showColumn("sku") ? (
                    <td className={`${cellPad} font-mono text-zinc-700`}>{row.sku}</td>
                  ) : null}
                  {showColumn("name") ? (
                    <td
                      className={`${stickyNameCell} ${cellPad} ${compact ? "max-w-[200px]" : "max-w-[280px]"} ${selected ? "!bg-sky-50/60" : ""}`}
                    >
                      {compact ? (
                        <AdminProductEditor
                          productId={row.id}
                          productName={row.name}
                          attributes={attributes}
                          categories={categories}
                          subcategories={subcategories}
                          onSaved={onSaved}
                          className="block w-full truncate"
                        >
                          {displayName}
                        </AdminProductEditor>
                      ) : (
                        <div className="flex items-start gap-2">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt=""
                              width={36}
                              height={48}
                              className="shrink-0 rounded border border-zinc-100 object-cover"
                            />
                          ) : (
                            <span className="inline-flex h-10 w-7 shrink-0 items-center justify-center rounded bg-zinc-100 text-[9px] text-zinc-400">
                              —
                            </span>
                          )}
                          <div className="min-w-0">
                            <AdminProductEditor
                              productId={row.id}
                              productName={row.name}
                              attributes={attributes}
                              categories={categories}
                              subcategories={subcategories}
                              onSaved={onSaved}
                              className="line-clamp-2"
                            >
                              {displayName}
                            </AdminProductEditor>
                            {row.slug ? (
                              <Link
                                href={`/product/${row.slug}`}
                                target="_blank"
                                className="text-[10px] text-brand hover:underline"
                              >
                                на сайте ↗
                              </Link>
                            ) : null}
                            <div className="mt-1">
                              <ProductSeoEditor
                                productId={row.id}
                                productName={row.name}
                                seoTitle={row.seoTitle}
                                seoDescription={row.seoDescription}
                                onSaved={onSaved}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  ) : null}
                  {showColumn("category") ? (
                    <td className={`${cellPad} text-zinc-600`}>{row.category || "—"}</td>
                  ) : null}
                  {showColumn("subcategory") ? (
                    <td className={`${cellPad} text-zinc-600`}>{row.subcategory || "—"}</td>
                  ) : null}
                  {showColumn("price") ? (
                    <td className={`${cellPad} text-right`}>
                      <SalePriceInput
                        productId={row.id}
                        field="price"
                        value={row.price}
                        isOnSale={row.isOnSale}
                        compareAtPrice={row.compareAtPrice}
                        onSaved={onSaved}
                        compact={compact}
                      />
                    </td>
                  ) : null}
                  {showColumn("compareAtPrice") ? (
                    <td className={`${cellPad} text-right`}>
                      <SalePriceInput
                        productId={row.id}
                        field="compareAtPrice"
                        value={row.compareAtPrice}
                        isOnSale={row.isOnSale}
                        price={row.price}
                        onSaved={onSaved}
                        compact={compact}
                      />
                    </td>
                  ) : null}
                  {showColumn("hit") ? (
                    <td className={`${cellPad} text-center`}>
                      <HitBadgeToggle
                        productId={row.id}
                        checked={row.badges.includes(PRODUCT_BADGE_HIT)}
                        onSaved={onSaved}
                      />
                    </td>
                  ) : null}
                  {showColumn("sale") ? (
                    <td className={`${cellPad} text-center`}>
                      <SaleToggle
                        productId={row.id}
                        checked={row.isOnSale}
                        onSaved={onSaved}
                      />
                    </td>
                  ) : null}
                  {showColumn("active") ? (
                    <td className={`${cellPad} text-center`}>
                      <ActiveStatusBadge active={row.isActive} />
                    </td>
                  ) : null}
                  {showColumn("variants") ? (
                    <td className={`${cellPad} text-right text-zinc-700`}>{row.variantsCount}</td>
                  ) : null}
                  {showColumn("images") ? (
                    <td className={`${cellPad} text-right text-zinc-700`}>{row.imagesCount}</td>
                  ) : null}
                  {showColumn("modelKey") ? (
                    <td className={`${cellPad} font-mono text-[10px] text-zinc-500`}>
                      {row.modelKey || ""}
                    </td>
                  ) : null}
                  {visibleAttributeColumns.map((attribute) => (
                    <td key={attribute.id} className={`whitespace-nowrap ${cellPad}`}>
                      <AttributeCell
                        productId={row.id}
                        attribute={attribute}
                        value={row.attributes?.[attribute.code]}
                        editable={editMode}
                        compact={compact}
                        onSaved={onSaved}
                      />
                    </td>
                  ))}
                  {showColumn("photos") ? (
                    <td className={`${cellPad} align-top`}>
                      {row.imageUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.imageUrls.slice(0, 4).map((url, index) => {
                            const thumb = toPublicImageSrc(url);
                            return thumb ? (
                              <a
                                key={`${row.id}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title={url}
                              >
                                <Image
                                  src={thumb}
                                  alt=""
                                  width={40}
                                  height={56}
                                  className="rounded border border-zinc-100 object-cover"
                                />
                              </a>
                            ) : null;
                          })}
                          {row.imageUrls.length > 4 ? (
                            <span className="self-center text-[10px] text-zinc-500">
                              +{row.imageUrls.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
