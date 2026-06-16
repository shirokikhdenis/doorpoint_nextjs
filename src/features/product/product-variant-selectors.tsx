"use client";

import { resolveProductDisplayPrice, variantAxesLabel } from "@/features/product/product-utils";
import { VariantChip } from "@/features/product/variant-chip";
import { formatPrice } from "@/lib/client/format";
import type { ProductData, Variant } from "@/lib/client/normalizers";

type ProductVariantSelectorsProps = {
  product: ProductData;
  selectedNumericId: number;
  variantSku: string;
  variantAxes: Array<{ code: string; name: string; options: string[] }>;
  currentAxisValues: Record<string, string>;
  onSwitchToSlug: (slug: string) => void;
  onPrefetch: (slug: string) => void;
  onSelectAxisValue: (code: string, value: string) => void;
  onVariantSkuChange: (sku: string) => void;
};

export function ProductVariantSelectors({
  product,
  selectedNumericId,
  variantSku,
  variantAxes,
  currentAxisValues,
  onSwitchToSlug,
  onPrefetch,
  onSelectAxisValue,
  onVariantSkuChange,
}: ProductVariantSelectorsProps) {
  return (
    <>
      {product.colorVariants.length > 1 ? (
        <div className="space-y-2">
          <span className="text-sm text-zinc-600">Цвет</span>
          <div className="flex flex-wrap gap-2">
            {product.colorVariants.map((entry) => (
              <VariantChip
                key={entry.id}
                label={entry.color || "—"}
                image={entry.image}
                isCurrent={entry.id === selectedNumericId}
                onSelect={() => entry.slug && onSwitchToSlug(entry.slug)}
                onHoverPrefetch={() => entry.slug && onPrefetch(entry.slug)}
              />
            ))}
          </div>
        </div>
      ) : null}
      {product.glassVariants.length > 1 ? (
        <div className="space-y-2">
          <span className="text-sm text-zinc-600">Стекло</span>
          <div className="flex flex-wrap gap-2">
            {product.glassVariants.map((entry) => (
              <VariantChip
                key={entry.id}
                label={entry.glass || "—"}
                image={entry.image}
                isCurrent={entry.id === selectedNumericId}
                onSelect={() => entry.slug && onSwitchToSlug(entry.slug)}
                onHoverPrefetch={() => entry.slug && onPrefetch(entry.slug)}
              />
            ))}
          </div>
        </div>
      ) : null}
      {variantAxes.length > 0
        ? variantAxes.map((axis) => (
            <div key={axis.code} className="space-y-2">
              <span className="text-sm text-zinc-600">{axis.name}</span>
              <div className="flex flex-wrap gap-2">
                {axis.options.map((value) => (
                  <VariantChip
                    key={value}
                    label={value}
                    image=""
                    isCurrent={currentAxisValues[axis.code] === value}
                    onSelect={() => onSelectAxisValue(axis.code, value)}
                    onHoverPrefetch={() => {}}
                  />
                ))}
              </div>
            </div>
          ))
        : product.variants.length > 1 && (
            <label className="block space-y-1">
              <span className="text-sm text-zinc-600">Вариант</span>
              <select
                className="w-full rounded border px-3 py-2"
                value={variantSku}
                onChange={(event) => onVariantSkuChange(event.target.value)}
              >
                {product.variants.map((variant: Variant) => (
                  <option key={variant.sku} value={variant.sku}>
                    {variantAxesLabel(variant)} —{" "}
                    {formatPrice(resolveProductDisplayPrice(product, variant.price))}
                  </option>
                ))}
              </select>
            </label>
          )}
    </>
  );
}
