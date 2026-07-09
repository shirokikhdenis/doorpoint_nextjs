import Link from "next/link";
import { StorefrontImage } from "@/features/store/storefront-image";
import { factoryLabelCardClass, factoryLabelCardImageClass, factoryLabelCardImageFrameClass, factoryLabelCardImagePanelClass, factoryLabelCardImageSizes } from "@/features/store/storefront-ui";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type CollectionLabelItem = {
  name: string;
  description: string;
  productCount: number;
  coverImage: string | null;
  catalogHref: string;
};

type CollectionLabelCardProps = {
  item: CollectionLabelItem;
};

function modelsInCatalogLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "модель в каталоге";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "модели в каталоге";
  return "моделей в каталоге";
}

export function CollectionLabelCard({ item }: CollectionLabelCardProps) {
  const imageSrc = toPublicImageSrc(item.coverImage);

  return (
    <Link
      href={item.catalogHref}
      prefetch={false}
      className={factoryLabelCardClass}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:gap-5 sm:p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-bold leading-tight text-zinc-900 sm:text-xl">{item.name}</h3>

          <p className="text-xs text-zinc-600 sm:text-sm">
            {item.productCount} {modelsInCatalogLabel(item.productCount)}
          </p>

          {item.description.trim() ? (
            <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{item.description}</p>
          ) : null}
        </div>

        <span className="text-xs font-medium text-zinc-700 transition group-hover:text-brand sm:text-sm">
          Смотреть модели →
        </span>
      </div>

      <div className={factoryLabelCardImagePanelClass}>
        {imageSrc ? (
          <div className={factoryLabelCardImageFrameClass}>
            <StorefrontImage
              src={imageSrc}
              alt=""
              fill
              sizes={factoryLabelCardImageSizes}
              className={factoryLabelCardImageClass}
            />
          </div>
        ) : (
          <div className={`${factoryLabelCardImageFrameClass} bg-gradient-to-br from-zinc-100 to-zinc-200`} aria-hidden />
        )}
      </div>
    </Link>
  );
}
