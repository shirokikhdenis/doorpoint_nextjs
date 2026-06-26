const catalogPagePath = (slug) => {
  const normalized = String(slug || "").trim() || "all";
  if (!normalized || normalized === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(normalized)}`;
};

const SUBCATEGORY_FILTER_CODE = "__subcategory__";

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const emptyRange = () => ({ min: "", max: "" });

const normalizeStringArray = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item || "").trim()).filter(Boolean);
};

const normalizeAttrSelections = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [code, values] of Object.entries(raw)) {
    const key = String(code || "").trim();
    if (!key) continue;
    const list = normalizeStringArray(Array.isArray(values) ? values : parseCsv(values));
    if (list.length > 0) out[key] = list;
  }
  return out;
};

const normalizeAttrRanges = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [code, range] of Object.entries(raw)) {
    const key = String(code || "").trim();
    if (!key || !range || typeof range !== "object") continue;
    const min = String(range.min ?? "").trim();
    const max = String(range.max ?? "").trim();
    if (min || max) out[key] = { min, max };
  }
  return out;
};

/** @typedef {{ categories: string[], subcategories: string[], attrSelections: Record<string, string[]>, attrRanges: Record<string, { min: string, max: string }>, priceRange: { min: string, max: string }, onSale: boolean }} HomeSectionFilters */

/** @returns {HomeSectionFilters} */
const normalizeHomeSectionFilters = (raw) => {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const priceRangeRaw =
    source.priceRange && typeof source.priceRange === "object" ? source.priceRange : {};
  const attrSelections = normalizeAttrSelections(source.attrSelections);
  const subcategories = normalizeStringArray(source.subcategories);

  if (attrSelections[SUBCATEGORY_FILTER_CODE]) {
    for (const slug of attrSelections[SUBCATEGORY_FILTER_CODE]) {
      if (slug && !subcategories.includes(slug)) subcategories.push(slug);
    }
    delete attrSelections[SUBCATEGORY_FILTER_CODE];
  }

  return {
    categories: normalizeStringArray(source.categories),
    subcategories,
    attrSelections,
    attrRanges: normalizeAttrRanges(source.attrRanges),
    priceRange: {
      min: String(priceRangeRaw.min ?? "").trim(),
      max: String(priceRangeRaw.max ?? "").trim(),
    },
    onSale: source.onSale === true,
  };
};

/** @returns {import("@/features/catalog/catalog-types").CatalogFilterState} */
const toCatalogFilterState = (filters) => ({
  search: "",
  sort: "popularity",
  categories: filters.categories,
  subcategories: filters.subcategories,
  attrSelections: filters.attrSelections,
  attrRanges: filters.attrRanges,
  priceRange: filters.priceRange,
  onSale: filters.onSale,
});

const appendFilterParams = (params, filters) => {
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
};

const buildCatalogFilterQuery = (filters) => {
  const params = new URLSearchParams();
  appendFilterParams(params, filters);
  return params.toString();
};

const buildCatalogApiQuery = (catalogPage, filters) => {
  const params = new URLSearchParams();
  params.set("catalogPage", catalogPage);
  params.set("search", filters.search);
  params.set("sort", filters.sort || "popularity");
  appendFilterParams(params, filters);
  return params.toString();
};

/** Query object for catalogService.getProducts */
const toCatalogProductsQuery = (catalogPageSlug, filters, options = {}) => {
  const catalogPage = String(catalogPageSlug || "").trim();
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 8));
  const page = Math.max(1, Number(options.page) || 1);
  const sort = String(options.sort || "popularity").trim() || "popularity";
  const qs = buildCatalogApiQuery(catalogPage, toCatalogFilterState(filters));
  const params = Object.fromEntries(new URLSearchParams(qs));
  return { ...params, limit: String(limit), page: String(page), sort };
};

const buildSectionCatalogHref = (catalogPageSlug, filters) => {
  const path = catalogPagePath(String(catalogPageSlug || "").trim());
  const qs = buildCatalogFilterQuery(toCatalogFilterState(filters));
  return qs ? `${path}?${qs}` : path;
};

const hasActiveFilters = (filters) =>
  filters.categories.length > 0 ||
  filters.subcategories.length > 0 ||
  filters.onSale ||
  filters.priceRange.min.trim() !== "" ||
  filters.priceRange.max.trim() !== "" ||
  Object.keys(filters.attrSelections).length > 0 ||
  Object.keys(filters.attrRanges).length > 0;

module.exports = {
  SUBCATEGORY_FILTER_CODE,
  emptyRange,
  normalizeHomeSectionFilters,
  toCatalogFilterState,
  toCatalogProductsQuery,
  buildSectionCatalogHref,
  buildCatalogFilterQuery,
  buildCatalogApiQuery,
  hasActiveFilters,
};
