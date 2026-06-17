import type { Variant } from "@/lib/client/normalizers";
import type { KitPricing } from "@/lib/client/normalizers";

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

/** Цена комплекта: полотно + 2,5 коробки + 5 наличников (погонаж с pogonazh_komplekt). */
export const computeInteriorKitPrice = (
  doorPrice: number,
  kitPricing?: KitPricing | null,
): number | null => {
  if (!kitPricing?.available || !kitPricing.korobka || !kitPricing.nalichnik) {
    return null;
  }
  const door = Math.round(Number(doorPrice));
  const korobka = Math.round(Number(kitPricing.korobka.price));
  const nalichnik = Math.round(Number(kitPricing.nalichnik.price));
  if (!Number.isFinite(door) || !Number.isFinite(korobka) || !Number.isFinite(nalichnik)) {
    return null;
  }
  return Math.round(
    door + kitPricing.korobkaQty * korobka + kitPricing.nalichnikQty * nalichnik,
  );
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

const DEFAULT_CATALOG_FALLBACK = "/catalog";

export const catalogBackHrefFromPageSlug = (slug: string | null | undefined): string => {
  const trimmed = String(slug || "").trim();
  return trimmed
    ? `/catalog?catalogPage=${encodeURIComponent(trimmed)}`
    : DEFAULT_CATALOG_FALLBACK;
};

export const buildCatalogBackHref = (): string => {
  if (typeof window === "undefined") return DEFAULT_CATALOG_FALLBACK;
  return catalogBackHrefFromPageSlug(window.sessionStorage.getItem("lastCatalogPage"));
};

export const serializeVariantAxes = (variant: Variant | null | undefined): string => {
  if (!variant) return "";
  return variant.attributes
    .filter((attribute) => attribute.isVariantAxis)
    .map((attribute) => `${attribute.code}=${attribute.value}`)
    .sort()
    .join("|");
};
