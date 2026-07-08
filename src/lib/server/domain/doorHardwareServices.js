const doorHardwareServiceRepository = require("../repositories/doorHardwareServiceRepository");
const { readProductAttrValue } = require("./collectionRelatedDoors");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
  MANUFACTURER_ATTR_CODE,
  isFinishCatalogManufacturer,
} = require("./doorFinishes");
const { loadManufacturerModules } = require("./doorManufacturerModules");

const loadHardwareServicesForProduct = async (product) => {
  if (!product || product.categorySlug !== INTERIOR_DOORS_CATEGORY_SLUG) {
    return null;
  }

  const manufacturer = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  if (!isFinishCatalogManufacturer(manufacturer)) {
    return null;
  }

  const modules = await loadManufacturerModules(manufacturer);
  if (!modules?.hardwareServicesEnabled) {
    return null;
  }

  const services = await doorHardwareServiceRepository.listActiveByManufacturer(manufacturer);
  if (services.length === 0) return null;

  return {
    manufacturerName: manufacturer,
    items: services.map((service) => ({
      id: service.id,
      code: service.code,
      name: service.name,
      price: service.price,
    })),
  };
};

module.exports = {
  loadHardwareServicesForProduct,
};
