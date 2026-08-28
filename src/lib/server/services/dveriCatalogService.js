const productRepository = require("../repositories/productRepository");

const DVERI_EXPORT_URL = "https://dveri.com/export/json/moskva";
const CACHE_TTL_MS = 30 * 60_000;

/** @type {{ raw: object; fetchedAt: number } | null} */
let cache = null;

const applyDiscount = (price, discountPercent) => {
  const base = Number(price ?? 0);
  const discount = Number(discountPercent ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(discount) || discount <= 0) return Math.round(base);
  return Math.round(base * (1 - discount / 100));
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const normalizeOptions = (options) =>
  asArray(options).map((opt) => ({
    id: opt.id,
    title: String(opt.title ?? ""),
    vendorCode: String(opt.vendor_code ?? ""),
    price: Number(opt.price ?? 0),
    priceDealer: Number(opt.price_dealer ?? 0),
    discount: Number(opt.discount ?? 0),
    discountDealer: Number(opt.discount_dealer ?? 0),
    priceFinal: applyDiscount(opt.price, opt.discount),
    priceDealerFinal: applyDiscount(opt.price_dealer, opt.discount_dealer),
    label: opt.label != null ? String(opt.label) : null,
  }));

const buildCategoryPaths = (categories) => {
  const list = Array.isArray(categories) ? categories : [];
  const byId = new Map(list.map((cat) => [cat.id, cat]));
  const pathCache = new Map();

  const getPath = (id) => {
    if (pathCache.has(id)) return pathCache.get(id);
    const cat = byId.get(id);
    if (!cat) return "";
    const parentPath = cat.parent_id ? getPath(cat.parent_id) : "";
    const path = parentPath ? `${parentPath} / ${cat.title}` : String(cat.title ?? "");
    pathCache.set(id, path);
    return path;
  };

  return [...list]
    .sort((a, b) => (a.lft ?? 0) - (b.lft ?? 0))
    .map((cat) => ({
      id: cat.id,
      title: String(cat.title ?? ""),
      parentId: cat.parent_id ?? null,
      path: getPath(cat.id),
    }));
};

const normalizeCatalog = (raw) => {
  const categories = buildCategoryPaths(raw.categories);
  const categoryPathById = new Map(categories.map((cat) => [cat.id, cat.path]));

  const trademarks = asArray(raw.trademarks)
    .map((item) => ({
      id: item.id,
      title: String(item.title ?? ""),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));

  const trademarkById = new Map(trademarks.map((item) => [item.id, item.title]));
  const colorById = new Map(
    asArray(raw.colors).map((item) => [item.id, String(item.title ?? "")]),
  );
  const glassById = new Map(
    asArray(raw.glasses).map((item) => [item.id, String(item.title ?? "")]),
  );

  const products = asArray(raw.products).map((product) => {
    const options = normalizeOptions(product.options);
    const categoryId = product.category_id ?? null;

    return {
      id: product.id,
      title: String(product.title ?? ""),
      url: String(product.url ?? ""),
      categoryId,
      categoryPath: categoryId != null ? categoryPathById.get(categoryId) ?? "" : "",
      trademarkId: product.trademark_id ?? null,
      trademark: product.trademark_id != null ? trademarkById.get(product.trademark_id) ?? "" : "",
      color: product.color_id != null ? colorById.get(product.color_id) ?? "" : "",
      glass: product.glass_id != null ? glassById.get(product.glass_id) ?? "" : "",
      vendorCode: String(product.vendor_code ?? ""),
      price: Number(product.price ?? 0),
      priceDealer: Number(product.price_dealer ?? 0),
      discount: Number(product.discount ?? 0),
      discountDealer: Number(product.discount_dealer ?? 0),
      priceFinal: applyDiscount(product.price, product.discount),
      priceDealerFinal: applyDiscount(product.price_dealer, product.discount_dealer),
      label: product.label != null ? String(product.label) : null,
      pictureSmall:
        product.pictures?.[0]?.small ||
        product.pictures?.[0]?.medium ||
        product.pictures?.[0]?.normal ||
        null,
      options,
      optionCount: options.length,
    };
  });

  return {
    city: "moskva",
    cityLabel: "Москва",
    categories,
    trademarks,
    products,
    stats: {
      productCount: products.length,
      categoryCount: categories.length,
      trademarkCount: trademarks.length,
      withOptionsCount: products.filter((p) => p.optionCount > 0).length,
    },
  };
};

const collectVendorCodes = (products) => {
  const codes = new Set();
  for (const product of Array.isArray(products) ? products : []) {
    const baseCode = String(product.vendorCode || "").trim();
    if (baseCode) codes.add(baseCode);
    for (const option of product.options || []) {
      const optionCode = String(option.vendorCode || "").trim();
      if (optionCode) codes.add(optionCode);
    }
  }
  return [...codes];
};

const attachStorefrontPrices = async (catalog) => {
  const vendorCodes = collectVendorCodes(catalog.products);
  const storefrontPrices = await productRepository.mapStorefrontPricesByManufacturerIds(vendorCodes);
  return { ...catalog, storefrontPrices };
};

const getCatalog = async ({ refresh = false } = {}) => {
  if (!refresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    const catalog = await attachStorefrontPrices(normalizeCatalog(cache.raw));
    return {
      ok: true,
      data: {
        ...catalog,
        cached: true,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
      },
    };
  }

  try {
    const upstream = await fetch(DVERI_EXPORT_URL, {
      headers: { Accept: "application/json" },
    });

    const text = await upstream.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      return {
        ok: false,
        status: 502,
        message: "Некорректный ответ выгрузки dveri.com",
        error: "Некорректный ответ выгрузки dveri.com",
      };
    }

    if (!upstream.ok) {
      const message = `Ошибка выгрузки dveri.com (${upstream.status})`;
      return {
        ok: false,
        status: upstream.status,
        message,
        error: message,
      };
    }

    cache = { raw: payload, fetchedAt: Date.now() };
    const catalog = await attachStorefrontPrices(normalizeCatalog(payload));
    return {
      ok: true,
      data: {
        ...catalog,
        cached: false,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
      },
    };
  } catch (err) {
    console.error("Dveri catalog proxy error:", err);
    return {
      ok: false,
      status: 502,
      message: "Не удалось загрузить каталог dveri.com",
      error: "Не удалось загрузить каталог dveri.com",
    };
  }
};

module.exports = {
  getCatalog,
};
