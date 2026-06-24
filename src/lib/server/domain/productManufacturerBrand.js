const factoryCardRepository = require("../repositories/factoryCardRepository");
const {
  readProductAttrValue,
  MANUFACTURER_ATTR_CODE,
} = require("./collectionRelatedDoors");

const attachManufacturerBrand = async (product) => {
  if (!product) return product;

  const manufacturerName = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  if (!manufacturerName) return product;

  const manufacturerLogo = await factoryCardRepository.getLogoUrlByManufacturerName(
    manufacturerName,
  );
  if (!manufacturerLogo) return product;

  return {
    ...product,
    manufacturerName,
    manufacturerLogo,
  };
};

module.exports = {
  attachManufacturerBrand,
};
