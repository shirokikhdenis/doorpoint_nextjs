"use client";

import Image from "next/image";
import Link from "next/link";
import { PRODUCT_BADGE_HIT } from "@/lib/client/product-badges";
import { toPublicImageSrc } from "@/lib/client/image-src";
import {
  ActiveStatusBadge,
  DisplayOrderInput,
  HitBadgeToggle,
  SalePriceInput,
  SaleToggle,
} from "./admin-product-cells";
import { COLUMN_LABELS } from "./constants";
import type { AttributeDef, ColumnVisibility, ProductRow } from "./types";

const formatAttrValue = (value: ProductRow["attributes"][string]): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
};

const stickyHead = "sticky top-0 z-10 bg-zinc-50";
const stickyNameHead = "sticky left-10 z-20 bg-zinc-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";
const stickyCheckHead = "sticky left-0 z-20 bg-zinc-50";
const stickyNameCell =
  "sticky left-10 z-[5] bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-zinc-50";
const stickyCheckCell = "sticky left-0 z-[5] bg-white group-hover:bg-zinc-50";

type AdminProductsTableProps = {
  rows: ProductRow[];
  attributes: AttributeDef[];
  columnVisibility: ColumnVisibility;
  compact: boolean;
  loading: boolean;
  selectedIds: Set<number>;
  onToggleRow: (id: number) => void;
  onSaved: () => void;
};

export function AdminProductsTable({
  rows,
  attributes,
  columnVisibility,
  compact,
  loading,
  selectedIds,
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
              <th className={`whitespace-nowrap ${cellPad} text-right`}>{COLUMN_LABELS.order}</th>
            ) : null}
            {showColumn("id") ? <th className={cellPad}>{COLUMN_LABELS.id}</th> : null}
            {showColumn("sku") ? <th className={cellPad}>{COLUMN_LABELS.sku}</th> : null}
            {showColumn("name") ? (
              <th
                className={`${stickyNameHead} ${compact ? "min-w-[160px]" : "min-w-[220px]"} ${cellPad}`}
              >
                {COLUMN_LABELS.name}
              </th>
            ) : null}
            {showColumn("category") ? <th className={cellPad}>{COLUMN_LABELS.category}</th> : null}
            {showColumn("subcategory") ? (
              <th className={cellPad}>{COLUMN_LABELS.subcategory}</th>
            ) : null}
            {showColumn("price") ? (
              <th className={`${cellPad} text-right`}>{COLUMN_LABELS.price}</th>
            ) : null}
            {showColumn("compareAtPrice") ? (
              <th className={`${cellPad} text-right`}>{COLUMN_LABELS.compareAtPrice}</th>
            ) : null}
            {showColumn("hit") ? (
              <th className={`${cellPad} text-center`}>{COLUMN_LABELS.hit}</th>
            ) : null}
            {showColumn("sale") ? (
              <th className={`${cellPad} text-center`}>{COLUMN_LABELS.sale}</th>
            ) : null}
            {showColumn("active") ? (
              <th className={`${cellPad} text-center`}>{COLUMN_LABELS.active}</th>
            ) : null}
            {showColumn("variants") ? (
              <th className={`${cellPad} text-right`}>{COLUMN_LABELS.variants}</th>
            ) : null}
            {showColumn("images") ? (
              <th className={`${cellPad} text-right`}>{COLUMN_LABELS.images}</th>
            ) : null}
            {showColumn("modelKey") ? <th className={cellPad}>{COLUMN_LABELS.modelKey}</th> : null}
            {visibleAttributeColumns.map((attribute) => (
              <th
                key={attribute.id}
                className={`whitespace-nowrap ${cellPad}`}
                title={`${attribute.code} · ${attribute.type}${attribute.isVariantAxis ? " · variant" : ""}`}
              >
                {attribute.name}
                {attribute.isVariantAxis ? (
                  <span className="ml-1 rounded bg-violet-100 px-1 text-[9px] text-violet-700">
                    var
                  </span>
                ) : null}
              </th>
            ))}
            {showColumn("photos") ? <th className={cellPad}>{COLUMN_LABELS.photos}</th> : null}
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
                        <p className="truncate font-medium text-zinc-900" title={row.name}>
                          {row.name}
                        </p>
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
                            <p className="line-clamp-2 font-medium text-zinc-900">{row.name}</p>
                            {row.slug ? (
                              <Link
                                href={`/product/${row.slug}`}
                                target="_blank"
                                className="text-[10px] text-brand hover:underline"
                              >
                                на сайте ↗
                              </Link>
                            ) : null}
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
                    <td key={attribute.id} className={`whitespace-nowrap ${cellPad} text-zinc-700`}>
                      {formatAttrValue(row.attributes?.[attribute.code])}
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
