const { resolveCollectionAttrCode } = require("./collectionAttrCode");

const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const INTERIOR_DOORS_CATALOG_PAGE_SLUG = "dveri-mezhkomnatnyye";
const MANUFACTURER_ATTR_CODE = "manufacturer";
const DEFAULT_RELATED_COUNT = 4;

const catalogPagePath = (slug) => {
  const normalized = String(slug || "all").trim() || "all";
  if (normalized === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(normalized)}`;
};

const buildCollectionCatalogHref = (catalogPageSlug, manufacturer, collection, collectionAttrCode) => {
  const path = catalogPagePath(catalogPageSlug);
  const params = new URLSearchParams();
  const manufacturerName = String(manufacturer || "").trim();
  const collectionName = String(collection || "").trim();
  if (manufacturerName) params.set(`attr_${MANUFACTURER_ATTR_CODE}`, manufacturerName);
  if (collectionName) params.set(`attr_${collectionAttrCode}`, collectionName);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const readProductAttrValue = (product, code) => {
  if (!code || !product) return "";
  const entry = (product.attributes || []).find((attr) => attr.code === code);
  if (!entry) return "";
  return String(entry.value || "").trim();
};

const isInteriorDoor = (product) => product?.categorySlug === INTERIOR_DOORS_CATEGORY_SLUG;

/**
 * Другие межкомнатные двери из той же коллекции (атрибут collection / «Коллекция»).
 */
const loadRelatedCollectionDoors = async ({
  product,
  getProducts,
  count = DEFAULT_RELATED_COUNT,
  resolveAttrCode = resolveCollectionAttrCode,
}) => {
  if (!isInteriorDoor(product)) return null;

  const collectionAttrCode = await resolveAttrCode();
  const collectionName = readProductAttrValue(product, collectionAttrCode);
  if (!collectionName) return null;

  const manufacturer = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  const catalogHref = buildCollectionCatalogHref(
    INTERIOR_DOORS_CATALOG_PAGE_SLUG,
    manufacturer,
    collectionName,
    collectionAttrCode,
  );

  const poolLimit = Math.min(32, Math.max(count * 4, 12));
  const result = await getProducts({
    catalogPage: INTERIOR_DOORS_CATALOG_PAGE_SLUG,
    [`attr_${collectionAttrCode}`]: collectionName,
    limit: poolLimit,
    page: 1,
    sort: "popularity",
  });

  const productId = Number(product.id);
  const items = (result?.items || [])
    .filter((item) => Number(item.id) !== productId)
    .slice(0, count);

  if (items.length === 0) return null;

  return { collectionName, catalogHref, items };
};

module.exports = {
  INTERIOR_DOORS_CATEGORY_SLUG,
  INTERIOR_DOORS_CATALOG_PAGE_SLUG,
  MANUFACTURER_ATTR_CODE,
  DEFAULT_RELATED_COUNT,
  buildCollectionCatalogHref,
  readProductAttrValue,
  isInteriorDoor,
  loadRelatedCollectionDoors,
};
