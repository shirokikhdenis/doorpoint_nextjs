const factoryStorefrontService = require("./factoryStorefrontService");
const { resolveCollectionAttrCode } = require("../domain/collectionAttrCode");

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
  const path = catalogPagePath(catalogPageSlug);
  if (!name) return path;
  const params = new URLSearchParams();
  params.set(`attr_${MANUFACTURER_ATTR_CODE}`, name);
  return `${path}?${params.toString()}`;
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
};
