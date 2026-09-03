const PizZip = require("pizzip");
const productRepository = require("../repositories/productRepository");
const { resolveImageBuffer } = require("../domain/resolveImageBuffer");
const { renderDirectCreative } = require("../domain/directCreativeRender");
const { formatProductDisplayName } = require("../../product-display-name");
const { SITE_LOGO_PATH, getSiteUrl } = require("../domain/kpPdfCompany");
const {
  MAX_PRODUCTS,
  DEFAULT_SCALE,
  MAX_NAME_LEN,
  MAX_PRICE_LABEL_LEN,
  MAX_SITE_NAME_LEN,
  MAX_CTA_LEN,
  MAX_COLLAGE_PHOTOS,
  DEFAULT_CTA_TEXT,
  getSizeById,
  resolveScale,
  resolveOutputPixels,
  buildCreativeFilename,
  clipCreativeText,
  formatPriceFrom,
  formatCreativeBrandLine,
} = require("../../direct-creative-sizes");

const uniquePositiveInts = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const ids = [];
  const seen = new Set();
  for (const item of list) {
    const numeric = Number(item);
    if (!Number.isInteger(numeric) || numeric <= 0 || seen.has(numeric)) continue;
    seen.add(numeric);
    ids.push(numeric);
  }
  return ids;
};

const uniqueSizeIds = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const ids = [];
  const seen = new Set();
  for (const item of list) {
    const size = getSizeById(item);
    if (!size || seen.has(size.id)) continue;
    seen.add(size.id);
    ids.push(size.id);
  }
  return ids;
};

