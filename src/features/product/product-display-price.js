/**
 * Цена на карточке товара: products.price vs product_variants.price.
 * Отдельный .js-модуль без path aliases — удобен для node --test.
 */

const isProductSaleActive = (product) =>
  product.isOnSale === true &&
  product.compareAtPrice != null &&
  Number.isFinite(product.compareAtPrice) &&
  product.compareAtPrice > product.price;

/** Один технический вариант без осей (фурнитура и т.п.) — цена с products.price. */
const isSingleVariantWithoutAxes = (variants) => {
  if (!variants || variants.length !== 1) return false;
  return !variants[0].attributes.some((attribute) => attribute.isVariantAxis);
};

/** Акция на уровне товара: products.price; иначе вариант или fallback на product. */
const resolveProductDisplayPrice = (product, variantPrice, variants) => {
  if (isProductSaleActive(product)) {
    return product.price;
  }
  if (isSingleVariantWithoutAxes(variants)) {
    return product.price;
  }
  return variantPrice ?? product.price;
};

module.exports = {
  isProductSaleActive,
  isSingleVariantWithoutAxes,
  resolveProductDisplayPrice,
};
