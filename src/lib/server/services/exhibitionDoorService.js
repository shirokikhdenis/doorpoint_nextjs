const exhibitionDoorRepository = require("../repositories/exhibitionDoorRepository");
const productRepository = require("../repositories/productRepository");
const categoryRepository = require("../repositories/categoryRepository");
const doorFinishRepository = require("../repositories/doorFinishRepository");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
} = require("../domain/interiorKitPrice");

const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";
const { query } = require("../db/postgres");

const CATEGORY_TYPES = new Set(["entry", "interior"]);

const CATEGORY_TYPE_TO_SLUG = {
  entry: ENTRY_DOORS_CATEGORY_SLUG,
  interior: INTERIOR_DOORS_CATEGORY_SLUG,
};

const SLUG_TO_CATEGORY_TYPE = {
  [ENTRY_DOORS_CATEGORY_SLUG]: "entry",
  [INTERIOR_DOORS_CATEGORY_SLUG]: "interior",
};

const resolveCategoryTypeFromSlug = (categorySlug) => {
  const slug = String(categorySlug || "").trim();
  return SLUG_TO_CATEGORY_TYPE[slug] || null;
};

const applyOptionalOverride = (value) => {
  if (value == null) return undefined;
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") return undefined;
  return normalized;
};

const applyFromProductOverrides = (snapshot, categoryType, overrides = {}) => {
  const payload = {
    categoryType,
    ...snapshot,
    sortOrder: 0,
  };

  const coatingColor = applyOptionalOverride(overrides.coatingColor);
  if (coatingColor !== undefined) {
    payload.coatingColor = String(coatingColor);
  }

  const productSku = applyOptionalOverride(overrides.productSku);
  if (productSku !== undefined) {
    payload.productSku = String(productSku);
  }

  const priceRaw = overrides.price;
  if (priceRaw != null && priceRaw !== "") {
    payload.price = Math.round(Number(priceRaw));
  }

  if (categoryType === "interior") {
    const kitPriceRaw = overrides.kitPrice;
    if (kitPriceRaw != null && kitPriceRaw !== "") {
      payload.kitPrice = Math.round(Number(kitPriceRaw));
    }
  } else {
    payload.kitPrice = null;
  }

  return payload;
};

const mapAccessorySnapshot = (item) => ({
  id: Number(item.id) || 0,
  name: String(item.name || ""),
  sku: String(item.sku || ""),
  price: Number(item.price) || 0,
  category: String(item.category || ""),
});