const normalizeTextsByProductId = (raw) => {
  const map = new Map();
  const list = Array.isArray(raw) ? raw : [];
  for (const entry of list) {
    const id = Number(entry?.productId ?? entry?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    map.set(id, {
      name: clipCreativeText(entry?.name, MAX_NAME_LEN),
      priceLabel: clipCreativeText(entry?.priceLabel, MAX_PRICE_LABEL_LEN),
      compareLabel:
        entry?.compareLabel === undefined || entry?.compareLabel === null
          ? undefined
          : clipCreativeText(entry.compareLabel, MAX_PRICE_LABEL_LEN),
      photoProductIds: uniquePositiveInts(entry?.photoProductIds).slice(0, MAX_COLLAGE_PHOTOS),
    });
  }
  return map;
};

const normalizeDirectCreativeRequest = (body = {}) => {
  const productIds = uniquePositiveInts(body.productIds);
  const sizeIds = uniqueSizeIds(body.sizeIds);
  const scale = resolveScale(body.scale) ?? DEFAULT_SCALE;
  const mode = body.mode === "preview" ? "preview" : "zip";
  const siteName = clipCreativeText(body.siteName, MAX_SITE_NAME_LEN);
  const ctaText =
    clipCreativeText(body.ctaText ?? DEFAULT_CTA_TEXT, MAX_CTA_LEN) || DEFAULT_CTA_TEXT;
  const showDiscountBadge = body.showDiscountBadge !== false;
  const textsByProductId = normalizeTextsByProductId(body.texts);

  if (productIds.length === 0) {
    return { ok: false, message: "Выберите хотя бы одну модель двери", status: 400 };
  }
  if (productIds.length > MAX_PRODUCTS) {
    return {
      ok: false,
      message: `Можно выбрать не больше ${MAX_PRODUCTS} моделей`,
      status: 400,
    };
  }
  if (sizeIds.length === 0) {
    return { ok: false, message: "Выберите хотя бы один размер", status: 400 };
  }

  return {
    ok: true,
    productIds,
    sizeIds,
    scale,
    mode,
    siteName,
    ctaText,
    showDiscountBadge,
    textsByProductId,
  };
};

const attrValue = (product, code) => {
  const list = Array.isArray(product?.attributes) ? product.attributes : [];
  const found = list.find((entry) => entry && entry.code === code);
  return found ? String(found.value || "").trim() : "";
};

const displayNameForProduct = (product) =>
  formatProductDisplayName({
    name: product.name,
    color: attrValue(product, "color"),
    glass: attrValue(product, "glass"),
    manufacturer: attrValue(product, "manufacturer"),
    categorySlug: product.categorySlug,
    category: product.category,
  });

const loadCollagePhotos = async (product, text) => {
  const requested = uniquePositiveInts(text?.photoProductIds);
  const ids = (requested.length > 0 ? requested : [product.id]).slice(0, MAX_COLLAGE_PHOTOS);
  const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
  const byId = new Map();
  for (const entry of variants) {
    const id = Number(entry?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    byId.set(id, {
      id,
      color: String(entry.color || "").trim(),
      image: String(entry.image || "").trim(),
    });
  }
  if (!byId.has(product.id)) {
    byId.set(product.id, {
      id: product.id,
      color: attrValue(product, "color"),
      image: product.image || "",
    });
  }

  const buffers = [];
  const labels = [];
  for (const id of ids) {
    const variant = byId.get(id);
    const image = variant?.image || (id === product.id ? product.image : "");
    if (!image) continue;
    const resolved = await resolveImageBuffer(image);
    if (!resolved?.buffer) continue;
    buffers.push(resolved.buffer);
    labels.push(variant?.color || "");
  }
  return { buffers, labels };
};

const listCreativeColorVariants = async (productId) => {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Некорректный товар", status: 400 };
  }
  const product = await productRepository.getProductById(id);
  if (!product) {
    return { ok: false, message: "Товар не найден", status: 404 };
  }
  const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
  const items = [];
  const seen = new Set();
  const push = (entry) => {
    const variantId = Number(entry.id);
    if (!Number.isInteger(variantId) || variantId <= 0 || seen.has(variantId)) return;
    seen.add(variantId);
    items.push({
      id: variantId,
      color: String(entry.color || "").trim(),
      image: String(entry.image || "").trim(),
      isCurrent: variantId === id,
    });
  };
  for (const entry of variants) push(entry);
  if (!seen.has(id)) {
    items.unshift({
      id,
      color: attrValue(product, "color"),
      image: product.image || "",
      isCurrent: true,
    });
  }
  return { ok: true, variants: items };
};

const loadLogoBuffer = async () => {
  const logo = await resolveImageBuffer(SITE_LOGO_PATH);
  return logo?.buffer || null;
};

const renderProductSize = async ({
  product,
  size,
  scale,
  logoBuffer,
  text,
  siteName,
  ctaText,
  showDiscountBadge,
}) => {
  const pixels = resolveOutputPixels(size, scale);
  const catalogName = displayNameForProduct(product);
  const collage = await loadCollagePhotos(product, text);
  if (collage.buffers.length === 0) {
    return {
      ok: false,
      skipped: true,
      productId: product.id,
      message: `Нет фото у «${product.name}»`,
    };
  }

  const rendered = await renderDirectCreative({
    blockWidth: size.blockWidth,
    blockHeight: size.blockHeight,
    scale,
    family: size.family,
    photoBuffers: collage.buffers,
    photoLabels: collage.labels,
    logoBuffer,
    name: text?.name || catalogName,
    price: product.price,
    priceLabel: text?.priceLabel || formatPriceFrom(product.price),
    compareAtPrice: product.compareAtPrice,
    compareLabel: text?.compareLabel,
    isOnSale: product.isOnSale,
    siteName,
    ctaText,
    showDiscountBadge,
  });

  const warning =
    rendered.sourceWidth > 0 && rendered.outputPhotoWidth > rendered.sourceWidth
      ? `Фото «${product.name}» ${rendered.sourceWidth}px уже слота ${rendered.outputPhotoWidth}px — на баннере может быть мыло`
      : "";

  return {
    ok: true,
    buffer: rendered.buffer,
    filename: buildCreativeFilename({
      sku: product.sku,
      productId: product.id,
      width: pixels.width,
      height: pixels.height,
    }),
    bytes: rendered.bytes,
    warning,
  };
};

const pad2 = (value) => String(value).padStart(2, "0");

const buildZipFilename = (date = new Date()) => {
  const stamp = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `yandex-direct-creatives-${stamp}.zip`;
};

const generateDirectCreatives = async (body) => {
  const parsed = normalizeDirectCreativeRequest(body);
  if (!parsed.ok) return parsed;

  const productIds = parsed.mode === "preview" ? parsed.productIds.slice(0, 1) : parsed.productIds;
  const sizeIds = parsed.mode === "preview" ? parsed.sizeIds.slice(0, 1) : parsed.sizeIds;
  const sizes = sizeIds.map((id) => getSizeById(id)).filter(Boolean);

  const products = [];
  const warnings = [];
  for (const id of productIds) {
    const product = await productRepository.getProductById(id);
    if (!product) {
      warnings.push(`Товар #${id} не найден`);
      continue;
    }
    if (!product.image) {
      warnings.push(`Нет фото у «${product.name}»`);
      continue;
    }
    products.push(product);
  }

  if (products.length === 0) {
    return {
      ok: false,
      message: warnings[0] || "Нет товаров с фото для генерации",
      status: 400,
      warnings,
    };
  }

  const logoBuffer = await loadLogoBuffer();
  const siteName = parsed.siteName || formatCreativeBrandLine(getSiteUrl());
  const ctaText = parsed.ctaText || DEFAULT_CTA_TEXT;
  const showDiscountBadge = parsed.showDiscountBadge !== false;

  if (parsed.mode === "preview") {
    const result = await renderProductSize({
      product: products[0],
      size: sizes[0],
      scale: parsed.scale,
      logoBuffer,
      text: parsed.textsByProductId.get(products[0].id),
      siteName,
      ctaText,
      showDiscountBadge,
    });
    if (!result.ok) {
      return { ok: false, message: result.message, status: 400, warnings };
    }
    if (result.warning && !warnings.includes(result.warning)) {
      warnings.push(result.warning);
    }
    return {
      ok: true,
      mode: "preview",
      buffer: result.buffer,
      filename: result.filename,
      contentType: "image/jpeg",
      warnings,
    };
  }

  const zip = new PizZip();
  let added = 0;
  const usedNames = new Set();
  for (const product of products) {
    for (const size of sizes) {
      const result = await renderProductSize({
        product,
        size,
        scale: parsed.scale,
        logoBuffer,
        text: parsed.textsByProductId.get(product.id),
        siteName,
        ctaText,
        showDiscountBadge,
      });
      if (!result.ok) {
        warnings.push(result.message);
        continue;
      }
      if (result.warning && !warnings.includes(result.warning)) {
        warnings.push(result.warning);
      }
      let filename = result.filename;
      if (usedNames.has(filename)) {
        filename = filename.replace(/\.jpg$/i, `-${product.id}.jpg`);
      }
      usedNames.add(filename);
      zip.file(filename, result.buffer);
      added += 1;
    }
  }

  if (added === 0) {
    return {
      ok: false,
      message: "Не удалось собрать ни одного креатива",
      status: 400,
      warnings,
    };
  }

  if (warnings.length > 0) {
    zip.file("warnings.txt", `${warnings.join("\n")}\n`);
  }

  return {
    ok: true,
    mode: "zip",
    buffer: zip.generate({ type: "nodebuffer", compression: "DEFLATE" }),
    filename: buildZipFilename(),
    contentType: "application/zip",
    warnings,
    count: added,
  };
};

module.exports = {
  normalizeDirectCreativeRequest,
  generateDirectCreatives,
  listCreativeColorVariants,
  displayNameForProduct,
  buildZipFilename,
  normalizeTextsByProductId,
};
