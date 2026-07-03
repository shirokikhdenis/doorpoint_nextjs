const { truncate } = require("../vk/vkApiClient");

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

const resolveAbsoluteUrl = (rawUrl, siteUrl) => {
  const value = String(rawUrl || "").trim();
  if (!value || value.toUpperCase() === "X") return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (!siteUrl) return "";
  return `${siteUrl.replace(/\/$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
};

const buildProductPageUrl = (product, siteUrl) => {
  const slug = String(product.slug || "").trim();
  if (!slug || !siteUrl) return "";
  return `${siteUrl.replace(/\/$/, "")}/product/${slug}`;
};

const buildDescription = (product, productUrl) => {
  const attrs = product.attributes || {};
  const lines = [];
  if (attrs.manufacturer) lines.push(`Производитель: ${attrs.manufacturer}`);
  if (attrs.collection) lines.push(`Коллекция: ${attrs.collection}`);
  if (attrs.color) lines.push(`Цвет: ${attrs.color}`);
  if (product.category) {
    lines.push(
      product.subcategory
        ? `Категория: ${product.category} / ${product.subcategory}`
        : `Категория: ${product.category}`,
    );
  }
  if (product.sku) lines.push(`Артикул: ${product.sku}`);
  if (productUrl) lines.push(`На сайте: ${productUrl}`);
  return truncate(lines.join("\n"), MAX_DESCRIPTION_LENGTH);
};

const buildVkPrice = (amountRub) => String(Math.max(0, Math.round(Number(amountRub) || 0)));

const buildMarketPayload = ({ product, siteUrl, marketCategoryId, photoId }) => {
  const imageUrl = resolveAbsoluteUrl(
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : product.primaryImageUrl || "",
    siteUrl,
  );
  const productUrl = buildProductPageUrl(product, siteUrl);
  const description = buildDescription(product, productUrl);

  const payload = {
    name: truncate(product.name, MAX_NAME_LENGTH),
    description,
    category_id: marketCategoryId,
    price: buildVkPrice(product.price),
    main_photo_id: photoId,
    sku: String(product.sku || "").trim() || undefined,
    url: productUrl || undefined,
  };

  if (product.isOnSale && product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)) {
    payload.old_price = buildVkPrice(product.compareAtPrice);
  }

  return { payload, imageUrl, productUrl, description };
};

const buildPayloadFingerprint = ({ product, imageUrl, productUrl, description, marketCategoryId, payload }) => ({
  sku: product.sku,
  name: product.name,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  isOnSale: product.isOnSale,
  isActive: product.isActive,
  imageUrl,
  productUrl,
  description,
  marketCategoryId,
  category: product.category,
  subcategory: product.subcategory,
  vkPrice: payload?.price || null,
  vkOldPrice: payload?.old_price || null,
});

module.exports = {
  resolveAbsoluteUrl,
  buildProductPageUrl,
  buildDescription,
  buildMarketPayload,
  buildPayloadFingerprint,
};
