const { query } = require("../db/postgres");
const { ensureTestimonialTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  authorName: String(row.authorName || ""),
  body: String(row.body || ""),
  rating: row.rating == null ? null : Number(row.rating),
  sortOrder: Number(row.sortOrder) || 0,
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const listAll = async () => {
  await ensureTestimonialTables();
  const res = await query(
    `
    SELECT
      id,
      author_name AS "authorName",
      body,
      rating,
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM testimonials
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const listActive = async (limit = 6) => {
  await ensureTestimonialTables();
  const numericLimit = Number.isInteger(limit) && limit > 0 ? limit : 6;
  const res = await query(
    `
    SELECT
      id,
      author_name AS "authorName",
      body,
      rating,
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM testimonials
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, id ASC
    LIMIT $1
    `,
    [numericLimit],
  );
  return res.rows.map(mapRow);
};

const getById = async (id) => {
  await ensureTestimonialTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT
      id,
      author_name AS "authorName",
      body,
      rating,
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM testimonials
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const create = async (payload) => {
  await ensureTestimonialTables();
  const res = await query(
    `
    INSERT INTO testimonials (author_name, body, rating, sort_order, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      author_name AS "authorName",
      body,
      rating,
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      payload.authorName,
      payload.body,
      payload.rating,
      payload.sortOrder,
      payload.isActive,
    ],
  );
  return mapRow(res.rows[0]);
};

const update = async (id, payload) => {
  await ensureTestimonialTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    UPDATE testimonials
    SET
      author_name = $2,
      body = $3,
      rating = $4,
      sort_order = $5,
      is_active = $6,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      author_name AS "authorName",
      body,
      rating,
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      numericId,
      payload.authorName,
      payload.body,
      payload.rating,
      payload.sortOrder,
      payload.isActive,
    ],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const remove = async (id) => {
  await ensureTestimonialTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM testimonials WHERE id = $1`, [numericId]);
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
