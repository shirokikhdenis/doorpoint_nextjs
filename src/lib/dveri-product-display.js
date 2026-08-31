const { formatProductDisplayName, INTERIOR_DOORS_CATEGORY_SLUG } = require("./product-display-name");

const formatDveriProductDisplayTitle = (product) =>
  formatProductDisplayName({
    name: product?.title,
    color: product?.color,
    glass: product?.glass,
    manufacturer: product?.manufacturer,
    categorySlug: product?.categorySlug ?? INTERIOR_DOORS_CATEGORY_SLUG,
  });

module.exports = {
  formatDveriProductDisplayTitle,
};
