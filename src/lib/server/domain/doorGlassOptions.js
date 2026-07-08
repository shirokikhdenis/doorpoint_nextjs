const doorGlassOptionRepository = require("../repositories/doorGlassOptionRepository");
const { readProductAttrValue } = require("./collectionRelatedDoors");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
  MANUFACTURER_ATTR_CODE,
  isFinishCatalogManufacturer,
} = require("./doorFinishes");
const { loadManufacturerModules } = require("./doorManufacturerModules");

const collectProductSkus = (product) => {
  const parentSku = String(product?.sku || "").trim();
  const variantSkus = Array.isArray(product?.variants)
    ? product.variants
        .map((variant) => String(variant?.sku || "").trim())
        .filter(Boolean)
    : [];
  return [...new Set([parentSku, ...variantSkus].filter(Boolean))];
};

const mapGlassItems = (options) =>
  options.map((option) => ({
    id: option.id,
    name: option.glassName,
    priceDelta: option.priceDelta,
  }));

const loadGlassOptionsForProduct = async (product) => {
  if (!product || product.categorySlug !== INTERIOR_DOORS_CATEGORY_SLUG) {
    return null;
  }

  const manufacturer = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  if (!isFinishCatalogManufacturer(manufacturer)) {
    return null;
  }

  const modules = await loadManufacturerModules(manufacturer);
  if (!modules?.glassOptionsEnabled) {
    return null;
  }

  const parentSku = String(product.sku || "").trim();
  if (!parentSku) return null;

  const options = await doorGlassOptionRepository.listActiveByParentSku(manufacturer, parentSku);
  if (options.length === 0) return null;

  const items = mapGlassItems(options);
  const bySku = {};
  for (const sku of collectProductSkus(product)) {
    bySku[sku] = items;
  }

  return {
    parentSku,
    bySku,
  };
};

module.exports = {
  collectProductSkus,
  loadGlassOptionsForProduct,
};
