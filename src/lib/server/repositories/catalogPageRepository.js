const { query, withTransaction } = require("../db/postgres");
const {
  CATALOG_PAGE_SLUG_RENAMES,
  ensureCatalogPageSlugRenames,
  ensureCatalogPageFilterDefaultsColumn,
  ensureSeoColumns,
} = require("../db/schemaPatches");

const resolveCatalogPageSlug = (slug) => {
  const trimmed = String(slug || "").trim() || "all";
  const match = CATALOG_PAGE_SLUG_RENAMES.find(([oldSlug]) => oldSlug === trimmed);
  return match ? match[1] : trimmed;
};

/**
 * catalog_pages — единственная таблица витрин. Три бывших M2M-таблицы свернуты в массивы:
 *   - category_slugs TEXT[] (содержит и корневые, и дочерние slug — старая семантика)
 *   - filter_codes   TEXT[] (subset из attribute_definitions.code)
 *
 * Для совместимости API page-объект всё ещё имеет .categories[] (корни), .subcategories[]
 * (дочерние), .filterAttributes[] (с id/code/name/type).
 */

const DEFAULT_SLUG = "all";

const mapBaseRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  slug: row.slug,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: true,
  isDefault: row.slug === DEFAULT_SLUG,
  seoTitle: row.seoTitle || null,
  seoDescription: row.seoDescription || null,
  collapsedFilterSections: Array.isArray(row.collapsedFilterSections)
    ? row.collapsedFilterSections.filter(Boolean)
    : null,
});

const expandPages = async (rows) => {
  if (rows.length === 0) return [];

  const allCategorySlugs = new Set();
  const allFilterCodes = new Set();
  rows.forEach((row) => {
    (row.categorySlugs || []).forEach((slug) => allCategorySlugs.add(slug));
    (row.filterCodes || []).forEach((code) => allFilterCodes.add(code));
  });

  const categoriesById = new Map();
  if (allCategorySlugs.size > 0) {
    const catsRes = await query(
      `
      SELECT id, parent_id, name, slug, sort_order
      FROM categories
      WHERE slug = ANY($1::text[])
      ORDER BY sort_order, name
      `,
      [Array.from(allCategorySlugs)],
    );
    catsRes.rows.forEach((row) => {
      categoriesById.set(row.slug, {
        id: Number(row.id),
        parentId: row.parent_id === null ? null : Number(row.parent_id),
        name: row.name,
        slug: row.slug,
        sortOrder: Number(row.sort_order) || 0,
      });
    });
  }

  const parentSlugById = new Map();
  const parentSlugIds = new Set();
  for (const cat of categoriesById.values()) {
    if (cat.parentId !== null) parentSlugIds.add(cat.parentId);
  }
  if (parentSlugIds.size > 0) {
    const parRes = await query(
      `SELECT id, slug FROM categories WHERE id = ANY($1::bigint[])`,
      [Array.from(parentSlugIds)],
    );
    parRes.rows.forEach((row) => {
      parentSlugById.set(Number(row.id), row.slug);
    });
  }

  const attrsByCode = new Map();
  if (allFilterCodes.size > 0) {
    const attrRes = await query(
      `
      SELECT id, code, name, type
      FROM attribute_definitions
      WHERE code = ANY($1::text[])
      ORDER BY sort_order ASC, id ASC
      `,
      [Array.from(allFilterCodes)],
    );
    attrRes.rows.forEach((row) => {
      attrsByCode.set(row.code, {
        id: Number(row.id),
        code: row.code,
        name: row.name,
        type: row.type,
      });
    });
  }

  return rows.map((row) => {
    const slugs = row.categorySlugs || [];
    const categories = [];
    const subcategories = [];
    for (const slug of slugs) {
      const cat = categoriesById.get(slug);
      if (!cat) continue;
      if (cat.parentId === null) {
        categories.push({ id: cat.id, name: cat.name, slug: cat.slug });
      } else {
        subcategories.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          categorySlug: parentSlugById.get(cat.parentId) || null,
        });
      }
    }
    const filterAttributes = (row.filterCodes || [])
      .map((code) => attrsByCode.get(code))
      .filter(Boolean);
    return {
      ...mapBaseRow(row),
      categories,
      subcategories,
      filterAttributes,
    };
  });
};

