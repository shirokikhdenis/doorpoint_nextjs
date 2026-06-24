import type { CatalogAttributeFilter, CatalogLabel, CatalogMeta, ProductCard } from "@/lib/client/normalizers";
import type { CatalogFilterState, NumericRange } from "@/features/catalog/catalog-types";

export type CatalogActiveFilterChip =
  | { id: string; label: string; value: string; kind: "search" }
  | { id: string; label: string; value: string; kind: "sort" }
  | { id: string; label: string; value: string; kind: "onSale" }
  | { id: string; label: string; value: string; kind: "category"; slug: string }
  | { id: string; label: string; value: string; kind: "subcategory"; slug: string }
  | { id: string; label: string; value: string; kind: "attrValue"; code: string; attrValue: string }
  | { id: string; label: string; value: string; kind: "attrRange"; code: string }
  | { id: string; label: string; value: string; kind: "price" };

const sortLabels: Record<string, string> = {
  "alphabet-asc": "По алфавиту (А-Я)",
  "alphabet-desc": "По алфавиту (Я-А)",
  "price-asc": "Сначала дешевле",
  "price-desc": "Сначала дороже",
};

const formatRangePart = (value: string, suffix = "") => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `${numeric.toLocaleString("ru-RU")}${suffix}`;
  return `${value}${suffix}`;
};

const formatRangeLabel = (range: NumericRange, suffix = "") => {
  const min = range.min.trim();
  const max = range.max.trim();
  if (min && max) return `${formatRangePart(min, suffix)} - ${formatRangePart(max, suffix)}`;
  if (min) return `от ${formatRangePart(min, suffix)}`;
  return `до ${formatRangePart(max, suffix)}`;
};

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

/** Атрибуты, полностью покрытые одной подборкой (одно значение) — не дублируем в сайдбаре. */
export const attributeFiltersForSidebar = (meta: CatalogMeta): CatalogAttributeFilter[] => {
  const labelCoveredCodes = new Set<string>();
  for (const label of meta.labels) {
    for (const rule of label.filters) {
      labelCoveredCodes.add(rule.code);
    }
  }

  return meta.attributeFilters.filter((filter) => {
    if (filter.type === "number") return true;
    if (!labelCoveredCodes.has(filter.code)) return true;
    const values = filter.values || [];
    return values.length > 1;
  });
};

export const shouldShowCategoryFilters = (meta: CatalogMeta) => meta.categories.length > 1;

export const shouldShowSubcategoryFilters = (meta: CatalogMeta) => meta.subcategories.length > 1;

export const buildFallbackCollapsedSectionIds = (
  filterAttributes: CatalogAttributeFilter[],
): string[] => {
  const collapsed: string[] = ["categories", "subcategories"];
  for (const filter of filterAttributes) {
    if (isAttrFilterCollapsedByDefault(filter)) {
      collapsed.push(`attr-${filter.code}`);
    }
  }
  return collapsed;
};

