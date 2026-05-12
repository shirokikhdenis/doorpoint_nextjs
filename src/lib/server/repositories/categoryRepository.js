const { query } = require("../db/postgres");

/**
 * В новой схеме нет отдельной таблицы subcategories — это дерево внутри categories
 * (parent_id IS NULL → корневая категория). Этот репозиторий работает только с корнями
 * для совместимости со старым API; дочерние читает subcategoryRepository.
 */

const mapRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  slug: row.slug,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: true,
});

const listCategories = async () => {
  const res = await query(
    `
    SELECT id, name, slug, sort_order AS "sortOrder"
    FROM categories
    WHERE parent_id IS NULL
    ORDER BY sort_order, name
    `,
  );
  return res.rows.map(mapRow);
};

const createCategory = async ({ name, slug, sortOrder = 0 }) => {
  const res = await query(
    `
    INSERT INTO categories(parent_id, name, slug, sort_order)
    VALUES (NULL, $1, $2, $3)
    RETURNING id, name, slug, sort_order AS "sortOrder"
    `,
    [name, slug, sortOrder],
  );
  return mapRow(res.rows[0]);
};

const updateCategory = async (id, payload) => {
  const res = await query(
    `
    UPDATE categories
    SET name = $2, slug = $3, sort_order = $4
    WHERE id = $1 AND parent_id IS NULL
    RETURNING id, name, slug, sort_order AS "sortOrder"
    `,
    [id, payload.name, payload.slug, Number(payload.sortOrder) || 0],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

/**
 * Сколько товаров привязано к корневой категории напрямую и сколько суммарно
 * в её подкатегориях. Используется перед удалением, чтобы не наткнуться на
 * нарушение FK products.category_id.
 */
const countCategoryUsage = async (id) => {
  const res = await query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM products WHERE category_id = $1) AS "rootProducts",
      (SELECT COUNT(*)::int FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE c.parent_id = $1) AS "childProducts",
      (SELECT COUNT(*)::int FROM categories WHERE parent_id = $1) AS "children"
    `,
    [id],
  );
  const row = res.rows[0] || {};
  return {
    rootProducts: Number(row.rootProducts || 0),
    childProducts: Number(row.childProducts || 0),
    children: Number(row.children || 0),
  };
};

const deleteCategory = async (id) => {
  const res = await query(
    `DELETE FROM categories WHERE id = $1 AND parent_id IS NULL RETURNING id`,
    [id],
  );
  return res.rows[0] || null;
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  countCategoryUsage,
};
