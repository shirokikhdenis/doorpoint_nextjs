"use client";

import { ProductDoorOptionSection } from "@/features/product/product-door-option-section";
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
  const hasColor = product.colorVariants.length > 1;
  const hasGlass = product.glassVariants.length > 1;
  const hasAxes = variantAxes.length > 0;
  const hasVariantSelect = !hasAxes && product.variants.length > 1;

  if (!hasColor && !hasGlass && !hasAxes && !hasVariantSelect) {
    return null;
  }

  return (
    <div className="space-y-3">
      {hasColor ? (
        <ProductDoorOptionSection label="Цвет">
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
        </ProductDoorOptionSection>
      ) : null}
      {hasGlass ? (
        <ProductDoorOptionSection label="Стекло">
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
        </ProductDoorOptionSection>
      ) : null}
      {hasAxes
        ? variantAxes.map((axis) => (
            <ProductDoorOptionSection key={axis.code} label={axis.name}>
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
            </ProductDoorOptionSection>
          ))
        : hasVariantSelect ? (
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium text-zinc-600">Вариант</span>
              <select
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
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
          ) : null}
    </div>
  );
}