export const buildDefaultCollapsedSections = (meta: CatalogMeta): Set<string> => {
  if (meta.collapsedFilterSections !== null) {
    return new Set(meta.collapsedFilterSections);
  }

  const collapsed = new Set<string>();
  if (shouldShowCategoryFilters(meta)) collapsed.add("categories");
  if (shouldShowSubcategoryFilters(meta)) collapsed.add("subcategories");
  for (const filter of attributeFiltersForSidebar(meta)) {
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
  if (filters.onSale) next.delete("promotions");
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

export const buildCatalogActiveFilterChips = (
  meta: CatalogMeta,
  filters: CatalogFilterState,
): CatalogActiveFilterChip[] => {
  const chips: CatalogActiveFilterChip[] = [];
  const categoryBySlug = new Map(meta.categories.map((category) => [category.slug, category.name]));
  const subcategoryBySlug = new Map(
    meta.subcategories.map((subcategory) => [subcategory.slug, subcategory.name]),
  );
  const attrByCode = new Map(meta.attributeFilters.map((filter) => [filter.code, filter]));
  const search = filters.search.trim();

  if (search) {
    chips.push({ id: "search", label: "Поиск", value: search, kind: "search" });
  }

  if (filters.sort && filters.sort !== "popularity") {
    chips.push({
      id: "sort",
      label: "Сортировка",
      value: sortLabels[filters.sort] || filters.sort,
      kind: "sort",
    });
  }

  if (filters.onSale) {
    chips.push({ id: "onSale", label: "Двери со скидкой", value: "Да", kind: "onSale" });
  }

  for (const slug of filters.categories) {
    chips.push({
      id: `category:${slug}`,
      label: "Категория",
      value: categoryBySlug.get(slug) || slug,
      kind: "category",
      slug,
    });
  }

  for (const slug of filters.subcategories) {
    chips.push({
      id: `subcategory:${slug}`,
      label: "Подкатегория",
      value: subcategoryBySlug.get(slug) || slug,
      kind: "subcategory",
      slug,
    });
  }

  for (const [code, values] of Object.entries(filters.attrSelections)) {
    const attr = attrByCode.get(code);
    for (const value of values) {
      chips.push({
        id: `attr:${code}:${value}`,
        label: attr?.name || code,
        value,
        kind: "attrValue",
        code,
        attrValue: value,
      });
    }
  }

  for (const [code, range] of Object.entries(filters.attrRanges)) {
    if (!range.min.trim() && !range.max.trim()) continue;
    const attr = attrByCode.get(code);
    chips.push({
      id: `attrRange:${code}`,
      label: attr?.name || code,
      value: formatRangeLabel(range, attr?.unit ? ` ${attr.unit}` : ""),
      kind: "attrRange",
      code,
    });
  }

  if (filters.priceRange.min.trim() || filters.priceRange.max.trim()) {
    chips.push({
      id: "price",
      label: "Цена",
      value: formatRangeLabel(filters.priceRange, " ₽"),
      kind: "price",
    });
  }

  return chips;
};

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

/** Browser query string — filters only, no `catalogPage`. */
export const buildCatalogFilterQuery = (filters: CatalogFilterState): string => {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search);
  if (filters.sort && filters.sort !== "popularity") params.set("sort", filters.sort);
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
  if (filters.onSale) params.set("onSale", "1");
  return params.toString();
};

/** API query string — includes `catalogPage` for `/api/products`. */
export const buildCatalogApiQuery = (catalogPage: string, filters: CatalogFilterState): string => {
  const params = new URLSearchParams();
  params.set("catalogPage", catalogPage);
  params.set("search", filters.search);
  params.set("sort", filters.sort || "popularity");
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
  if (filters.onSale) params.set("onSale", "1");
  return params.toString();
};

/** @deprecated Prefer buildCatalogApiQuery */
export const buildCatalogQuery = buildCatalogApiQuery;

const parseCsvParam = (value: string | undefined) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const flattenSearchParams = (
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    out[key] = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw);
  }
  return out;
};

export const parseCatalogFilterStateFromSearchParams = (
  flat: Record<string, string>,
): CatalogFilterState => {
  const attrSelections: Record<string, string[]> = {};
  const attrRanges: Record<string, NumericRange> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (!key.startsWith("attr_")) continue;
    if (key.endsWith("_min")) {
      const code = key.slice(5, -4);
      const current = attrRanges[code] || { min: "", max: "" };
      attrRanges[code] = { ...current, min: value };
      continue;
    }
    if (key.endsWith("_max")) {
      const code = key.slice(5, -4);
      const current = attrRanges[code] || { min: "", max: "" };
      attrRanges[code] = { ...current, max: value };
      continue;
    }
    const code = key.slice(5);
    attrSelections[code] = parseCsvParam(value);
  }

  return {
    search: flat.search || "",
    sort: flat.sort || "popularity",
    categories: parseCsvParam(flat.categories),
    subcategories: parseCsvParam(flat.subcategories),
    attrSelections,
    attrRanges,
    priceRange: {
      min: flat.minPrice || "",
      max: flat.maxPrice || "",
    },
    onSale: flat.onSale === "1",
  };
};

export const catalogQueryObjectFromQueryString = (queryString: string) => {
  const params = new URLSearchParams(queryString);
  const query: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
};