const mergeManufacturers = (...lists) => {
  const seen = new Set();
  const result = [];
  for (const list of lists) {
    for (const raw of list) {
      const name = String(raw || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, "ru"));
};

const listProductManufacturers = async () => {
  const res = await query(
    `
    SELECT DISTINCT TRIM(p.attrs->>'manufacturer') AS name
    FROM products p
    WHERE p.is_active = TRUE
      AND TRIM(COALESCE(p.attrs->>'manufacturer', '')) <> ''
    ORDER BY name ASC
    `,
  );
  return res.rows.map((row) => String(row.name || "").trim()).filter(Boolean);
};

const getCategoryMeta = async () => {
  const categories = await categoryRepository.listCategories();
  const entry = categories.find((c) => c.slug === ENTRY_DOORS_CATEGORY_SLUG) || null;
  const interior = categories.find((c) => c.slug === INTERIOR_DOORS_CATEGORY_SLUG) || null;
  return {
    categoryIds: {
      entry: entry?.id ?? null,
      interior: interior?.id ?? null,
    },
    categoryLabels: {
      entry: entry?.name || "Входные двери",
      interior: interior?.name || "Межкомнатные двери",
    },
  };
};

const buildColorOptions = (productColor, finishes) => {
  const options = [];
  const seen = new Set();
  const push = (value) => {
    const name = String(value || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push(name);
  };

  push(productColor);
  for (const finish of finishes) {
    push(finish.name);
  }
  return options;
};

const buildSnapshotFromProduct = (product, categoryType) => {
  const manufacturer =
    product.attributes?.find((attr) => attr.code === "manufacturer")?.value?.trim() ||
    "";
  const productColor =
    product.attributes?.find((attr) => attr.code === "color")?.value?.trim() || "";
  const accessories = (product.accessories || []).map(mapAccessorySnapshot);
  const kitPrice = categoryType === "interior" ? product.kitPrice ?? null : null;

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku || "",
    manufacturerName: manufacturer,
    coatingColor: productColor,
    coatingType: String(product.subcategory || "").trim(),
    price: product.price,
    kitPrice,
    accessories,
  };
};

const getProductPreview = async ({ productId, categoryType }) => {
  const normalizedType = String(categoryType || "").trim();
  if (!CATEGORY_TYPES.has(normalizedType)) {
    return { ok: false, message: "Укажите категорию: entry или interior", status: 400 };
  }

  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, message: "Укажите корректный товар", status: 400 };
  }

  const product = await productRepository.getProductById(numericId);
  if (!product) {
    return { ok: false, message: "Товар не найден", status: 404 };
  }

  const expectedSlug = CATEGORY_TYPE_TO_SLUG[normalizedType];
  if (product.categorySlug !== expectedSlug) {
    return {
      ok: false,
      message:
        normalizedType === "entry"
          ? "Выбранный товар не относится к входным дверям"
          : "Выбранный товар не относится к межкомнатным дверям",
      status: 400,
    };
  }

  const manufacturer =
    product.attributes?.find((attr) => attr.code === "manufacturer")?.value?.trim() ||
    "";
  const productColor =
    product.attributes?.find((attr) => attr.code === "color")?.value?.trim() || "";

  const [finishRows, productManufacturers, finishManufacturers] = await Promise.all([
    manufacturer ? doorFinishRepository.listActiveByManufacturer(manufacturer) : [],
    listProductManufacturers(),
    doorFinishRepository.listManufacturers(),
  ]);

  const snapshot = buildSnapshotFromProduct(product, normalizedType);

  return {
    ok: true,
    preview: {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku || "",
        price: product.price,
        categorySlug: product.categorySlug,
        subcategory: product.subcategory || "",
      },
      manufacturerName: snapshot.manufacturerName,
      price: snapshot.price,
      kitPrice: snapshot.kitPrice,
      accessories: snapshot.accessories,
      defaultCoatingColor: snapshot.coatingColor,
      colorOptions: buildColorOptions(productColor, finishRows),
      manufacturers: mergeManufacturers(
        snapshot.manufacturerName,
        productManufacturers,
        finishManufacturers,
      ),
      snapshot,
    },
  };
};

const validatePayload = (payload, { partial = false } = {}) => {
  const categoryType = String(payload.categoryType ?? "").trim();
  const productName = String(payload.productName ?? "").trim();

  if (!partial || payload.categoryType !== undefined) {
    if (!CATEGORY_TYPES.has(categoryType)) {
      return { ok: false, message: "Категория должна быть entry или interior" };
    }
  }

  if (!partial || payload.productName !== undefined) {
    if (productName.length < 2) {
      return { ok: false, message: "Наименование должно быть не короче 2 символов" };
    }
  }

  const productIdRaw = payload.productId;
  const productId =
    productIdRaw == null || productIdRaw === ""
      ? null
      : Number(productIdRaw);
  if (productId != null && (!Number.isInteger(productId) || productId <= 0)) {
    return { ok: false, message: "Некорректный идентификатор товара" };
  }

  const accessories = Array.isArray(payload.accessories)
    ? payload.accessories.map(mapAccessorySnapshot)
    : [];

  const priceRaw = payload.price;
  const price =
    priceRaw == null || priceRaw === "" ? null : Math.round(Number(priceRaw));
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, message: "Некорректная цена" };
  }

  const resolvedCategoryType = CATEGORY_TYPES.has(categoryType) ? categoryType : "entry";
  let kitPrice = null;
  if (resolvedCategoryType === "interior") {
    const kitPriceRaw = payload.kitPrice;
    kitPrice =
      kitPriceRaw == null || kitPriceRaw === "" ? null : Math.round(Number(kitPriceRaw));
    if (kitPrice != null && (!Number.isFinite(kitPrice) || kitPrice < 0)) {
      return { ok: false, message: "Некорректная цена комплекта" };
    }
  }

  return {
    ok: true,
    value: {
      categoryType: resolvedCategoryType,
      productId,
      productName,
      productSku: String(payload.productSku ?? "").trim(),
      coatingColor: String(payload.coatingColor ?? "").trim(),
      coatingType: String(payload.coatingType ?? "").trim(),
      manufacturerName: String(payload.manufacturerName ?? "").trim(),
      accessories,
      price,
      kitPrice,
      sortOrder: Number(payload.sortOrder) || 0,
    },
  };
};

