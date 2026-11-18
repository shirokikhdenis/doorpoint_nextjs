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

/** Комплект под высоту полотна: 230 → tall, иначе 200. */
export const resolveKitPricingForLeafHeight = (
  product: {
    kitPricing?: KitPricing | null;
    kitPricingByLeafHeight?: { 200?: KitPricing | null; 230?: KitPricing | null } | null;
  } | null | undefined,
  leafHeightCm: string | number | null | undefined,
): KitPricing | null => {
  const height = Number(leafHeightCm);
  const bucket = Number.isFinite(height) && height >= 225 ? 230 : 200;
  const byHeight = product?.kitPricingByLeafHeight?.[bucket];
  if (byHeight?.available) return byHeight;
  return product?.kitPricing ?? null;
};

export const variantAxesLabel = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  const source = axes.length > 0 ? axes : variant.attributes;
  if (source.length === 0) return variant.sku;
  return source.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
};

export const variantCartSuffix = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  if (axes.length === 0) return "";
  return axes.map((attribute) => attribute.value).join(", ");
};

import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import {
  buildCatalogPublicHrefFromFlat,
  catalogHrefFromFilters,
  catalogPagePath,
} from "@/lib/catalog-url";

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

const emptyCatalogFilterState = (): CatalogFilterState => ({
  search: "",
  sort: "popularity",
  categories: [],
  subcategories: [],
  attrSelections: {},
  attrRanges: {},
  priceRange: { min: "", max: "" },
  onSale: false,
});

/** Витрина производителя с фильтром по цвету покрытия из характеристик. */
export const productManufacturerColorCatalogHref = (
  categorySlug?: string | null,
  manufacturerName?: string | null,
  color?: string | null,
): string | null => {
  const rootSlug = String(categorySlug ?? "").trim();
  const manufacturer = String(manufacturerName ?? "").trim();
  const colorValue = String(color ?? "").trim();
  const catalogPage = PRODUCT_CATEGORY_TO_CATALOG_PAGE[rootSlug];
  if (!catalogPage || !manufacturer || !colorValue) return null;

  return catalogHrefFromFilters(catalogPage, {
    ...emptyCatalogFilterState(),
    attrSelections: {
      manufacturer: [manufacturer],
      color: [colorValue],
    },
  });
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

/** Парсит размер полотна вида `200x60` / `200×60` / `200*60`. */
export const parseLeafSizeValue = (
  raw: string | null | undefined,
): { height: string; width: string } | null => {
  const text = String(raw || "").trim();
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)$/i);
  if (!match) return null;
  return { height: match[1].replace(",", "."), width: match[2].replace(",", ".") };
};

export const formatLeafSizeValue = (height: string, width: string): string =>
  `${height}x${width}`;

const variantSizeRaw = (variant: Variant): string => {
  const sizeAttr = variant.attributes.find((attribute) => attribute.code === "size");
  return String(sizeAttr?.rawValue ?? sizeAttr?.value ?? "").trim();
};

/** SKU варианта с высотой 200 (предпочтительно 200x60), иначе первый. */
export const preferDefaultLeafSizeVariantSku = (variants: Variant[] | null | undefined): string => {
  const list = Array.isArray(variants) ? variants : [];
  if (list.length === 0) return "";

  const scored = list
    .map((variant) => {
      const parts = parseLeafSizeValue(variantSizeRaw(variant));
      const height = parts ? Number(parts.height) : NaN;
      const width = parts ? Number(parts.width) : NaN;
      let score = 0;
      if (height === 200) score += 1000;
      else if (Number.isFinite(height)) score += Math.max(0, 500 - Math.abs(height - 200));
      if (width === 60) score += 50;
      else if (Number.isFinite(width)) score += Math.max(0, 40 - Math.abs(width - 60));
      return { sku: variant.sku, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.sku || list[0]?.sku || "";
};

export type LeafSizeAxisState = {
  heights: string[];
  widthsByHeight: Record<string, string[]>;
  selectedHeight: string | null;
  selectedWidth: string | null;
  currentSizeValue: string | null;
};

/**
 * Раздельный выбор высоты/ширины только если есть «высокая» полотна (230+).
 * Для наборов вроде 190/200 оставляем один ряд чипов размера (190x55, 200x60…).
 */
export const buildLeafSizeAxisState = (
  variants: Variant[],
  currentSizeValue: string | null | undefined,
): LeafSizeAxisState | null => {
  const widthsByHeight: Record<string, string[]> = {};

  for (const variant of variants) {
    const raw = variantSizeRaw(variant);
    const parts = parseLeafSizeValue(raw);
    if (!parts) continue;
    const list = widthsByHeight[parts.height] || [];
    if (!list.includes(parts.width)) list.push(parts.width);
    widthsByHeight[parts.height] = list;
  }

  const heights = Object.keys(widthsByHeight).sort((a, b) => Number(a) - Number(b));
  if (heights.length < 2) return null;

  const hasTallLeaf = heights.some((height) => Number(height) >= 225);
  if (!hasTallLeaf) return null;

  for (const height of heights) {
    widthsByHeight[height] = [...widthsByHeight[height]].sort((a, b) => Number(a) - Number(b));
  }

  const currentParts = parseLeafSizeValue(currentSizeValue);
  const selectedHeight =
    (currentParts && heights.includes(currentParts.height) && currentParts.height) ||
    (heights.includes("200") ? "200" : heights[0]);
  const widths = widthsByHeight[selectedHeight] || [];
  const selectedWidth =
    (currentParts &&
      currentParts.height === selectedHeight &&
      widths.includes(currentParts.width) &&
      currentParts.width) ||
    (widths.includes("60") ? "60" : widths[0] || null);

  return {
    heights,
    widthsByHeight,
    selectedHeight,
    selectedWidth,
    currentSizeValue: currentSizeValue ? String(currentSizeValue) : null,
  };
};
