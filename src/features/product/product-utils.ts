import type { Variant } from "@/lib/client/normalizers";

type SalePriceSource = {
  price: number;
  isOnSale?: boolean;
  compareAtPrice?: number | null;
};

export const isProductSaleActive = (product: SalePriceSource): boolean =>
  product.isOnSale === true &&
  product.compareAtPrice != null &&
  Number.isFinite(product.compareAtPrice) &&
  product.compareAtPrice > product.price;

/** Акция на уровне товара: показываем products.price, не цену варианта. */
export const resolveProductDisplayPrice = (
  product: SalePriceSource,
  variantPrice?: number | null,
): number => {
  if (isProductSaleActive(product)) {
    return product.price;
  }
  return variantPrice ?? product.price;
};

export const variantAxesLabel = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  const source = axes.length > 0 ? axes : variant.attributes;
  if (source.length === 0) return variant.sku;
  return source.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
};

export const variantCartSuffix = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  if (axes.length === 0) return variant.sku;
  return axes.map((attribute) => attribute.value).join(", ");
};

export const buildCatalogBackHref = (): string => {
  if (typeof window === "undefined") return "/catalog";
  const slug = window.sessionStorage.getItem("lastCatalogPage");
  return slug ? `/catalog?catalogPage=${encodeURIComponent(slug)}` : "/catalog";
};

export const serializeVariantAxes = (variant: Variant | null | undefined): string => {
  if (!variant) return "";
  return variant.attributes
    .filter((attribute) => attribute.isVariantAxis)
    .map((attribute) => `${attribute.code}=${attribute.value}`)
    .sort()
    .join("|");
};
