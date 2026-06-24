const doorFinishRepository = require("../repositories/doorFinishRepository");
const { readProductAttrValue } = require("./collectionRelatedDoors");

const MANUFACTURER_ATTR_CODE = "manufacturer";
const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";

/** Производители с каталогом покрытий на карточке (ключ — lower-case). */
const FINISH_CATALOG_MANUFACTURERS = new Set(["аэлита"]);

const FINISH_GROUP_ORDER = ["solid", "wood", "marble", "other"];

const FINISH_GROUP_LABELS = {
  solid: "Однотонные",
  wood: "Под дерево",
  marble: "Под мрамор",
  other: "Другое",
};

const FINISH_GROUP_ALIASES = {
  solid: ["однотон", "однотонное", "однотонная"],
  wood: ["дерево", "поддерево"],
  marble: ["мрамор", "подмрамор"],
  other: ["прочее"],
};

const resolveGroupKey = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "other";

  const lower = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = lower.replace(/\s+/g, "");

  if (FINISH_GROUP_ORDER.includes(lower)) return lower;

  for (const key of FINISH_GROUP_ORDER) {
    const label = FINISH_GROUP_LABELS[key].toLowerCase();
    if (lower === label || compact === label.replace(/\s+/g, "")) return key;
  }

  for (const key of FINISH_GROUP_ORDER) {
    const aliases = FINISH_GROUP_ALIASES[key] || [];
    if (aliases.some((alias) => alias === lower || alias === compact)) return key;
  }

  return "other";
};

const normalizeManufacturerKey = (value) => String(value || "").trim().toLowerCase();

const isFinishCatalogManufacturer = (manufacturerName) =>
  FINISH_CATALOG_MANUFACTURERS.has(normalizeManufacturerKey(manufacturerName));

const groupFinishes = (items) => {
  const byGroup = new Map();
  for (const item of items) {
    const key = FINISH_GROUP_ORDER.includes(item.groupKey) ? item.groupKey : "other";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push({
      id: item.id,
      name: item.name,
      image: item.imageUrl,
      priceDelta: item.priceDelta,
    });
  }

  return FINISH_GROUP_ORDER.filter((key) => byGroup.has(key)).map((key) => ({
    key,
    title: FINISH_GROUP_LABELS[key] || FINISH_GROUP_LABELS.other,
    items: byGroup.get(key),
  }));
};

const loadFinishOptionsForProduct = async (product) => {
  if (!product || product.categorySlug !== INTERIOR_DOORS_CATEGORY_SLUG) {
    return null;
  }

  const manufacturer = readProductAttrValue(product, MANUFACTURER_ATTR_CODE);
  if (!isFinishCatalogManufacturer(manufacturer)) {
    return null;
  }

  const finishes = await doorFinishRepository.listActiveByManufacturer(manufacturer);
  if (finishes.length === 0) return null;

  const groups = groupFinishes(finishes);
  if (groups.length === 0) return null;

  return {
    manufacturerName: manufacturer,
    groups,
  };
};

module.exports = {
  MANUFACTURER_ATTR_CODE,
  INTERIOR_DOORS_CATEGORY_SLUG,
  FINISH_GROUP_ORDER,
  FINISH_GROUP_LABELS,
  FINISH_CATALOG_MANUFACTURERS,
  resolveGroupKey,
  isFinishCatalogManufacturer,
  groupFinishes,
  loadFinishOptionsForProduct,
};
