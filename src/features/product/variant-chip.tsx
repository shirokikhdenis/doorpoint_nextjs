import { chipToneClass, productChipButtonClass } from "@/features/store/storefront-ui";
import { cn } from "@/lib/utils";

type VariantChipProps = {
  label: string;
  image: string;
  isCurrent: boolean;
  onSelect: () => void;
  onHoverPrefetch: () => void;
};

export function VariantChip({
  label,
  image,
  isCurrent,
  onSelect,
  onHoverPrefetch,
}: VariantChipProps) {
  const thumbBorder = isCurrent ? "border-white/30" : "border-zinc-200";
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHoverPrefetch}
      onFocus={onHoverPrefetch}
      aria-pressed={isCurrent}
      disabled={isCurrent}
      className={cn(productChipButtonClass, chipToneClass(isCurrent), "disabled:cursor-default")}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={cn("h-5 w-5 rounded-md border object-cover", thumbBorder)}
        />
      ) : null}
      {label}
    </button>
  );
}
