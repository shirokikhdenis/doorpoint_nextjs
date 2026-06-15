const productRepository = require("../repositories/productRepository");
const catalogPageRepository = require("../repositories/catalogPageRepository");
const catalogPageLabelRepository = require("../repositories/catalogPageLabelRepository");
const subcategoryRepository = require("../repositories/subcategoryRepository");

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Express может отдать catalogPage массивом при дублях в query string */
const normalizeCatalogPageFromQuery = (query = {}) => {
  const raw = query.catalogPage;
  if (raw === undefined || raw === null) return "";
  const first = Array.isArray(raw) ? raw[0] : raw;
  return String(first || "").trim();
};

const buildCatalogFilters = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const attributeFilters = {};
  Object.entries(query).forEach(([key, rawValue]) => {
    if (!key.startsWith("attr_")) return;
    const attrCode = key.replace(/^attr_/, "");
    if (Array.isArray(rawValue)) {
      const values = rawValue.map((item) => String(item || "").trim()).filter(Boolean);
      if (values.length > 0) {
        attributeFilters[attrCode] = values;
      }
      return;
    }
    const value = String(rawValue || "").trim();
    if (!value) return;
    attributeFilters[attrCode] = value;
  });

  let minPrice = Number.isFinite(Number(query.minPrice)) ? Number(query.minPrice) : null;
  let maxPrice = Number.isFinite(Number(query.maxPrice)) ? Number(query.maxPrice) : null;
  if (minPrice === 0 && maxPrice === 0) {
    minPrice = null;
    maxPrice = null;
  }

  return {
    search: String(query.search || "").trim(),
    sort: String(query.sort || "popularity"),
    categories: parseCsv(query.categories),
    subcategories: parseCsv(query.subcategories),
    attributeFilters,
    minPrice,
    maxPrice,
    limit,
    offset: (page - 1) * limit,
    page,
    catalogPage: normalizeCatalogPageFromQuery(query),
    scopeCategories: [],
    scopeSubcategories: [],
    scopeOr: false
  };
};

const getProducts = async (query) => {
  const filters = buildCatalogFilters(query);
  if (filters.catalogPage) {
    const page = await catalogPageRepository.findCatalogPageBySlug(filters.catalogPage);
    if (page) {
      const filterAttrs = page.filterAttributes || [];
      if (filterAttrs.length > 0) {
        const allowedCodes = new Set(filterAttrs.map((a) => a.code));
        // Числовые диапазоны приходят как `thickness_min` / `thickness_max` — нужно
        // нормализовать ключ перед проверкой, иначе фильтр тихо выкидывается.
        Object.keys(filters.attributeFilters).forEach((rawCode) => {
          const baseCode = rawCode.replace(/_(min|max)$/, "");
          if (!allowedCodes.has(baseCode)) delete filters.attributeFilters[rawCode];
        });
      }

      const pageCats = (page.categories || []).map((c) => c.slug);
      const pageSubs = (page.subcategories || []).map((s) => s.slug);
      const pageSubRows = page.subcategories || [];
      const hasCats = pageCats.length > 0;
      const hasSubs = pageSubs.length > 0;

      if (hasCats && hasSubs) {
        filters.scopeCategories = pageCats;
        filters.scopeSubcategories = pageSubs;
        filters.scopeOr = true;
      } else if (hasCats) {
        filters.scopeCategories = pageCats;
      } else if (hasSubs) {
        filters.scopeSubcategories = pageSubs;
      }

      if (hasCats || hasSubs) {
        const userCats = filters.categories;
        const userSubs = filters.subcategories;

        if (userCats.length > 0) {
          if (hasCats) {
            filters.categories = userCats.filter((slug) => pageCats.includes(slug));
          } else {
            const parents = new Set(pageSubRows.map((s) => s.categorySlug).filter(Boolean));
            filters.categories = userCats.filter((slug) => parents.has(slug));
          }
        } else {
          filters.categories = [];
        }

        if (userSubs.length > 0) {
          if (hasSubs) {
            filters.subcategories = userSubs.filter((slug) => pageSubs.includes(slug));
          } else {
            const allowed = await subcategoryRepository.listSubcategorySlugsUnderCategorySlugs(pageCats);
            const allowedSet = new Set(allowed);
            filters.subcategories = userSubs.filter((slug) => allowedSet.has(slug));
          }
        } else {
          filters.subcategories = [];
        }
      }
    }
  }
  const { total, items } = await productRepository.listProducts(filters);
  return {
    items,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.max(1, Math.ceil(total / filters.limit))
  };
};

const getFilterMeta = async (query = {}) => {
  const pageSlug = normalizeCatalogPageFromQuery(query);
  const filters = {};
  let labels = [];
  if (pageSlug) {
    const page = await catalogPageRepository.findCatalogPageBySlug(pageSlug);
    if (page) {
      const labelRows = await catalogPageLabelRepository.listByCatalogPageId(page.id);
      labels = labelRows.map((label) => ({
        id: label.id,
        title: label.title,
        imageUrl: label.imageUrl,
        sortOrder: label.sortOrder,
        filters: label.filters,
      }));

      const filterAttrs = page.filterAttributes || [];
      if (filterAttrs.length > 0) {
        filters.allowedAttributeIds = filterAttrs.map((a) => a.id);
      }

      const pageCats = (page.categories || []).map((c) => c.slug);
      const pageSubs = (page.subcategories || []).map((s) => s.slug);
      if (pageCats.length > 0 && pageSubs.length > 0) {
        filters.scopeCategories = pageCats;
        filters.scopeSubcategories = pageSubs;
        filters.scopeOr = true;
      } else if (pageCats.length > 0) {
        filters.categories = pageCats;
      } else if (pageSubs.length > 0) {
        filters.subcategorySlugs = pageSubs;
      }
    }
  }
  const meta = await productRepository.listFilterMeta(filters);
  return { ...meta, labels };
};

const listCatalogPages = async () => catalogPageRepository.listCatalogPages();
const getProductById = async (id) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }
  return productRepository.getProductById(numericId);
};

const getProductByRef = async (ref) => {
  const raw = String(ref || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    return getProductById(raw);
  }
  return productRepository.getProductBySlug(raw);
};

module.exports = {
  getProducts,
  getFilterMeta,
  listCatalogPages,
  getProductById,
  getProductByRef,
  buildCatalogFilters
};
