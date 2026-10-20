const factoryStorefrontService = require("./factoryStorefrontService");
const { resolveCollectionAttrCode } = require("../domain/collectionAttrCode");
const {
  buildManufacturerSubcategoryCatalogHref,
  buildEntryFactoryCatalogLinks,
} = require("../domain/subcategoryRelatedDoors");
const { slugifyPart } = require("../domain/productSlug");
const MANUFACTURER_ATTR_CODE = "manufacturer";

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

const buildManufacturerCatalogHref = (manufacturer, catalogPageSlug = "all") => {
  const name = String(manufacturer || "").trim();
  const normalizedSlug = String(catalogPageSlug || "all").trim() || "all";
  const path = catalogPagePath(normalizedSlug);
  if (!name) return path;
  // General catalog has no `/catalog/{factory}` route (collides with vitrine slugs).
  if (normalizedSlug === "all") {
    const params = new URLSearchParams();
    params.set(`attr_${MANUFACTURER_ATTR_CODE}`, name);
    return `${path}?${params.toString()}`;
  }
  const slug = slugifyPart(name) || "factory";
  if (!slug) return path;
  return `${path}/${encodeURIComponent(slug)}`;
};

const getManufacturerCollectionsPage = async (sectionId, manufacturerSlugValue) =>
  factoryStorefrontService.getPublicManufacturerCollectionsPage(sectionId, manufacturerSlugValue, {
    buildCollectionCatalogHref,
    buildManufacturerCatalogHref,
  });

module.exports = {
  getManufacturerCollectionsPage,
  resolveCollectionAttrCode,
  buildCollectionCatalogHref,
  buildManufacturerCatalogHref,
  buildManufacturerSubcategoryCatalogHref,
  buildEntryFactoryCatalogLinks,
};
