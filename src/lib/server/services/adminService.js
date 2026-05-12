const categoryRepository = require("../repositories/categoryRepository");
const subcategoryRepository = require("../repositories/subcategoryRepository");
const attributeRepository = require("../repositories/attributeRepository");
const productRepository = require("../repositories/productRepository");
const catalogPageRepository = require("../repositories/catalogPageRepository");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const listBootstrap = async () => {
  const [categories, subcategories, attributes, products, catalogPages] = await Promise.all([
    categoryRepository.listCategories(),
    subcategoryRepository.listSubcategories(),
    attributeRepository.listAttributes(),
    productRepository.listAdminProducts(),
    catalogPageRepository.listCatalogPages()
  ]);

  const attributesWithOptions = await Promise.all(
    attributes.map(async (attribute) => ({
      ...attribute,
      options: await attributeRepository.listAttributeOptions(attribute.id)
    }))
  );

  return { categories, subcategories, attributes: attributesWithOptions, products, catalogPages };
};

const createCatalogPage = async (payload) =>
  catalogPageRepository.createCatalogPage({
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false,
    categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map(Number) : [],
    subcategoryIds: Array.isArray(payload.subcategoryIds) ? payload.subcategoryIds.map(Number) : [],
    filterAttributeIds: Array.isArray(payload.filterAttributeIds) ? payload.filterAttributeIds.map(Number) : []
  });

const updateCatalogPage = async (id, payload) =>
  catalogPageRepository.updateCatalogPage(Number(id), {
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false,
    isDefault: payload.isDefault === true,
    categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map(Number) : [],
    subcategoryIds: Array.isArray(payload.subcategoryIds) ? payload.subcategoryIds.map(Number) : [],
    filterAttributeIds: Array.isArray(payload.filterAttributeIds) ? payload.filterAttributeIds.map(Number) : []
  });

const deleteCatalogPage = async (id) => catalogPageRepository.deleteCatalogPage(Number(id));

const createCategory = async (payload) =>
  categoryRepository.createCategory({
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false
  });

const updateCategory = async (id, payload) =>
  categoryRepository.updateCategory(id, {
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false
  });
/**
 * Возвращает либо { ok: true, deleted: { id } }, либо { ok: false, reason, ...details }.
 * Сервис не делает throw, чтобы HTTP-слой мог отдать 404/409 с понятным текстом.
 */
const deleteCategory = async (id) => {
  const usage = await categoryRepository.countCategoryUsage(id);
  const productsCount = usage.rootProducts + usage.childProducts;
  if (productsCount > 0) {
    return {
      ok: false,
      reason: "category_in_use",
      productsCount,
      childrenCount: usage.children,
    };
  }
  const deleted = await categoryRepository.deleteCategory(id);
  if (!deleted) return { ok: false, reason: "not_found" };
  return { ok: true, deleted, removedChildren: usage.children };
};

const createSubcategory = async (payload) =>
  subcategoryRepository.createSubcategory({
    categoryId: Number(payload.categoryId),
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false
  });

const updateSubcategory = async (id, payload) =>
  subcategoryRepository.updateSubcategory(id, {
    categoryId: Number(payload.categoryId),
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false
  });
const deleteSubcategory = async (id) => {
  const usage = await subcategoryRepository.countSubcategoryUsage(id);
  if (usage.products > 0) {
    return { ok: false, reason: "subcategory_in_use", productsCount: usage.products };
  }
  const deleted = await subcategoryRepository.deleteSubcategory(id);
  if (!deleted) return { ok: false, reason: "not_found" };
  return { ok: true, deleted };
};

const createAttribute = async (payload) =>
  attributeRepository.createAttribute({
    code: payload.code,
    name: payload.name,
    type: payload.type,
    unit: payload.unit || null,
    isFilterable: payload.isFilterable !== false,
    isRequired: payload.isRequired === true,
    isVisibleOnProduct: payload.isVisibleOnProduct !== false,
    isVariantAxis: payload.isVariantAxis === true,
    sortOrder:
      payload.sortOrder !== undefined && payload.sortOrder !== null
        ? Number(payload.sortOrder)
        : undefined
  });

const updateAttribute = async (id, payload) =>
  attributeRepository.updateAttribute(id, {
    code: payload.code,
    name: payload.name,
    type: payload.type,
    unit: payload.unit || null,
    isFilterable: payload.isFilterable !== false,
    isRequired: payload.isRequired === true,
    isVisibleOnProduct: payload.isVisibleOnProduct !== false,
    isVariantAxis: payload.isVariantAxis === true,
    sortOrder:
      payload.sortOrder !== undefined && payload.sortOrder !== null
        ? Number(payload.sortOrder)
        : undefined
  });

const createAttributeOption = async (payload) =>
  attributeRepository.createAttributeOption({
    attributeId: Number(payload.attributeId),
    value: payload.value,
    sortOrder: Number(payload.sortOrder) || 0
  });

const createProduct = async (payload) =>
  productRepository.createProduct({
    sku: payload.sku,
    name: payload.name,
    categoryId: Number(payload.categoryId),
    subcategoryId: payload.subcategoryId ? Number(payload.subcategoryId) : null,
    price: Number(payload.price),
    imageUrl: payload.imageUrl,
    isActive: payload.isActive !== false,
    attributes: Array.isArray(payload.attributes) ? payload.attributes : [],
    variants: Array.isArray(payload.variants) ? payload.variants : undefined
  });

const updateProduct = async (id, payload) =>
  productRepository.updateProduct(Number(id), {
    sku: payload.sku,
    name: payload.name,
    categoryId: Number(payload.categoryId),
    subcategoryId: payload.subcategoryId ? Number(payload.subcategoryId) : null,
    price: Number(payload.price),
    imageUrl: payload.imageUrl,
    isActive: payload.isActive !== false,
    attributes: Array.isArray(payload.attributes) ? payload.attributes : [],
    variants: Array.isArray(payload.variants) ? payload.variants : undefined
  });

const getProductForEdit = async (id) => productRepository.getAdminProductById(Number(id));

const deleteAllProducts = async () => productRepository.deleteAllProducts();

const getProductsTable = async (query) =>
  productRepository.listProductsTable({
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 100,
    search: String(query.search || ""),
    categoryId: query.categoryId ? Number(query.categoryId) : null,
    subcategoryId: query.subcategoryId ? Number(query.subcategoryId) : null,
    attributeFilters: Object.fromEntries(
      Object.entries(query)
        .filter(([key, value]) => key.startsWith("attr_") && String(value || "").trim())
        .map(([key, value]) => [key.replace(/^attr_/, ""), String(value)])
    )
  });

module.exports = {
  listBootstrap,
  createCatalogPage,
  updateCatalogPage,
  deleteCatalogPage,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  createAttribute,
  updateAttribute,
  createAttributeOption,
  createProduct,
  updateProduct,
  getProductForEdit,
  deleteAllProducts,
  getProductsTable
};
