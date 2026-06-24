import { StorefrontImage } from "@/features/store/storefront-image";

type ProductManufacturerLogoProps = {
  logoUrl: string;
  manufacturerName: string;
};

export function ProductManufacturerLogo({ logoUrl, manufacturerName }: ProductManufacturerLogoProps) {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-10"
      aria-hidden={!manufacturerName}
    >
      <div className="relative h-12 w-28 sm:h-14 sm:w-32">
        <StorefrontImage
          src={logoUrl}
          alt={manufacturerName}
          fill
          sizes="(max-width: 640px) 112px, 128px"
          className="object-contain object-right"
        />
      </div>
      <span className="sr-only">{manufacturerName}</span>
    </div>
  );
}
