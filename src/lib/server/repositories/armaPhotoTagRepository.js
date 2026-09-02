const { query, withTransaction } = require("../db/postgres");
const { ensureArmaPhotoTagTables } = require("../db/schemaPatches");

const mapCategory = (row) => ({
  id: Number(row.id),
  name: String(row.name || "").trim(),
  sortOrder: Number(row.sortOrder) || 0,
});

const mapTag = (row) => ({
  id: Number(row.id),
  categoryId: Number(row.categoryId),
  name: String(row.name || "").trim(),
  sortOrder: Number(row.sortOrder) || 0,
});

const listCategories = async () => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `
    SELECT id, name, sort_order AS "sortOrder"
    FROM arma_photo_tag_categories
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapCategory);
};

const listTags = async () => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `
    SELECT id, category_id AS "categoryId", name, sort_order AS "sortOrder"
    FROM arma_photo_tags
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapTag);
};

const listLinks = async () => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `
    SELECT photo_id AS "photoId", tag_id AS "tagId"
    FROM arma_photo_tag_links
    `,
  );
  return res.rows.map((row) => ({
    photoId: String(row.photoId || ""),
    tagId: Number(row.tagId),
  }));
};

const nextCategorySortOrder = async () => {
  const res = await query(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM arma_photo_tag_categories`);
  return Number(res.rows[0]?.max || 0) + 10;
};

const nextTagSortOrder = async (categoryId) => {
  const res = await query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max FROM arma_photo_tags WHERE category_id = $1`,
    [categoryId],
  );
  return Number(res.rows[0]?.max || 0) + 10;
};

const createCategory = async ({ name, sortOrder }) => {
  await ensureArmaPhotoTagTables();
  const order = Number.isInteger(sortOrder) ? sortOrder : await nextCategorySortOrder();
  const res = await query(
    `
    INSERT INTO arma_photo_tag_categories (name, sort_order)
    VALUES ($1, $2)
    RETURNING id, name, sort_order AS "sortOrder"
    `,
    [name, order],
  );
  return mapCategory(res.rows[0]);
};

const updateCategoryName = async (id, name) => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `
    UPDATE arma_photo_tag_categories
    SET name = $2
    WHERE id = $1
    RETURNING id, name, sort_order AS "sortOrder"
    `,
    [id, name],
  );
  return res.rows[0] ? mapCategory(res.rows[0]) : null;
};

const reorderCategories = async (orderedIds) => {
  await ensureArmaPhotoTagTables();
  await withTransaction(async (client) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await client.query(`UPDATE arma_photo_tag_categories SET sort_order = $2 WHERE id = $1`, [
        orderedIds[index],
        (index + 1) * 10,
      ]);
    }
  });
};

const deleteCategory = async (id) => {
  await ensureArmaPhotoTagTables();
  const res = await query(`DELETE FROM arma_photo_tag_categories WHERE id = $1 RETURNING id`, [id]);
  return Boolean(res.rows[0]);
};

const createTag = async ({ categoryId, name, sortOrder }) => {
  await ensureArmaPhotoTagTables();
  const order = Number.isInteger(sortOrder) ? sortOrder : await nextTagSortOrder(categoryId);
  const res = await query(
    `
    INSERT INTO arma_photo_tags (category_id, name, sort_order)
    VALUES ($1, $2, $3)
    RETURNING id, category_id AS "categoryId", name, sort_order AS "sortOrder"
    `,
    [categoryId, name, order],
  );
  return mapTag(res.rows[0]);
};

const updateTagName = async (id, name) => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `
    UPDATE arma_photo_tags
    SET name = $2
    WHERE id = $1
    RETURNING id, category_id AS "categoryId", name, sort_order AS "sortOrder"
    `,
    [id, name],
  );
  return res.rows[0] ? mapTag(res.rows[0]) : null;
};

const reorderTags = async (orderedIds) => {
  await ensureArmaPhotoTagTables();
  await withTransaction(async (client) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await client.query(`UPDATE arma_photo_tags SET sort_order = $2 WHERE id = $1`, [
        orderedIds[index],
        (index + 1) * 10,
      ]);
    }
  });
};

const deleteTag = async (id) => {
  await ensureArmaPhotoTagTables();
  const res = await query(`DELETE FROM arma_photo_tags WHERE id = $1 RETURNING id`, [id]);
  return Boolean(res.rows[0]);
};

const setPhotoTag = async ({ photoId, tagId, assigned }) => {
  await ensureArmaPhotoTagTables();
  if (assigned) {
    await query(
      `
      INSERT INTO arma_photo_tag_links (photo_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (photo_id, tag_id) DO NOTHING
      `,
      [photoId, tagId],
    );
  } else {
    await query(
      `DELETE FROM arma_photo_tag_links WHERE photo_id = $1 AND tag_id = $2`,
      [photoId, tagId],
    );
  }
};

const listTagIdsForPhoto = async (photoId) => {
  await ensureArmaPhotoTagTables();
  const res = await query(
    `SELECT tag_id AS "tagId" FROM arma_photo_tag_links WHERE photo_id = $1`,
    [photoId],
  );
  return res.rows.map((row) => Number(row.tagId));
};

const deleteLinksForPhoto = async (photoId) => {
  await ensureArmaPhotoTagTables();
  await query(`DELETE FROM arma_photo_tag_links WHERE photo_id = $1`, [photoId]);
};

module.exports = {
  listCategories,
  listTags,
  listLinks,
  createCategory,
  updateCategoryName,
  reorderCategories,
  deleteCategory,
  createTag,
  updateTagName,
  reorderTags,
  deleteTag,
  setPhotoTag,
  listTagIdsForPhoto,
  deleteLinksForPhoto,
};
