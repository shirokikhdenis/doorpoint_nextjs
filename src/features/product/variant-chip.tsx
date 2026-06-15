import { chipToneClass } from "@/features/store/storefront-ui";

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
  const baseClass = "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs";
  const stateClass = chipToneClass(isCurrent);
  const thumbBorder = isCurrent ? "border-white/30" : "border-zinc-200";
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHoverPrefetch}
      onFocus={onHoverPrefetch}
      aria-pressed={isCurrent}
      disabled={isCurrent}
      className={`${baseClass} ${stateClass} disabled:cursor-default`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={`h-5 w-5 rounded-full border object-cover ${thumbBorder}`}
        />
      ) : null}
      {label}
    </button>
  );
}
