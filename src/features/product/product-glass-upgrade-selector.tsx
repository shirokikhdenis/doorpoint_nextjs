"use client";

import { ProductDoorOptionSection } from "@/features/product/product-door-option-section";
import { ProductOptionChip } from "@/features/product/product-option-chip";
import type { DoorGlassUpgradeItem } from "@/lib/client/normalizers";

type ProductGlassUpgradeSelectorProps = {
  items: DoorGlassUpgradeItem[];
  selectedGlassOption: DoorGlassUpgradeItem | null;
  onSelectGlassOption: (option: DoorGlassUpgradeItem | null) => void;
};

export function ProductGlassUpgradeSelector({
  items,
  selectedGlassOption,
  onSelectGlassOption,
}: ProductGlassUpgradeSelectorProps) {
  if (items.length === 0) return null;

  return (
    <ProductDoorOptionSection label="Стекло">
      {items.map((item) => {
        const isCurrent = selectedGlassOption?.id === item.id;
        return (
          <ProductOptionChip
            key={item.id}
            label={item.name}
            price={item.priceDelta > 0 ? item.priceDelta : undefined}
            isSelected={isCurrent}
            onSelect={() => onSelectGlassOption(isCurrent ? null : item)}
          />
        );
      })}
    </ProductDoorOptionSection>
  );
}
