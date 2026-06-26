import type { Variant } from "@/lib/client/normalizers";
import type { KitPricing } from "@/lib/client/normalizers";
import {
  isProductSaleActive,
  isSingleVariantWithoutAxes,
  resolveProductDisplayPrice,
} from "@/features/product/product-display-price";

export { isProductSaleActive, isSingleVariantWithoutAxes, resolveProductDisplayPrice };

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

import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import { buildCatalogPublicHrefFromFlat, catalogPagePath } from "@/lib/catalog-url";

/** Корневая категория товара → slug витрины каталога. */
const PRODUCT_CATEGORY_TO_CATALOG_PAGE: Record<string, string> = {
  "entry-doors": CATALOG_PAGE_SLUG.entryDoors,
  "interior-doors": CATALOG_PAGE_SLUG.interiorDoors,
  fittings: CATALOG_PAGE_SLUG.fittings,
};

/** Подкатегория с отдельной витриной → slug витрины (без query-фильтра). */
const PRODUCT_SUBCATEGORY_TO_CATALOG_PAGE: Record<string, string> = {
  "двери-с-терморазрывом": CATALOG_PAGE_SLUG.thermalBreakDoors,
  "двери-в-квартиру": CATALOG_PAGE_SLUG.entryDoors,
};

export const productCategoryCatalogHref = (
  categorySlug?: string | null,
): string | null => {
  const slug = String(categorySlug ?? "").trim();
  if (!slug) return null;
  const catalogPage = PRODUCT_CATEGORY_TO_CATALOG_PAGE[slug];
  if (!catalogPage) return null;
  return catalogPagePath(catalogPage);
};

export const productSubcategoryCatalogHref = (
  categorySlug?: string | null,
  subcategorySlug?: string | null,
): string | null => {
  const rootSlug = String(categorySlug ?? "").trim();
  const subSlug = String(subcategorySlug ?? "").trim();
  if (!rootSlug || !subSlug) return null;

  const dedicatedPage = PRODUCT_SUBCATEGORY_TO_CATALOG_PAGE[subSlug];
  if (dedicatedPage) {
    return catalogPagePath(dedicatedPage);
  }

  const catalogPage = PRODUCT_CATEGORY_TO_CATALOG_PAGE[rootSlug];
  if (!catalogPage) return null;
  return buildCatalogPublicHrefFromFlat(catalogPage, { subcategories: subSlug });
};

const DEFAULT_CATALOG_FALLBACK = "/catalog";

export const catalogBackHrefFromPageSlug = (slug: string | null | undefined): string => {
  const trimmed = String(slug || "").trim();
  return trimmed ? catalogPagePath(trimmed) : DEFAULT_CATALOG_FALLBACK;
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
