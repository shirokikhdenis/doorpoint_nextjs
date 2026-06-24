"use client";

import { StorefrontImage } from "@/features/store/storefront-image";
import type { DoorFinishItem } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";
import { formatFinishPriceDelta } from "@/features/product/finish-picker-utils";

type FinishPickerFinishCardProps = {
  item: DoorFinishItem;
  selected: boolean;
  onSelect: () => void;
  imageSizes?: string;
  compact?: boolean;
};

export function FinishPickerFinishCard({
  item,
  selected,
  onSelect,
  imageSizes = "(max-width: 640px) 33vw, 12vw",
  compact = false,
}: FinishPickerFinishCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border text-left transition",
        selected ? "border-brand ring-2 ring-brand/20" : "border-zinc-200 hover:border-zinc-400",
      )}
    >
      <div className="relative aspect-square bg-zinc-50">
        {item.image ? (
          <StorefrontImage
            src={item.image}
            alt={item.name}
            fill
            sizes={imageSizes}
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full items-center justify-center text-zinc-400",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            Нет фото
          </div>
        )}
      </div>
      <div className={cn(compact ? "space-y-0.5 p-1.5" : "space-y-1 p-2")}>
        <p
          className={cn(
            "line-clamp-2 font-medium text-zinc-900",
            compact ? "text-[11px] leading-tight" : "text-sm",
          )}
        >
          {item.name}
        </p>
        <p className={cn("text-zinc-500", compact ? "text-[10px]" : "text-xs")}>
          {formatFinishPriceDelta(item.priceDelta)}
        </p>
      </div>
    </button>
  );
}
