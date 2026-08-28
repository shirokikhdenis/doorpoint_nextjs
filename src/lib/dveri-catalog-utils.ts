import type {
  DveriCatalogCategory,
  DveriCatalogFilters,
  DveriCatalogProduct,
  DveriCategoryPricingRule,
  DveriPriceReconcileReport,
  DveriPricingRulesState,
  DveriSortKey,
} from "@/features/admin/dveri-catalog/types";
import { DEFAULT_DVERI_PRICING_RULE } from "@/features/admin/dveri-catalog/constants";

export function applyDiscount(price: number | null | undefined, discountPercent: number | null | undefined): number {
  const base = Number(price ?? 0);
  const discount = Number(discountPercent ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(discount) || discount <= 0) return Math.round(base);
  return Math.round(base * (1 - discount / 100));
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatSignedPriceDiff(diff: number): string {
  if (diff === 0) return formatPrice(0);
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${formatPrice(Math.abs(diff))}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

function matchesSearch(product: DveriCatalogProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (product.title.toLowerCase().includes(q)) return true;
  if (product.vendorCode.toLowerCase().includes(q)) return true;
  if (product.options.some((opt) => opt.vendorCode.toLowerCase().includes(q))) return true;
  if (product.options.some((opt) => opt.title.toLowerCase().includes(q))) return true;

  return false;
}

export function sortProducts(products: DveriCatalogProduct[], sort: DveriSortKey): DveriCatalogProduct[] {
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const sign = dir === "asc" ? 1 : -1;

  return [...products].sort((a, b) => {
    if (field === "price") {
      const diff = a.priceFinal - b.priceFinal;
      if (diff !== 0) return diff * sign;
      return a.title.localeCompare(b.title, "ru");
    }

    if (field === "vendor") {
      const diff = a.vendorCode.localeCompare(b.vendorCode, "ru");
      if (diff !== 0) return diff * sign;
      return a.title.localeCompare(b.title, "ru");
    }

    return a.title.localeCompare(b.title, "ru", { sensitivity: "base" }) * sign;
  });
}

export function getFilteredProducts(
  products: DveriCatalogProduct[] | undefined,
  filters: DveriCatalogFilters,
): DveriCatalogProduct[] {
  if (!products) return [];

  const filtered = products.filter((product) => {
    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
    if (filters.trademarkId && product.trademarkId !== filters.trademarkId) return false;
    return matchesSearch(product, filters.search);
  });

  return sortProducts(filtered, filters.sort);
}

export function getProductById(
  products: DveriCatalogProduct[] | undefined,
  productId: number | string | null,
): DveriCatalogProduct | null {
  if (!products || productId == null) return null;
  return products.find((p) => String(p.id) === String(productId)) ?? null;
}

export function normalizePricingRule(raw: Partial<DveriCategoryPricingRule> | null | undefined): DveriCategoryPricingRule {
  const multiplier = Number(raw?.multiplier ?? DEFAULT_DVERI_PRICING_RULE.multiplier);
  const roundRaw = raw?.roundUpTo;
  const roundUpTo =
    roundRaw === null || roundRaw === undefined || roundRaw === 0
      ? null
      : Math.max(1, Math.round(Number(roundRaw)));
  const adjustment = Math.round(Number(raw?.adjustment ?? 0));

  return {
    multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : DEFAULT_DVERI_PRICING_RULE.multiplier,
    roundUpTo: roundUpTo != null && Number.isFinite(roundUpTo) ? roundUpTo : null,
    adjustment: Number.isFinite(adjustment) ? adjustment : 0,
  };
}

/** Опт (дилер со скидкой) → розница по формуле */
export function computeRetailPrice(
  dealerPrice: number | null | undefined,
  rule: DveriCategoryPricingRule,
): number | null {
  const dealer = Number(dealerPrice ?? 0);
  if (!Number.isFinite(dealer) || dealer <= 0) return null;

  const normalized = normalizePricingRule(rule);
  let price = dealer * normalized.multiplier;

  if (normalized.roundUpTo != null && normalized.roundUpTo > 0) {
    price = Math.ceil(price / normalized.roundUpTo) * normalized.roundUpTo;
  }

  price += normalized.adjustment;
  const result = Math.round(price);
  return result > 0 ? result : null;
}

export function resolveCategoryPricingRule(
  categoryId: number | null | undefined,
  categories: DveriCatalogCategory[],
  rules: DveriPricingRulesState,
): DveriCategoryPricingRule {
  const byId = new Map(categories.map((cat) => [cat.id, cat]));
  let current = categoryId ?? null;

  while (current != null) {
    const override = rules.categoryRules[String(current)];
    if (override) return normalizePricingRule(override);
    const cat = byId.get(current);
    current = cat?.parentId ?? null;
  }

  return normalizePricingRule(rules.defaultRule);
}

export function describePricingRule(rule: DveriCategoryPricingRule): string {
  const normalized = normalizePricingRule(rule);
  const parts: string[] = [`×${normalized.multiplier}`];

  if (normalized.roundUpTo != null) {
    parts.push(`↑${new Intl.NumberFormat("ru-RU").format(normalized.roundUpTo)}`);
  }

  if (normalized.adjustment !== 0) {
    parts.push(normalized.adjustment > 0 ? `+${normalized.adjustment}` : String(normalized.adjustment));
  }

  return parts.join(" ");
}

export function collectDveriVendorCodes(product: DveriCatalogProduct): string[] {
  const codes = new Set<string>();
  const baseCode = product.vendorCode.trim();
  if (baseCode) codes.add(baseCode);
  for (const option of product.options) {
    const optionCode = option.vendorCode.trim();
    if (optionCode) codes.add(optionCode);
  }
  return [...codes];
}

export function lookupStorefrontPrice(
  vendorCode: string,
  storefrontPrices: Record<string, number> | undefined,
): number | null {
  const code = vendorCode.trim();
  if (!code || !storefrontPrices) return null;
  const price = storefrontPrices[code];
  return price != null && price > 0 ? price : null;
}

export function resolveProductStorefrontPrices(
  product: DveriCatalogProduct,
  storefrontPrices: Record<string, number> | undefined,
): number[] {
  return collectDveriVendorCodes(product)
    .map((code) => lookupStorefrontPrice(code, storefrontPrices))
    .filter((price): price is number => price != null);
}

export function formatStorefrontPriceRange(prices: number[]): string {
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

import {
  buildDveriPriceReconcileReport as buildDveriPriceReconcileReportImport,
  filterProductsByCategorySubtree,
  getCategorySubtreeIds,
} from "./dveri-price-reconcile.js";

type BuildDveriPriceReconcileReportArgs = {
  products: DveriCatalogProduct[];
  categories: DveriCatalogCategory[];
  pricingRules: DveriPricingRulesState;
  storefrontPrices?: Record<string, number>;
  categoryId: number | null;
};

type BuildDveriPriceReconcileReportFn = (
  args: BuildDveriPriceReconcileReportArgs,
) => DveriPriceReconcileReport | null;

const buildDveriPriceReconcileReportRaw =
  buildDveriPriceReconcileReportImport as BuildDveriPriceReconcileReportFn;

export function buildDveriPriceReconcileReport(
  args: BuildDveriPriceReconcileReportArgs,
): DveriPriceReconcileReport | null {
  return buildDveriPriceReconcileReportRaw(args);
}

export { filterProductsByCategorySubtree, getCategorySubtreeIds };

export { formatDveriProductDisplayTitle } from "./dveri-product-display.js";
export { formatProductDisplayName } from "./product-display-name.js";
