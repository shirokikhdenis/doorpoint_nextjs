import type { CatalogAttributeFilter, CatalogLabel, CatalogMeta, ProductCard } from "@/lib/client/normalizers";
import type { CatalogFilterState, NumericRange } from "@/features/catalog/catalog-types";

/** Одна карточка на product id — защита от дублей при пагинации и restore. */
export const dedupeProductsById = (items: ProductCard[]) => {
  const seen = new Set<number>();
  return items.filter((item) => {
    const id = Number(item.id);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const isAttrFilterCollapsedByDefault = (filter: CatalogAttributeFilter): boolean => {
  const code = filter.code.toLowerCase();
  const name = filter.name.toLowerCase();
  if (code === "thickness" || name.includes("толщин")) return false;
  if (
    code === "manufacturer" ||
    code === "shade" ||
    code === "color" ||
    code.includes("texture") ||
    code === "glass" ||
    name.includes("производител") ||
    name.includes("оттенок") ||
    name.includes("текстур") ||
    name.includes("покрытия") ||
    name.includes("стекл") ||
    name.includes("коллекц")
  ) {
    return true;
  }
  return true;
};

export const buildDefaultCollapsedSections = (meta: CatalogMeta): Set<string> => {
  const collapsed = new Set<string>();
  for (const filter of meta.attributeFilters) {
    if (isAttrFilterCollapsedByDefault(filter)) {
      collapsed.add(`attr-${filter.code}`);
    }
  }
  return collapsed;
};

export const labelMatchesSelections = (
  label: CatalogLabel,
  attrSelections: Record<string, string[]>,
): boolean => {
  if (!label.filters.length) return false;
  return label.filters.every((rule) => {
    const cur = attrSelections[rule.code];
    return Array.isArray(cur) && cur.length === 1 && cur[0] === rule.value;
  });
};

export const applyLabelToSelections = (label: CatalogLabel): Record<string, string[]> => {
  const next: Record<string, string[]> = {};
  for (const rule of label.filters) {
    next[rule.code] = [rule.value];
  }
  return next;
};

export const expandSectionsWithActiveFilters = (
  collapsed: Set<string>,
  filters: CatalogFilterState & { labels: CatalogLabel[] },
): Set<string> => {
  const next = new Set(collapsed);
  if (filters.categories.length > 0) next.delete("categories");
  if (filters.subcategories.length > 0) next.delete("subcategories");
  if (filters.priceRange.min.trim() !== "" || filters.priceRange.max.trim() !== "") {
    next.delete("price");
  }
  if (filters.labels.some((label) => labelMatchesSelections(label, filters.attrSelections))) {
    next.delete("labels");
  }
  for (const [code, values] of Object.entries(filters.attrSelections)) {
    if (values.length > 0) next.delete(`attr-${code}`);
  }
  for (const [code, range] of Object.entries(filters.attrRanges)) {
    if (range.min.trim() !== "" || range.max.trim() !== "") next.delete(`attr-${code}`);
  }
  return next;
};

export const isMetaEmpty = (meta: CatalogMeta) =>
  meta.categories.length === 0 &&
  meta.subcategories.length === 0 &&
  meta.attributeFilters.length === 0 &&
  meta.price.max <= meta.price.min;

export const getEffectiveRange = (
  range: NumericRange,
  boundsMin: number,
  boundsMax: number,
): { min: number; max: number } => {
  const minVal = range.min.trim() === "" ? boundsMin : Number(range.min);
  const maxVal = range.max.trim() === "" ? boundsMax : Number(range.max);
  return {
    min: Math.max(boundsMin, Math.min(Number.isFinite(minVal) ? minVal : boundsMin, boundsMax)),
    max: Math.min(boundsMax, Math.max(Number.isFinite(maxVal) ? maxVal : boundsMax, boundsMin)),
  };
};

export const rangeToFilterState = (
  boundsMin: number,
  boundsMax: number,
  min: number,
  max: number,
): NumericRange => ({
  min: min <= boundsMin ? "" : String(Math.round(min)),
  max: max >= boundsMax ? "" : String(Math.round(max)),
});

export const priceSliderStep = (boundsMin: number, boundsMax: number) => {
  const span = boundsMax - boundsMin;
  if (span > 100_000) return 1000;
  if (span > 10_000) return 100;
  return 1;
};

export const buildCatalogQuery = (
  catalogPage: string,
  filters: CatalogFilterState,
): string => {
  const params = new URLSearchParams();
  params.set("catalogPage", catalogPage);
  params.set("search", filters.search);
  params.set("sort", filters.sort);
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  if (filters.subcategories.length) params.set("subcategories", filters.subcategories.join(","));
  Object.entries(filters.attrSelections).forEach(([code, values]) => {
    if (values.length > 0) params.set(`attr_${code}`, values.join(","));
  });
  Object.entries(filters.attrRanges).forEach(([code, range]) => {
    if (range.min.trim() !== "") params.set(`attr_${code}_min`, range.min.trim());
    if (range.max.trim() !== "") params.set(`attr_${code}_max`, range.max.trim());
  });
  if (filters.priceRange.min.trim() !== "") params.set("minPrice", filters.priceRange.min.trim());
  if (filters.priceRange.max.trim() !== "") params.set("maxPrice", filters.priceRange.max.trim());
  return params.toString();
};
