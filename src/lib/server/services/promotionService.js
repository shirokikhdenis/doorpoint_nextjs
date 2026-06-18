const promotionRepository = require("../repositories/promotionRepository");
const catalogPageRepository = require("../repositories/catalogPageRepository");
const { query } = require("../db/postgres");

const MANUFACTURER_ATTR_CODE = "manufacturer";

let collectionAttrCodeCache = null;

const resolveCollectionAttrCode = async () => {
  if (collectionAttrCodeCache) return collectionAttrCodeCache;
  const res = await query(
    `
    SELECT code
    FROM attribute_definitions
    WHERE code = 'collection' OR name ILIKE '%коллек%'
    ORDER BY CASE WHEN code = 'collection' THEN 0 ELSE 1 END, sort_order ASC, id ASC
    LIMIT 1
    `,
  );
  collectionAttrCodeCache = res.rows[0]?.code ? String(res.rows[0].code) : "collection";
  return collectionAttrCodeCache;
};

const catalogPagePath = (slug) => {
  const normalized = String(slug || "all").trim() || "all";
  if (normalized === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(normalized)}`;
};

const buildCatalogHref = async (banner) => {
  const slug = String(banner?.catalogPageSlug || "all").trim() || "all";
  const params = new URLSearchParams();
  params.set("onSale", "1");

  const manufacturer = String(banner?.filterManufacturer || "").trim();
  if (manufacturer) params.set(`attr_${MANUFACTURER_ATTR_CODE}`, manufacturer);

  const collection = String(banner?.filterCollection || "").trim();
  if (collection) {
    const code = await resolveCollectionAttrCode();
    params.set(`attr_${code}`, collection);
  }

  const path = catalogPagePath(slug);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const attachHref = async (banner) => ({
  ...banner,
  href: await buildCatalogHref(banner),
});

const validateCatalogPageSlug = async (slug) => {
  const raw = String(slug || "all").trim() || "all";
  if (raw === "all") return { ok: true, slug: raw };
  const page = await catalogPageRepository.findCatalogPageBySlug(raw);
  if (!page) return { ok: false, message: "Витрина не найдена" };
  return { ok: true, slug: raw };
};

const listActivePromotions = async () => {
  const items = await promotionRepository.listActive();
  return Promise.all(items.map(attachHref));
};

const listAllPromotions = async () => {
  const items = await promotionRepository.listAll();
  return Promise.all(items.map(attachHref));
};

const normalizeOptionalFilter = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed || null;
};

const createPromotion = async (payload) => {
  const title = String(payload.title || "").trim();
  const backgroundImageUrl = String(payload.backgroundImageUrl || "").trim();
  if (!title) return { ok: false, message: "Укажите заголовок" };
  if (!backgroundImageUrl) return { ok: false, message: "Укажите фото для фона" };

  const slugCheck = await validateCatalogPageSlug(payload.catalogPageSlug);
  if (!slugCheck.ok) return { ok: false, message: slugCheck.message };

  const banner = await promotionRepository.create({
    title,
    subtitle: payload.subtitle,
    backgroundImageUrl,
    catalogPageSlug: slugCheck.slug,
    filterManufacturer: normalizeOptionalFilter(payload.filterManufacturer),
    filterCollection: normalizeOptionalFilter(payload.filterCollection),
    sortOrder: payload.sortOrder,
    isActive: payload.isActive !== false,
  });
  return { ok: true, banner: await attachHref(banner) };
};

const updatePromotion = async (id, payload) => {
  const existing = await promotionRepository.getById(id);
  if (!existing) return { ok: false, message: "Акция не найдена", status: 404 };

  if (payload.catalogPageSlug !== undefined) {
    const slugCheck = await validateCatalogPageSlug(payload.catalogPageSlug);
    if (!slugCheck.ok) return { ok: false, message: slugCheck.message };
    payload.catalogPageSlug = slugCheck.slug;
  }

  if (payload.title !== undefined && !String(payload.title || "").trim()) {
    return { ok: false, message: "Укажите заголовок" };
  }
  if (payload.backgroundImageUrl !== undefined && !String(payload.backgroundImageUrl || "").trim()) {
    return { ok: false, message: "Укажите фото для фона" };
  }

  if (payload.filterManufacturer !== undefined) {
    payload.filterManufacturer = normalizeOptionalFilter(payload.filterManufacturer);
  }
  if (payload.filterCollection !== undefined) {
    payload.filterCollection = normalizeOptionalFilter(payload.filterCollection);
  }

  const banner = await promotionRepository.update(id, payload);
  if (!banner) return { ok: false, message: "Не удалось обновить акцию", status: 400 };
  return { ok: true, banner: await attachHref(banner) };
};

const deletePromotion = async (id) => {
  const deleted = await promotionRepository.deleteById(id);
  if (!deleted) return { ok: false, message: "Акция не найдена", status: 404 };
  return { ok: true };
};

const reorderPromotions = async (orderedIds) => {
  const banners = await promotionRepository.reorder(orderedIds);
  return Promise.all(banners.map(attachHref));
};

module.exports = {
  buildCatalogHref,
  resolveCollectionAttrCode,
  listActivePromotions,
  listAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  reorderPromotions,
};
