import { formatPrice } from "@/lib/client/format";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  price: number;
  className?: string;
};

export function PriceTag({ price, className }: PriceTagProps) {
  return <span className={cn(className)}>{formatPrice(price)}</span>;
}

type ProductPriceProps = {
  price: number;
  compareAtPrice?: number | null;
  isOnSale?: boolean;
  className?: string;
  compareClassName?: string;
  showDiscountBadge?: boolean;
  /** `stacked` — для узких карточек: цена и бейдж сверху, старая цена строкой ниже */
  layout?: "inline" | "stacked";
};

export function ProductPrice({
  price,
  compareAtPrice,
  isOnSale,
  className,
  compareClassName,
  showDiscountBadge = true,
  layout = "inline",
}: ProductPriceProps) {
  const saleActive =
    isOnSale === true &&
    compareAtPrice != null &&
    Number.isFinite(compareAtPrice) &&
    compareAtPrice > price;

  if (!saleActive) {
    return <PriceTag price={price} className={className} />;
  }

  const discount = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  const discountBadge =
    showDiscountBadge && discount > 0 ? (
      <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
        −{discount}%
      </span>
    ) : null;

  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold leading-none text-rose-600">{formatPrice(price)}</span>
          {discountBadge}
        </div>
        <span className={cn("text-xs leading-none text-zinc-400 line-through", compareClassName)}>
          {formatPrice(compareAtPrice)}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className="font-semibold text-rose-600">{formatPrice(price)}</span>
      <span className={cn("text-sm text-zinc-400 line-through", compareClassName)}>
        {formatPrice(compareAtPrice)}
      </span>
      {discountBadge}
    </span>
  );
}
