const {
  KP_VALIDITY_DAYS,
  buildProductPageUrl,
} = require("./kpPdfCompany");
const { formatCartItemName } = require("../../cart-item-name");
const {
  formatKpPrice,
  formatKpDate,
  buildKpNumber,
  isEntryDoorProduct,
  resolveProductImageUrl,
} = require("./commercialProposalDocumentData");

const CART_KP_DOOR_SLUGS = new Set(["entry-doors", "interior-doors"]);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const cartItemHasProductLink = (item) =>
  !(item?.noProductLink === true || item?.hideCartImage === true);

const isCartKpDoor = (item) =>
  CART_KP_DOOR_SLUGS.has(String(item?.categorySlug || "").trim()) && cartItemHasProductLink(item);

const listCartKpDoors = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!isCartKpDoor(item)) continue;
    const id = Number(item.id) || 0;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
};

const lineDisplayName = (item) =>
  formatCartItemName(
    item?.name,
    item?.color,
    item?.finishName,
    item?.glassOptionName,
    item?.hardwareServices,
    item?.glass,
    item?.manufacturerName,
    item?.categorySlug,
  );

const buildCartKpLines = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Math.max(1, Number(item?.quantity) || 1);
      const price = Number(item?.price) || 0;
      return {
        name: lineDisplayName(item) || "Позиция",
        quantity,
        price,
        sum: price * quantity,
        priceFormatted: formatKpPrice(price),
        sumFormatted: formatKpPrice(price * quantity),
      };
    })
    .filter((line) => line.name);

const sanitizeFilenamePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "cart";

const buildCartKpFilenameBase = (doorProduct, doorItem) => {
  const sku = String(doorProduct?.sku || doorItem?.sku || "").trim();
  const label = sanitizeFilenamePart(sku || lineDisplayName(doorItem) || "door");
  return `KP-cart-${label}`;
};

/**
 * @param {{ items: unknown[], doorProduct?: object, generatedAt?: Date }} input
 */
const buildCartKpPayload = ({ items, doorProduct = null, generatedAt = new Date() } = {}) => {
  const doors = listCartKpDoors(items);
  const doorItem = doors[0] || null;
  if (!doorItem) {
    return { ok: false, message: "В корзине нет входной или межкомнатной двери" };
  }

  const product = doorProduct && Number(doorProduct.id) === Number(doorItem.id) ? doorProduct : null;
  const displayName = product
    ? formatCartItemName(
        product.name,
        doorItem.color || product.color,
        doorItem.finishName,
        doorItem.glassOptionName,
        doorItem.hardwareServices,
        doorItem.glass || product.glass,
        doorItem.manufacturerName || product.manufacturerName,
        doorItem.categorySlug || product.categorySlug,
      )
    : lineDisplayName(doorItem);

  const categorySlug = String(doorItem.categorySlug || product?.categorySlug || "").trim();
  const imageUrl =
    resolveProductImageUrl(product) ||
    String(doorItem.image || "").trim() ||
    "";
  const slug = String(product?.slug || "").trim();
  const productRef = slug || doorItem.id;
  const productPageUrl = buildProductPageUrl(productRef);
  const lines = buildCartKpLines(items);
  const total = lines.reduce((sum, line) => sum + line.sum, 0);

  return {
    ok: true,
    kpNumber: buildKpNumber(doorItem.id, generatedAt),
    generatedAtFormatted: formatKpDate(generatedAt),
    validUntilFormatted: formatKpDate(addDays(generatedAt, KP_VALIDITY_DAYS)),
    filenameBase: buildCartKpFilenameBase(product, doorItem),
    door: {
      id: Number(doorItem.id),
      displayName,
      sku: String(product?.sku || doorItem.sku || "").trim(),
      categoryLabel: categorySlug === "entry-doors" ? "Входная дверь" : "Межкомнатная дверь",
      imageUrl,
      showImageFrame: !isEntryDoorProduct({ categorySlug }),
      productPageUrl,
      productPageLinkLabel: slug ? `/product/${slug}` : productPageUrl.replace(/^https?:\/\//, ""),
    },
    lines,
    total,
    totalFormatted: formatKpPrice(total),
  };
};

module.exports = {
  CART_KP_DOOR_SLUGS,
  listCartKpDoors,
  isCartKpDoor,
  buildCartKpLines,
  buildCartKpPayload,
  buildCartKpFilenameBase,
};
