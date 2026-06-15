import type { ProductBadge } from "@/lib/client/product-badges";

const badgeClassName = (code: string) => {
  if (code === "hit") {
    return "bg-amber-500 text-white";
  }
  return "bg-zinc-800 text-white";
};

export function ProductCardBadges({
  badges,
  className = "",
}: {
  badges: ProductBadge[];
  className?: string;
}) {
  if (badges.length === 0) return null;

  return (
    <div className={`pointer-events-none absolute right-2 top-2 z-10 flex flex-wrap justify-end gap-1 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.code}
          className={`rounded px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide sm:text-xs ${badgeClassName(badge.code)}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
