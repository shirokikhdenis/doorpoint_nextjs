const { formatProductDisplayName } = require("./product-display-name");

const formatDveriProductDisplayTitle = (product) =>
  formatProductDisplayName({
    name: product?.title,
    color: product?.color,
    glass: product?.glass,
  });

module.exports = {
  formatDveriProductDisplayTitle,
};
