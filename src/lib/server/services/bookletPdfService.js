const sharp = require("sharp");
const productRepository = require("../repositories/productRepository");
const categoryRepository = require("../repositories/categoryRepository");
const { resolveImageBuffer } = require("../domain/resolveImageBuffer");
const { generateQrCodePng } = require("../domain/qrCodePng");
const { renderBookletPdf } = require("../domain/bookletPdfRender");
const { formatProductDisplayName } = require("../../product-display-name");
const {
  formatPriceFrom,
  formatPriceRub,
  formatCreativeBrandLine,
} = require("../../direct-creative-sizes");
const { resolveProductBadges } = require("../domain/productBadges");
const {
  BOOKLET_FORMATS,
  DEFAULT_HEADLINE,
  DEFAULT_SUBHEAD,
  DEFAULT_COUPON_TEXT,
  QR_HINT_TEXT,
  HEADLINE_PRESETS,
  ENTRY_DOORS_CATEGORY_SLUG,
  INTERIOR_DOORS_CATEGORY_SLUG,
  getFormatById,
  clipHeadline,
  clipSubhead,
  clipCoupon,
  uniquePositiveInts,
  doorKindFromSlug,
  buildBookletFilename,
} = require("../../booklet-formats");
const {
  SITE_PHONE_DISPLAY,
  SITE_EMAIL,
  SITE_ADDRESS,
  SITE_ADDRESS_SHORT,
  SITE_HOURS,
  SITE_LOGO_PATH,
  getSiteUrl,
} = require("../domain/kpPdfCompany");

const SITE_HOST_FALLBACK = "doorpoint29.ru";

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

const resolveBookletPrice = (product) => {
  const kit = Number(product?.kitPrice);
  if (
    doorKindFromSlug(product?.categorySlug) === "interior" &&
    Number.isFinite(kit) &&
    kit > 0
  ) {
    return kit;
  }
  return Number(product?.price) || 0;
};

const resolveComparePrice = (product) => {
  const compare = Number(product?.compareAtPrice);
  const price = resolveBookletPrice(product);
  if (!Number.isFinite(compare) || compare <= price) return null;
  if (product?.isOnSale !== true) return null;
  return compare;
};

const buildMetaLine = (product) => {
  const manufacturer = attrValue(product, "manufacturer");
  const color = attrValue(product, "color");
  return [manufacturer, color].filter(Boolean).join(" · ");
};

const badgeLabelsForProduct = (product) => {
  const fromBadges = resolveProductBadges(product?.badges).map((item) => item.label);
  if (product?.isOnSale === true && !fromBadges.includes("Акция")) {
    fromBadges.push("Акция");
  }
  return fromBadges.slice(0, 2);
};

const normalizeBookletRequest = (body = {}) => {
  const format = getFormatById(body.format);
  if (!format) {
    return { ok: false, message: "Выберите формат буклета", status: 400 };
  }

  const entryProductIds = uniquePositiveInts(body.entryProductIds);
  const interiorProductIds = uniquePositiveInts(body.interiorProductIds);

  if (entryProductIds.length === 0 && interiorProductIds.length === 0) {
    return { ok: false, message: "Выберите хотя бы одну модель двери", status: 400 };
  }
  if (entryProductIds.length > format.maxEntry) {
    return {
      ok: false,
      message: `Для формата ${format.label} можно выбрать не больше ${format.maxEntry} входных дверей`,
      status: 400,
    };
  }
  if (interiorProductIds.length > format.maxInterior) {
    return {
      ok: false,
      message: `Для формата ${format.label} можно выбрать не больше ${format.maxInterior} межкомнатных дверей`,
      status: 400,
    };
  }

  return {
    ok: true,
    format,
    entryProductIds,
    interiorProductIds,
    showPrices: body.showPrices !== false,
    showComparePrices: body.showComparePrices === true,
    showCoupon: body.showCoupon !== false,
    headline: clipHeadline(body.headline) || DEFAULT_HEADLINE,
    subhead: clipSubhead(body.subhead ?? DEFAULT_SUBHEAD),
    couponText: clipCoupon(body.couponText ?? DEFAULT_COUPON_TEXT),
  };
};

const toJpegBuffer = async (buffer) => {
  try {
    return await sharp(buffer).rotate().jpeg({ quality: 86 }).toBuffer();
  } catch {
    return null;
  }
};

const loadLogoBuffer = async () => {
  const logo = await resolveImageBuffer(SITE_LOGO_PATH);
  if (!logo?.buffer) return null;
  return (await toJpegBuffer(logo.buffer)) || logo.buffer;
};

