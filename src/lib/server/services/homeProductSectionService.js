const catalogPageRepository = require("../repositories/catalogPageRepository");
const homeProductSectionRepository = require("../repositories/homeProductSectionRepository");
const catalogService = require("./catalogService");
const {
  buildSectionCatalogHref,
  normalizeHomeSectionFilters,
  toCatalogProductsQuery,
} = require("../domain/homeSectionFilters");

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const validateCatalogPageSlug = async (slug) => {
  const raw = String(slug || "").trim();
  if (!raw) return { ok: false, message: "Укажите витрину" };
  const page = await catalogPageRepository.findCatalogPageBySlug(raw);
  if (!page) return { ok: false, message: "Витрина не найдена" };
  return { ok: true, slug: raw };
};

const attachCatalogHref = (section) => ({
  ...section,
  catalogHref: buildSectionCatalogHref(section.catalogPageSlug, section.filters),
});

const listAllSections = async () => {
  const items = await homeProductSectionRepository.listAll();
  return items.map(attachCatalogHref);
};

const listActiveSections = async () => {
  const items = await homeProductSectionRepository.listActive();
  return items.map(attachCatalogHref);
};

const getSectionProducts = async (section, { limit, page = 1 } = {}) => {
  const query = toCatalogProductsQuery(section.catalogPageSlug, section.filters, {
    limit: limit ?? section.productLimit,
    page,
    sort: "popularity",
  });
  const result = await catalogService.getProducts(query);
  return result.items;
};

const listActiveSectionsWithProducts = async () => {
  const sections = await listActiveSections();
  const withProducts = await Promise.all(
    sections.map(async (section) => {
      const products = await getSectionProducts(section);
      return {
        id: section.id,
        title: section.title,
        catalogPageSlug: section.catalogPageSlug,
        catalogHref: section.catalogHref,
        productLimit: section.productLimit,
        products,
      };
    }),
  );
  return withProducts;
};

const pickSectionProducts = async (sectionId, { excludeIds = [], count = 8 } = {}) => {
  const section = await homeProductSectionRepository.getById(sectionId);
  if (!section || !section.isActive) return [];

  const exclude = new Set(excludeIds.map((id) => Number(id)).filter((id) => id > 0));
  const poolLimit = Math.max(64, count * 4);
  const products = await getSectionProducts(section, { limit: poolLimit, page: 1 });
  const pool = products.filter((item) => !exclude.has(Number(item.id)));
  return shuffle(pool).slice(0, count);
};

const createSection = async (payload) => {
  const title = String(payload.title || "").trim();
  if (!title) return { ok: false, message: "Укажите заголовок" };

  const slugCheck = await validateCatalogPageSlug(payload.catalogPageSlug);
  if (!slugCheck.ok) return { ok: false, message: slugCheck.message };

  const section = await homeProductSectionRepository.create({
    title,
    catalogPageSlug: slugCheck.slug,
    sortOrder: payload.sortOrder,
    isActive: payload.isActive,
    productLimit: payload.productLimit,
    filters: normalizeHomeSectionFilters(payload.filters),
  });
  return { ok: true, section: attachCatalogHref(section) };
};

const updateSection = async (id, payload) => {
  const existing = await homeProductSectionRepository.getById(id);
  if (!existing) return { ok: false, message: "Секция не найдена", status: 404 };

  if (payload.catalogPageSlug !== undefined) {
    const slugCheck = await validateCatalogPageSlug(payload.catalogPageSlug);
    if (!slugCheck.ok) return { ok: false, message: slugCheck.message };
    payload = { ...payload, catalogPageSlug: slugCheck.slug };
  }

  if (payload.title !== undefined && !String(payload.title || "").trim()) {
    return { ok: false, message: "Укажите заголовок" };
  }

  if (payload.filters !== undefined) {
    payload = { ...payload, filters: normalizeHomeSectionFilters(payload.filters) };
  }

  const section = await homeProductSectionRepository.update(id, payload);
  if (!section) return { ok: false, message: "Секция не найдена", status: 404 };
  return { ok: true, section: attachCatalogHref(section) };
};

const deleteSection = async (id) => {
  const existing = await homeProductSectionRepository.getById(id);
  if (!existing) return { ok: false, message: "Секция не найдена", status: 404 };
  await homeProductSectionRepository.remove(id);
  return { ok: true };
};

module.exports = {
  listAllSections,
  listActiveSections,
  listActiveSectionsWithProducts,
  pickSectionProducts,
  createSection,
  updateSection,
  deleteSection,
};
