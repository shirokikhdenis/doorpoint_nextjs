const { query } = require("../db/postgres");
const { ensureHomeProductSectionTables } = require("../db/schemaPatches");
const { normalizeHomeSectionFilters } = require("../domain/homeSectionFilters");

const mapRow = (row) => ({
  id: Number(row.id),
  title: String(row.title || ""),
  catalogPageSlug: String(row.catalogPageSlug || ""),
  sortOrder: Number(row.sortOrder) || 0,
  isActive: row.isActive !== false,
  productLimit: Math.min(24, Math.max(1, Number(row.productLimit) || 8)),
  filters: normalizeHomeSectionFilters(row.filters),
});

const sectionSelect = `
  id,
  title,
  catalog_page_slug AS "catalogPageSlug",
  sort_order AS "sortOrder",
  is_active AS "isActive",
  product_limit AS "productLimit",
  filters
`;

const listAll = async () => {
  await ensureHomeProductSectionTables();
  const res = await query(
    `
    SELECT ${sectionSelect}
    FROM home_product_sections
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const listActive = async () => {
  await ensureHomeProductSectionTables();
  const res = await query(
    `
    SELECT ${sectionSelect}
    FROM home_product_sections
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const getById = async (id) => {
  await ensureHomeProductSectionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT ${sectionSelect}
    FROM home_product_sections
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const create = async (payload) => {
  await ensureHomeProductSectionTables();
  const title = String(payload.title || "").trim();
  const catalogPageSlug = String(payload.catalogPageSlug || "").trim();
  const sortOrder =
    payload.sortOrder !== undefined && payload.sortOrder !== null ? Number(payload.sortOrder) : 0;
  const isActive = payload.isActive !== false;
  const productLimit = Math.min(24, Math.max(1, Number(payload.productLimit) || 8));
  const filters = normalizeHomeSectionFilters(payload.filters);

  const res = await query(
    `
    INSERT INTO home_product_sections(
      title, catalog_page_slug, sort_order, is_active, product_limit, filters
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING ${sectionSelect}
    `,
    [title, catalogPageSlug, sortOrder, isActive, productLimit, JSON.stringify(filters)],
  );
  return mapRow(res.rows[0]);
};

const update = async (id, payload) => {
  await ensureHomeProductSectionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const params = [];
  const sets = [];

  if (payload.title !== undefined) {
    const title = String(payload.title || "").trim();
    if (!title) return null;
    params.push(title);
    sets.push(`title = $${params.length}`);
  }
  if (payload.catalogPageSlug !== undefined) {
    const catalogPageSlug = String(payload.catalogPageSlug || "").trim();
    if (!catalogPageSlug) return null;
    params.push(catalogPageSlug);
    sets.push(`catalog_page_slug = $${params.length}`);
  }
  if (payload.sortOrder !== undefined) {
    params.push(Number(payload.sortOrder) || 0);
    sets.push(`sort_order = $${params.length}`);
  }
  if (payload.isActive !== undefined) {
    params.push(payload.isActive !== false);
    sets.push(`is_active = $${params.length}`);
  }
  if (payload.productLimit !== undefined) {
    params.push(Math.min(24, Math.max(1, Number(payload.productLimit) || 8)));
    sets.push(`product_limit = $${params.length}`);
  }
  if (payload.filters !== undefined) {
    params.push(JSON.stringify(normalizeHomeSectionFilters(payload.filters)));
    sets.push(`filters = $${params.length}::jsonb`);
  }

  if (sets.length === 0) return getById(numericId);

  params.push(numericId);
  const res = await query(
    `
    UPDATE home_product_sections
    SET ${sets.join(", ")}, updated_at = NOW()
    WHERE id = $${params.length}
    RETURNING ${sectionSelect}
    `,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const remove = async (id) => {
  await ensureHomeProductSectionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM home_product_sections WHERE id = $1`, [numericId]);
  return res.rowCount > 0;
};

module.exports = {
  listAll,
  listActive,
  getById,
  create,
  update,
  remove,
};
