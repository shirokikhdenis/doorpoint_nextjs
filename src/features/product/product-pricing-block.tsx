import { ProductPrice, PriceTag } from "@/features/store/price-tag";
import type { KitPricing } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";

type ProductPricingBlockProps = {
  price: number;
  compareAtPrice?: number | null;
  isOnSale?: boolean;
  kitPrice?: number | null;
  kitPricing?: KitPricing | null;
  className?: string;
};

const KIT_HINT_TEXT =
  "В комплект входит: 2.5 коробки, 5 наличников. Доборы и фурнитура приобретаются отдельно";

function KitPriceHint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex shrink-0 translate-y-px">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-semibold leading-none text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-1"
        aria-label={text}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-zinc-800 px-2.5 py-1.5 text-center text-xs leading-snug text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function ProductPricingBlock({
  price,
  compareAtPrice,
  isOnSale,
  kitPrice,
  className,
}: ProductPricingBlockProps) {
  if (kitPrice == null) {
    return (
      <ProductPrice
        price={price}
        compareAtPrice={compareAtPrice}
        isOnSale={isOnSale}
        className={cn("text-2xl font-semibold tabular-nums text-zinc-900", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-wrap items-start gap-x-2", className)}>
      <div className="flex flex-col gap-0.5">
        <ProductPrice
          price={price}
          compareAtPrice={compareAtPrice}
          isOnSale={isOnSale}
          layout="stacked"
          className="text-2xl font-semibold leading-tight tabular-nums text-zinc-900"
          compareClassName="text-sm"
        />
        <span className="text-xs text-zinc-400">за полотно</span>
      </div>

      <span
        className="pt-0.5 text-2xl font-light leading-none text-zinc-300"
        aria-hidden="true"
      >
        /
      </span>

      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-baseline gap-1.5">
          <PriceTag
            price={kitPrice}
            className="text-xl font-semibold leading-tight tabular-nums text-zinc-500"
          />
          <KitPriceHint text={KIT_HINT_TEXT} />
        </span>
        <span className="text-xs text-zinc-400">за комплект</span>
      </div>
    </div>
  );
}