const listAdminExhibition = async () => {
  const [items, manufacturers, meta] = await Promise.all([
    exhibitionDoorRepository.listAll(),
    exhibitionDoorRepository.listManufacturers(),
    getCategoryMeta(),
  ]);
  const allManufacturers = mergeManufacturers(
    manufacturers,
    await listProductManufacturers(),
    await doorFinishRepository.listManufacturers(),
  );
  return { items, manufacturers: allManufacturers, meta };
};

const createExhibitionDoor = async (payload) => {
  const validated = validatePayload(payload);
  if (!validated.ok) return validated;

  if (validated.value.productId) {
    const preview = await getProductPreview({
      productId: validated.value.productId,
      categoryType: validated.value.categoryType,
    });
    if (!preview.ok) return preview;
  }

  const item = await exhibitionDoorRepository.create(validated.value);
  return { ok: true, item };
};

const addFromCatalogProduct = async (overrides = {}) => {
  const numericId = Number(overrides.productId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, message: "Укажите корректный товар", status: 400 };
  }

  const product = await productRepository.getProductById(numericId);
  if (!product) {
    return { ok: false, message: "Товар не найден", status: 404 };
  }

  const categoryType = resolveCategoryTypeFromSlug(product.categorySlug);
  if (!categoryType) {
    return {
      ok: false,
      message: "На выставку можно добавить только входные и межкомнатные двери",
      status: 400,
    };
  }

  const preview = await getProductPreview({ productId: numericId, categoryType });
  if (!preview.ok) return preview;

  const payload = applyFromProductOverrides(preview.preview.snapshot, categoryType, overrides);
  return createExhibitionDoor(payload);
};

const updateExhibitionDoor = async (id, payload) => {
  const existing = await exhibitionDoorRepository.getById(id);
  if (!existing) return { ok: false, message: "Запись не найдена", status: 404 };

  const merged = {
    categoryType: payload.categoryType ?? existing.categoryType,
    productId: payload.productId !== undefined ? payload.productId : existing.productId,
    productName: payload.productName ?? existing.productName,
    productSku: payload.productSku ?? existing.productSku,
    coatingColor: payload.coatingColor ?? existing.coatingColor,
    coatingType: payload.coatingType ?? existing.coatingType,
    manufacturerName: payload.manufacturerName ?? existing.manufacturerName,
    accessories: payload.accessories ?? existing.accessories,
    price: payload.price !== undefined ? payload.price : existing.price,
    kitPrice: payload.kitPrice !== undefined ? payload.kitPrice : existing.kitPrice,
    sortOrder: payload.sortOrder !== undefined ? payload.sortOrder : existing.sortOrder,
  };

  const validated = validatePayload(merged);
  if (!validated.ok) return validated;

  if (
    payload.productId !== undefined &&
    validated.value.productId &&
    validated.value.productId !== existing.productId
  ) {
    const preview = await getProductPreview({
      productId: validated.value.productId,
      categoryType: validated.value.categoryType,
    });
    if (!preview.ok) return preview;
  }

  const item = await exhibitionDoorRepository.update(id, validated.value);
  if (!item) return { ok: false, message: "Запись не найдена", status: 404 };
  return { ok: true, item };
};

const deleteExhibitionDoor = async (id) => {
  const deleted = await exhibitionDoorRepository.remove(id);
  if (!deleted) return { ok: false, message: "Запись не найдена", status: 404 };
  return { ok: true };
};

module.exports = {
  listAdminExhibition,
  createExhibitionDoor,
  addFromCatalogProduct,
  updateExhibitionDoor,
  deleteExhibitionDoor,
  getProductPreview,
  getCategoryMeta,
  resolveCategoryTypeFromSlug,
  applyFromProductOverrides,
};
