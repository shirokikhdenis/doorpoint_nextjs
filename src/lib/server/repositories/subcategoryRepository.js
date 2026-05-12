const { query } = require("../db/postgres");

/**
 * «Подкатегории» — это дочерние строки в той же таблице categories (parent_id IS NOT NULL).
 * Здесь сохраняем старый API, чтобы не трогать админку и CSV-импорт.
 */

const mapRow = (row) => ({
  id: Number(row.id),
  categoryId: Number(row.categoryId),
  categoryName: row.categoryName,
  name: row.name,
  slug: row.slug,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: true,
});

const listSubcategories = async () => {
  const res = await query(
    `
    SELECT
      s.id,
      s.parent_id AS "categoryId",
      c.name AS "categoryName",
      s.name,
      s.slug,
      s.sort_order AS "sortOrder"
    FROM categories s
    JOIN categories c ON c.id = s.parent_id
    WHERE s.parent_id IS NOT NULL
    ORDER BY c.sort_order, s.sort_order, s.name
    `,
  );
  return res.rows.map(mapRow);
};

const createSubcategory = async (payload) => {
  const res = await query(
    `
    INSERT INTO categories(parent_id, name, slug, sort_order)
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      parent_id AS "categoryId",
      name,
      slug,
      sort_order AS "sortOrder"
    `,
    [payload.categoryId, payload.name, payload.slug, Number(payload.sortOrder) || 0],
  );
  const row = res.rows[0];
  return {
    ...mapRow({ ...row, categoryName: null }),
    categoryName: null,
  };
};

const updateSubcategory = async (id, payload) => {
  const res = await query(
    `
    UPDATE categories
    SET parent_id = $2, name = $3, slug = $4, sort_order = $5
    WHERE id = $1 AND parent_id IS NOT NULL
    RETURNING id, parent_id AS "categoryId", name, slug, sort_order AS "sortOrder"
    `,
    [id, payload.categoryId, payload.name, payload.slug, Number(payload.sortOrder) || 0],
  );
  if (!res.rows[0]) return null;
  return mapRow({ ...res.rows[0], categoryName: null });
};

const countSubcategoryUsage = async (id) => {
  const res = await query(
    `SELECT COUNT(*)::int AS n FROM products WHERE category_id = $1`,
    [id],
  );
  return { products: Number(res.rows[0]?.n || 0) };
};

const deleteSubcategory = async (id) => {
  const res = await query(
    `DELETE FROM categories WHERE id = $1 AND parent_id IS NOT NULL RETURNING id`,
    [id],
  );
  return res.rows[0] || null;
};

const listSubcategorySlugsUnderCategorySlugs = async (categorySlugs) => {
  const slugs = Array.isArray(categorySlugs) ? categorySlugs.filter(Boolean) : [];
  if (slugs.length === 0) return [];
  const res = await query(
    `
    SELECT child.slug
    FROM categories child
    JOIN categories parent ON parent.id = child.parent_id
    WHERE child.parent_id IS NOT NULL
      AND parent.slug = ANY($1::text[])
    `,
    [slugs],
  );
  return res.rows.map((row) => row.slug);
};

module.exports = {
  listSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  countSubcategoryUsage,
  listSubcategorySlugsUnderCategorySlugs,
};
