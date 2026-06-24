const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";
const ENTRY_DOORS_CATALOG_PAGE_SLUG = "vhodnye-dveri";
const THERMAL_DOORS_CATALOG_PAGE_SLUG = "termo-dveri";
const MANUFACTURER_ATTR_CODE = "manufacturer";
const DEFAULT_RELATED_COUNT = 4;

const ENTRY_FACTORY_CATALOG_LINKS = [
  { label: "Двери в квартиру", subcategorySlug: "двери-в-квартиру" },
  { label: "Двери с терморазрывом", subcategorySlug: "двери-с-терморазрывом" },
];

/** Подкатегории с отдельной витриной каталога. */
const SUBCATEGORY_TO_CATALOG_PAGE = {
  "двери-с-терморазрывом": THERMAL_DOORS_CATALOG_PAGE_SLUG,
  "двери-в-квартиру": ENTRY_DOORS_CATALOG_PAGE_SLUG,
};

const catalogPagePath = (slug) => {
  const normalized = String(slug || "all").trim() || "all";
  if (normalized === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(normalized)}`;
};

const resolveCatalogPageForSubcategory = (subcategorySlug) =>
  SUBCATEGORY_TO_CATALOG_PAGE[String(subcategorySlug || "").trim()] || ENTRY_DOORS_CATALOG_PAGE_SLUG;

const buildSubcategoryCatalogHref = (subcategorySlug) => {
  const slug = String(subcategorySlug || "").trim();
  if (!slug) return catalogPagePath(ENTRY_DOORS_CATALOG_PAGE_SLUG);

  const dedicatedPage = SUBCATEGORY_TO_CATALOG_PAGE[slug];
  if (dedicatedPage) return catalogPagePath(dedicatedPage);

  const path = catalogPagePath(ENTRY_DOORS_CATALOG_PAGE_SLUG);
  const params = new URLSearchParams();
  params.set("subcategories", slug);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const buildManufacturerSubcategoryCatalogHref = (manufacturer, subcategorySlug) => {
  const name = String(manufacturer || "").trim();
  const baseHref = buildSubcategoryCatalogHref(subcategorySlug);
  const queryIndex = baseHref.indexOf("?");
  const path = queryIndex >= 0 ? baseHref.slice(0, queryIndex) : baseHref;
  const params = new URLSearchParams(queryIndex >= 0 ? baseHref.slice(queryIndex + 1) : "");
  if (name) params.set(`attr_${MANUFACTURER_ATTR_CODE}`, name);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const buildEntryFactoryCatalogLinks = (manufacturer) =>
  ENTRY_FACTORY_CATALOG_LINKS.map(({ label, subcategorySlug }) => ({
    label,
    href: buildManufacturerSubcategoryCatalogHref(manufacturer, subcategorySlug),
  }));

const isEntryDoor = (product) => product?.categorySlug === ENTRY_DOORS_CATEGORY_SLUG;

/**
 * Другие входные двери из той же подкатегории (случайные 4 из пула).
 */
const loadRelatedSubcategoryDoors = async ({
  product,
  getProducts,
  shuffle = (items) => items,
  count = DEFAULT_RELATED_COUNT,
}) => {
  if (!isEntryDoor(product)) return null;

  const subcategorySlug = String(product.subcategorySlug || "").trim();
  const subcategoryName = String(product.subcategory || "").trim() || subcategorySlug;
  if (!subcategorySlug) return null;

  const catalogHref = buildSubcategoryCatalogHref(subcategorySlug);
  const catalogPage = resolveCatalogPageForSubcategory(subcategorySlug);
  const poolLimit = Math.min(32, Math.max(count * 4, 12));

  const result = await getProducts({
    catalogPage,
    subcategories: subcategorySlug,
    limit: poolLimit,
    page: 1,
    sort: "popularity",
  });

  const productId = Number(product.id);
  const pool = (result?.items || []).filter((item) => Number(item.id) !== productId);
  const items = shuffle(pool).slice(0, count);

  if (items.length === 0) return null;

  return { collectionName: subcategoryName, catalogHref, items };
};

module.exports = {
  ENTRY_DOORS_CATEGORY_SLUG,
  DEFAULT_RELATED_COUNT,
  buildSubcategoryCatalogHref,
  buildManufacturerSubcategoryCatalogHref,
  buildEntryFactoryCatalogLinks,
  isEntryDoor,
  loadRelatedSubcategoryDoors,
};
