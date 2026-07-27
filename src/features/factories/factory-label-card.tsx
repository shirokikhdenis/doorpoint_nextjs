import Link from "next/link";
import { StorefrontImage } from "@/features/store/storefront-image";
import { FactoryLabelCardImageStack } from "@/features/factories/factory-label-card-image-stack";
import { factoryLabelCardClass, factoryLabelCardImagePanelClass } from "@/features/store/storefront-ui";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type FactoryCatalogLink = {
  label: string;
  href: string;
};

export type FactoryLabelItem = {
  name: string;
  badgeLabel: string;
  description?: string;
  productCount: number;
  logoImage: string | null;
  doorImage: string | null;
  doorImages: string[];
  linkTarget: "collections" | "catalog";
  href: string;
  catalogLinks: FactoryCatalogLink[] | null;
};

type FactoryLabelCardProps = {
  item: FactoryLabelItem;
};

const ctaClassName =
  "text-xs font-medium text-zinc-700 transition hover:text-brand sm:text-sm";

function modelsInCatalogLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "модель в каталоге";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "модели в каталоге";
  return "моделей в каталоге";
}

function FactoryCardBody({ item }: FactoryLabelCardProps) {
  const logoSrc = toPublicImageSrc(item.logoImage);

  return (
    <>
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

          {logoSrc ? <p className="sr-only">{item.name}</p> : null}

          <p className="text-xs text-zinc-600 sm:text-sm">
            {item.productCount} {modelsInCatalogLabel(item.productCount)}
          </p>

          {item.description?.trim() ? (
            <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{item.description}</p>
          ) : null}
        </div>

        {item.catalogLinks?.length ? (
          <div className="flex flex-col gap-2">
            {item.catalogLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={ctaClassName}
              >
                {link.label} →
              </Link>
            ))}
          </div>
        ) : (
          <span className={ctaClassName}>
            {item.linkTarget === "catalog" ? "Смотреть модели →" : "Смотреть коллекции →"}
          </span>
        )}
      </div>

      <div className={factoryLabelCardImagePanelClass}>
        <FactoryLabelCardImageStack images={item.doorImages} />
      </div>
    </>
  );
}

export function FactoryLabelCard({ item }: FactoryLabelCardProps) {
  if (item.catalogLinks?.length) {
    return (
      <div className={factoryLabelCardClass}>
        <FactoryCardBody item={item} />
      </div>
    );
  }

  return (
    <Link href={item.href} prefetch={false} className={factoryLabelCardClass}>
      <FactoryCardBody item={item} />
    </Link>
  );
}