const categoryLabelForKind = (kind) =>
  kind === "entry" ? "входным дверям" : "межкомнатным дверям";

const loadTaggedProducts = async (ids, expectedKind, warnings) => {
  const items = [];
  for (const id of ids) {
    const product = await productRepository.getProductById(id);
    if (!product) {
      warnings.push(`Товар #${id} не найден`);
      continue;
    }
    const kind = doorKindFromSlug(product.categorySlug);
    if (kind !== expectedKind) {
      return {
        ok: false,
        message: `«${product.name}» не относится к ${categoryLabelForKind(expectedKind)}`,
        status: 400,
      };
    }
    if (!product.image) {
      warnings.push(`Нет фото у «${product.name}»`);
      continue;
    }
    const resolved = await resolveImageBuffer(product.image);
    const jpeg = resolved?.buffer ? await toJpegBuffer(resolved.buffer) : null;
    if (!jpeg) {
      warnings.push(`Не удалось подготовить фото «${product.name}»`);
      continue;
    }
    const price = resolveBookletPrice(product);
    const compare = resolveComparePrice(product);
    items.push({
      id: product.id,
      name: displayNameForProduct(product),
      metaLine: buildMetaLine(product),
      priceLabel: formatPriceFrom(price),
      compareLabel: compare != null ? formatPriceRub(compare) : "",
      badges: badgeLabelsForProduct(product),
      imageBuffer: jpeg,
      kind: expectedKind,
    });
  }
  return { ok: true, items };
};

const resolveSiteHost = (siteUrl) => formatCreativeBrandLine(siteUrl) || SITE_HOST_FALLBACK;

const getBookletMeta = async () => {
  const categories = await categoryRepository.listCategories();
  const entry = categories.find((item) => item.slug === ENTRY_DOORS_CATEGORY_SLUG) || null;
  const interior = categories.find((item) => item.slug === INTERIOR_DOORS_CATEGORY_SLUG) || null;
  return {
    categoryIds: {
      entry: entry?.id ?? null,
      interior: interior?.id ?? null,
    },
    categoryLabels: {
      entry: entry?.name || "Входные двери",
      interior: interior?.name || "Межкомнатные двери",
    },
    formats: BOOKLET_FORMATS.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      maxEntry: item.maxEntry,
      maxInterior: item.maxInterior,
    })),
    defaultHeadline: DEFAULT_HEADLINE,
    defaultSubhead: DEFAULT_SUBHEAD,
    defaultCouponText: DEFAULT_COUPON_TEXT,
    headlinePresets: HEADLINE_PRESETS,
  };
};

const generateBookletPdf = async (body) => {
  const parsed = normalizeBookletRequest(body);
  if (!parsed.ok) return parsed;

  const warnings = [];
  const entryLoaded = await loadTaggedProducts(parsed.entryProductIds, "entry", warnings);
  if (!entryLoaded.ok) return entryLoaded;
  const interiorLoaded = await loadTaggedProducts(parsed.interiorProductIds, "interior", warnings);
  if (!interiorLoaded.ok) return interiorLoaded;

  if (entryLoaded.items.length === 0 && interiorLoaded.items.length === 0) {
    return {
      ok: false,
      message: warnings[0] || "Нет товаров с фото для буклета",
      status: 400,
      warnings,
    };
  }

  const siteUrl = getSiteUrl();
  const [logoBuffer, qrBuffer] = await Promise.all([
    loadLogoBuffer(),
    generateQrCodePng(siteUrl, { width: 256, margin: 1 }),
  ]);

  const payload = {
    format: parsed.format,
    headline: parsed.headline,
    subhead: parsed.subhead,
    couponText: parsed.showCoupon ? parsed.couponText : "",
    showPrices: parsed.showPrices,
    showComparePrices: parsed.showComparePrices,
    phone: SITE_PHONE_DISPLAY,
    email: SITE_EMAIL,
    addressShort: SITE_ADDRESS_SHORT,
    addressFull: SITE_ADDRESS,
    hours: SITE_HOURS,
    siteHost: resolveSiteHost(siteUrl),
    qrHint: QR_HINT_TEXT,
    logoBuffer,
    qrBuffer,
    entryProducts: entryLoaded.items,
    interiorProducts: interiorLoaded.items,
  };

  const buffer = await renderBookletPdf(payload);
  return {
    ok: true,
    buffer,
    filename: buildBookletFilename(parsed.format.id),
    contentType: "application/pdf",
    warnings,
  };
};

module.exports = {
  normalizeBookletRequest,
  generateBookletPdf,
  getBookletMeta,
  resolveBookletPrice,
  resolveComparePrice,
  displayNameForProduct,
};
