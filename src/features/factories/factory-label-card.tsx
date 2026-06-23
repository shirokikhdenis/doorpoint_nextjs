import Link from "next/link";
import { StorefrontImage } from "@/features/store/storefront-image";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type FactoryLabelItem = {
  name: string;
  badgeLabel: string;
  productCount: number;
  logoImage: string | null;
  doorImage: string | null;
  linkTarget: "collections" | "catalog";
  href: string;
};

type FactoryLabelCardProps = {
  item: FactoryLabelItem;
};

function modelsInCatalogLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "модель в каталоге";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "модели в каталоге";
  return "моделей в каталоге";
}

export function FactoryLabelCard({ item }: FactoryLabelCardProps) {
  const logoSrc = toPublicImageSrc(item.logoImage);
  const doorSrc = toPublicImageSrc(item.doorImage);
  const ctaLabel =
    item.linkTarget === "catalog" ? "Смотреть модели →" : "Смотреть коллекции →";

  return (
    <Link
      href={item.href}
      prefetch={false}
      className="group flex min-h-[240px] w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md transition hover:border-brand/25 hover:shadow-lg sm:min-h-[270px]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:gap-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:text-xs">
            {item.badgeLabel}
          </p>

          {logoSrc ? (
            <div className="relative h-14 w-40 sm:h-16 sm:w-48">
              <StorefrontImage
                src={logoSrc}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-contain object-left"
              />
            </div>
          ) : (
            <h3 className="text-lg font-bold leading-tight text-zinc-900 sm:text-xl">{item.name}</h3>
          )}

          {logoSrc ? (
            <p className="sr-only">{item.name}</p>
          ) : null}

          <p className="text-xs text-zinc-600 sm:text-sm">
            {item.productCount} {modelsInCatalogLabel(item.productCount)}
          </p>
        </div>

        <span className="text-xs font-medium text-zinc-700 transition group-hover:text-brand sm:text-sm">
          {ctaLabel}
        </span>
      </div>

      <div className="relative w-[38%] shrink-0 self-stretch border-l border-zinc-100 bg-zinc-50 sm:w-[36%]">
        {doorSrc ? (
          <StorefrontImage
            src={doorSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 38vw, 18vw"
            className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" aria-hidden />
        )}
      </div>
    </Link>
  );
}
