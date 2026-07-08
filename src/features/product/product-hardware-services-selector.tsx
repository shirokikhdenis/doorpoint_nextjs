"use client";

import { ProductDoorOptionSection } from "@/features/product/product-door-option-section";
import { ProductOptionChip } from "@/features/product/product-option-chip";
import type { DoorHardwareServiceItem } from "@/lib/client/normalizers";

type ProductHardwareServicesSelectorProps = {
  items: DoorHardwareServiceItem[];
  selectedServiceIds: number[];
  onToggleService: (id: number) => void;
};

export function ProductHardwareServicesSelector({
  items,
  selectedServiceIds,
  onToggleService,
}: ProductHardwareServicesSelectorProps) {
  if (items.length === 0) return null;

  return (
    <ProductDoorOptionSection label="Врезка фурнитуры">
      {items.map((item) => {
        const isSelected = selectedServiceIds.includes(item.id);
        return (
          <ProductOptionChip
            key={item.id}
            label={item.name}
            price={item.price > 0 ? item.price : undefined}
            isSelected={isSelected}
            onSelect={() => onToggleService(item.id)}
          />
        );
      })}
    </ProductDoorOptionSection>
  );
}
