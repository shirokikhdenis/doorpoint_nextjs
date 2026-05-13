const { query } = require("../db/postgres");

const normalizeFilters = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      code: String(entry?.code || "").trim(),
      value: String(entry?.value || "").trim(),
    }))
    .filter((entry) => entry.code && entry.value);
};

const mapRow = (row) => ({
  id: Number(row.id),
  catalogPageId: Number(row.catalogPageId),
  title: row.title,
  imageUrl: row.imageUrl || null,
  sortOrder: Number(row.sortOrder) || 0,
  filters: normalizeFilters(row.filters),
});

const listByCatalogPageId = async (catalogPageId) => {
  const id = Number(catalogPageId);
  if (!Number.isFinite(id) || id <= 0) return [];
  const res = await query(
    `
    SELECT
      id,
      catalog_page_id AS "catalogPageId",
      title,
      image_url AS "imageUrl",
      sort_order AS "sortOrder",
      filters
    FROM catalog_page_labels
    WHERE catalog_page_id = $1
    ORDER BY sort_order ASC, id ASC
    `,
    [id],
  );
  return res.rows.map(mapRow);
};

const getById = async (id) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT
      id,
      catalog_page_id AS "catalogPageId",
      title,
      image_url AS "imageUrl",
      sort_order AS "sortOrder",
      filters
    FROM catalog_page_labels
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const create = async (payload) => {
  const catalogPageId = Number(payload.catalogPageId);
  const filters = normalizeFilters(payload.filters);
  const title = String(payload.title || "").trim();
  const imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() || null : null;
  const sortOrder =
    payload.sortOrder !== undefined && payload.sortOrder !== null ? Number(payload.sortOrder) : 0;

  const res = await query(
    `
    INSERT INTO catalog_page_labels(catalog_page_id, title, image_url, sort_order, filters)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING
      id,
      catalog_page_id AS "catalogPageId",
      title,
      image_url AS "imageUrl",
      sort_order AS "sortOrder",
      filters
    `,
    [catalogPageId, title, imageUrl, sortOrder, JSON.stringify(filters)],
  );
  return mapRow(res.rows[0]);
};

const update = async (id, payload) => {
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
  if (payload.imageUrl !== undefined) {
    params.push(payload.imageUrl ? String(payload.imageUrl).trim() || null : null);
    sets.push(`image_url = $${params.length}`);
  }
  if (payload.sortOrder !== undefined && payload.sortOrder !== null) {
    params.push(Number(payload.sortOrder));
    sets.push(`sort_order = $${params.length}`);
  }
  if (payload.filters !== undefined) {
    const filters = normalizeFilters(payload.filters);
    params.push(JSON.stringify(filters));
    sets.push(`filters = $${params.length}::jsonb`);
  }

  if (sets.length === 0) return getById(numericId);

  params.push(numericId);
  const res = await query(
    `
    UPDATE catalog_page_labels
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING
      id,
      catalog_page_id AS "catalogPageId",
      title,
      image_url AS "imageUrl",
      sort_order AS "sortOrder",
      filters
    `,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteById = async (id) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(`DELETE FROM catalog_page_labels WHERE id = $1 RETURNING id`, [numericId]);
  return res.rows[0] ? { id: Number(res.rows[0].id) } : null;
};

module.exports = {
  listByCatalogPageId,
  getById,
  create,
  update,
  deleteById,
  normalizeFilters,
};
