import type { ProductBadge } from "@/lib/client/product-badges";
import { DEFAULT_PRODUCT_FLAG_COLOR } from "@/lib/client/product-flag";

const badgeClassName = (code: string) => {
  if (code === "hit") {
    return "bg-amber-500 text-white";
  }
  if (code === "sale") {
    return "bg-rose-600 text-white";
  }
  return "bg-zinc-800 text-white";
};

const badgeShellClass =
  "rounded px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-white sm:text-xs";

export function ProductCardBadges({
  badges,
  flagLabel,
  flagColor,
  className = "",
}: {
  badges: ProductBadge[];
  flagLabel?: string | null;
  flagColor?: string | null;
  className?: string;
}) {
  const customLabel = String(flagLabel || "").trim();
  const customColor = String(flagColor || "").trim() || DEFAULT_PRODUCT_FLAG_COLOR;
  if (badges.length === 0 && !customLabel) return null;

  return (
    <div
      className={`pointer-events-none absolute right-2 top-2 z-10 flex flex-wrap justify-end gap-1 ${className}`}
    >
      {customLabel ? (
        <span className={badgeShellClass} style={{ backgroundColor: customColor }}>
          {customLabel}
        </span>
      ) : null}
      {badges.map((badge) => (
        <span key={badge.code} className={`${badgeShellClass} ${badgeClassName(badge.code)}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