const listCatalogPages = async () => {
  await ensureCatalogPageFilterDefaultsColumn();
  await ensureCatalogPageSlugRenames();
  const res = await query(
    `
    SELECT
      id,
      name,
      slug,
      sort_order AS "sortOrder",
      category_slugs AS "categorySlugs",
      filter_codes AS "filterCodes",
      seo_title AS "seoTitle",
      seo_description AS "seoDescription",
      collapsed_filter_sections AS "collapsedFilterSections"
    FROM catalog_pages
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return expandPages(res.rows);
};

const findCatalogPageBySlug = async (slug) => {
  await ensureCatalogPageFilterDefaultsColumn();
  await ensureCatalogPageSlugRenames();
  const normalized = resolveCatalogPageSlug(slug).toLowerCase();
  if (!normalized) return null;
  const res = await query(
    `
    SELECT
      id,
      name,
      slug,
      sort_order AS "sortOrder",
      category_slugs AS "categorySlugs",
      filter_codes AS "filterCodes",
      seo_title AS "seoTitle",
      seo_description AS "seoDescription",
      collapsed_filter_sections AS "collapsedFilterSections"
    FROM catalog_pages
    WHERE slug = $1
    LIMIT 1
    `,
    [normalized],
  );
  if (!res.rows[0]) return null;
  const expanded = await expandPages([res.rows[0]]);
  return expanded[0] || null;
};

const findCatalogPageById = async (id) => {
  await ensureCatalogPageFilterDefaultsColumn();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT
      id,
      name,
      slug,
      sort_order AS "sortOrder",
      category_slugs AS "categorySlugs",
      filter_codes AS "filterCodes",
      seo_title AS "seoTitle",
      seo_description AS "seoDescription",
      collapsed_filter_sections AS "collapsedFilterSections"
    FROM catalog_pages
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  if (!res.rows[0]) return null;
  const expanded = await expandPages([res.rows[0]]);
  return expanded[0] || null;
};

const findDefaultCatalogPage = async () => {
  const res = await query(
    `
    SELECT
      id,
      name,
      slug,
      sort_order AS "sortOrder",
      category_slugs AS "categorySlugs",
      filter_codes AS "filterCodes"
    FROM catalog_pages
    WHERE slug = $1
    LIMIT 1
    `,
    [DEFAULT_SLUG],
  );
  if (!res.rows[0]) return null;
  const expanded = await expandPages([res.rows[0]]);
  return expanded[0] || null;
};

const slugsForCategoryIds = async (client, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const res = await client.query(
    `SELECT slug FROM categories WHERE id = ANY($1::bigint[])`,
    [ids.map(Number).filter((n) => Number.isFinite(n) && n > 0)],
  );
  return res.rows.map((row) => row.slug).filter(Boolean);
};

const uniqueOrdered = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
};

const codesForAttributeIds = async (client, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const numericIds = ids.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (numericIds.length === 0) return [];
  const res = await client.query(
    `SELECT id, code FROM attribute_definitions WHERE id = ANY($1::bigint[])`,
    [numericIds],
  );
  const codeById = new Map(res.rows.map((row) => [Number(row.id), row.code]));
  return numericIds.map((id) => codeById.get(id)).filter(Boolean);
};

const createCatalogPage = async (payload) =>
  withTransaction(async (client) => {
    const maxOrderRes = await client.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM catalog_pages`,
    );
    const sortOrder =
      payload.sortOrder !== undefined && payload.sortOrder !== null
        ? Number(payload.sortOrder)
        : Number(maxOrderRes.rows[0].next);

    const categorySlugs = [
      ...(await slugsForCategoryIds(client, payload.categoryIds || [])),
      ...(await slugsForCategoryIds(client, payload.subcategoryIds || [])),
    ];
    const filterCodes = await codesForAttributeIds(client, payload.filterAttributeIds || []);

    const res = await client.query(
      `
      INSERT INTO catalog_pages(slug, name, category_slugs, filter_codes, sort_order)
      VALUES ($1, $2, $3::text[], $4::text[], $5)
      RETURNING id
      `,
      [payload.slug, payload.name, [...new Set(categorySlugs)], uniqueOrdered(filterCodes), sortOrder],
    );
    return Number(res.rows[0].id);
  });

const updateCatalogPage = async (id, payload) =>
  withTransaction(async (client) => {
    const categorySlugs = [
      ...(await slugsForCategoryIds(client, payload.categoryIds || [])),
      ...(await slugsForCategoryIds(client, payload.subcategoryIds || [])),
    ];
    const filterCodes = await codesForAttributeIds(client, payload.filterAttributeIds || []);

    const res = await client.query(
      `
      UPDATE catalog_pages
      SET
        name = $2,
        slug = $3,
        sort_order = $4,
        category_slugs = $5::text[],
        filter_codes = $6::text[],
        seo_title = $7,
        seo_description = $8,
        collapsed_filter_sections = $9::text[]
      WHERE id = $1
      RETURNING id
      `,
      [
        Number(id),
        payload.name,
        payload.slug,
        Number(payload.sortOrder) || 0,
        [...new Set(categorySlugs)],
        uniqueOrdered(filterCodes),
        payload.seoTitle ?? null,
        payload.seoDescription ?? null,
        Array.isArray(payload.collapsedFilterSections) ? payload.collapsedFilterSections : null,
      ],
    );
    return res.rows[0] ? Number(res.rows[0].id) : null;
  });

const deleteCatalogPage = async (id) => {
  const res = await query(
    `DELETE FROM catalog_pages WHERE id = $1 AND slug <> $2 RETURNING id`,
    [Number(id), DEFAULT_SLUG],
  );
  return res.rows[0] || null;
};

module.exports = {
  listCatalogPages,
  findCatalogPageBySlug,
  findCatalogPageById,
  findDefaultCatalogPage,
  createCatalogPage,
  updateCatalogPage,
  deleteCatalogPage,
};
