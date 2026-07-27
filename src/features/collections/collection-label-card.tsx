import Link from "next/link";
import { FactoryLabelCardImageStack } from "@/features/factories/factory-label-card-image-stack";
import { factoryLabelCardClass, factoryLabelCardImagePanelClass } from "@/features/store/storefront-ui";

export type CollectionLabelItem = {
  name: string;
  description: string;
  productCount: number;
  coverImage: string | null;
  doorImages: string[];
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
        <FactoryLabelCardImageStack images={item.doorImages} />
      </div>
    </Link>
  );
}
