"use client";

import { chipToneClass } from "@/features/store/storefront-ui";
import { formatPrice } from "@/lib/client/format";

export const formatOptionChipLabel = (name: string, price?: number) => {
  const trimmed = String(name || "").trim();
  if (!price) return trimmed;
  return `${trimmed} (+${formatPrice(price)})`;
};

type ProductOptionChipProps = {
  label: string;
  price?: number;
  isSelected: boolean;
  onSelect: () => void;
};

export function ProductOptionChip({
  label,
  price,
  isSelected,
  onSelect,
}: ProductOptionChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`rounded-full px-3 py-1.5 text-xs ${chipToneClass(isSelected)}`}
    >
      {formatOptionChipLabel(label, price)}
    </button>
  );
}
