import Link from "next/link";
import { HomeDoorOfWeekCountdown } from "@/features/home/home-door-of-week-countdown";
import { StorefrontImage } from "@/features/store/storefront-image";
import { ProductPrice } from "@/features/store/price-tag";
import { productHref } from "@/lib/client/product-url";

export type HomeDoorOfWeekItem = {
  slot: number;
  title: string;
  productId: number;
  name: string;
  sku?: string;
  slug: string;
  image?: string;
  price: number;
  compareAtPrice: number;
  isOnSale: boolean;
  discountPercent: number;
  endsAt: string;
};

type HomeDoorOfWeekProps = {
  item: HomeDoorOfWeekItem;
};

export function HomeDoorOfWeek({ item }: HomeDoorOfWeekProps) {
  const href = productHref({ id: item.productId, slug: item.slug });

  return (
    <article
      aria-labelledby={`home-door-of-week-title-${item.slot}`}
      className="h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-md sm:p-7"
    >
      <div className="flex min-h-[13.5rem] flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={href}
          className="relative mx-auto block h-52 w-full max-w-[13rem] shrink-0 transition hover:opacity-90 sm:mx-0 sm:h-60 sm:w-60"
        >
          {item.image ? (
            <StorefrontImage
              src={item.image}
              alt={item.name}
              fill
              sizes="176px"
              variant="card"
              className="object-contain object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-zinc-50 text-sm text-zinc-400">
              Нет фото
            </div>
          )}
          <span className="absolute left-2 top-2 rounded bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
            −{item.discountPercent}%
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p
            id={`home-door-of-week-title-${item.slot}`}
            className="text-xs font-semibold uppercase tracking-wide text-brand"
          >
            {item.title}
          </p>
          <h2 className="text-lg font-semibold leading-snug text-zinc-900 sm:text-xl">
            <Link href={href} className="transition hover:text-brand">
              {item.name}
            </Link>
          </h2>
          <ProductPrice
            price={item.price}
            compareAtPrice={item.compareAtPrice}
            isOnSale={item.isOnSale}
            layout="stacked"
            priceClassName="text-2xl font-bold sm:text-3xl"
            compareClassName="text-sm sm:text-base"
          />
          <div className="flex flex-col gap-2">
            <Link
              href={href}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Смотреть предложение
            </Link>
            <HomeDoorOfWeekCountdown endsAt={item.endsAt} />
          </div>
        </div>
      </div>
    </article>
  );
}
