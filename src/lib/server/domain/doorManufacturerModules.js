const doorManufacturerModulesRepository = require("../repositories/doorManufacturerModulesRepository");
const { readProductAttrValue } = require("./collectionRelatedDoors");
const { isFinishCatalogManufacturer } = require("./doorFinishes");

const MANUFACTURER_ATTR_CODE = "manufacturer";
const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";

const isAelitaInteriorDoor = (product) => {
  if (!product || product.categorySlug !== INTERIOR_DOORS_CATEGORY_SLUG) return false;
  const manufacturer = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  return isFinishCatalogManufacturer(manufacturer);
};

const loadManufacturerModules = async (manufacturerName) => {
  const manufacturer = String(manufacturerName || "").trim();
  if (!manufacturer) return null;
  return doorManufacturerModulesRepository.getByManufacturer(manufacturer);
};

module.exports = {
  MANUFACTURER_ATTR_CODE,
  INTERIOR_DOORS_CATEGORY_SLUG,
  isAelitaInteriorDoor,
  loadManufacturerModules,
};
