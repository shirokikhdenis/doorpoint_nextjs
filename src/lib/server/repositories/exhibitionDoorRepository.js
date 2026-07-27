const { query } = require("../db/postgres");
const { ensureExhibitionDoorTables } = require("../db/schemaPatches");

const mapAccessory = (item) => ({
  id: Number(item.id) || 0,
  name: String(item.name || ""),
  sku: String(item.sku || ""),
  price: Number(item.price) || 0,
  category: String(item.category || ""),
});

const mapRow = (row) => ({
  id: Number(row.id),
  categoryType: String(row.categoryType || ""),
  productId: row.productId == null ? null : Number(row.productId),
  productSlug: row.productSlug == null ? null : String(row.productSlug || "").trim() || null,
  productName: String(row.productName || ""),
  productSku: String(row.productSku || ""),
  coatingColor: String(row.coatingColor || ""),
  coatingType: String(row.coatingType || ""),
  manufacturerName: String(row.manufacturerName || ""),
  accessories: Array.isArray(row.accessories)
    ? row.accessories.map(mapAccessory)
    : [],
  price: row.price == null ? null : Number(row.price),
  kitPrice: row.kitPrice == null ? null : Number(row.kitPrice),
  sortOrder: Number(row.sortOrder) || 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const SELECT_FIELDS = `
  ed.id,
  ed.category_type AS "categoryType",
  ed.product_id AS "productId",
  p.slug AS "productSlug",
  ed.product_name AS "productName",
  ed.product_sku AS "productSku",
  ed.coating_color AS "coatingColor",
  ed.coating_type AS "coatingType",
  ed.manufacturer_name AS "manufacturerName",
  ed.accessories,
  ed.price,
  ed.kit_price AS "kitPrice",
  ed.sort_order AS "sortOrder",
  ed.created_at AS "createdAt",
  ed.updated_at AS "updatedAt"
`;

const SELECT_FROM = `
  FROM exhibition_doors ed
  LEFT JOIN products p ON p.id = ed.product_id
`;

const listAll = async () => {
  await ensureExhibitionDoorTables();
  const res = await query(
    `
    SELECT ${SELECT_FIELDS}
    ${SELECT_FROM}
    ORDER BY ed.sort_order ASC, ed.id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const listManufacturers = async () => {
  await ensureExhibitionDoorTables();
  const res = await query(
    `
    SELECT DISTINCT TRIM(manufacturer_name) AS name
    FROM exhibition_doors
    WHERE TRIM(manufacturer_name) <> ''
    ORDER BY name ASC
    `,
  );
  return res.rows.map((row) => String(row.name || "").trim()).filter(Boolean);
};

const getById = async (id) => {
  await ensureExhibitionDoorTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT ${SELECT_FIELDS}
    ${SELECT_FROM}
    WHERE ed.id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const create = async (payload) => {
  await ensureExhibitionDoorTables();
  const res = await query(
    `
    INSERT INTO exhibition_doors (
      category_type,
      product_id,
      product_name,
      product_sku,
      coating_color,
      coating_type,
      manufacturer_name,
      accessories,
      price,
      kit_price,
      sort_order
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
    RETURNING id
    `,
    [
      payload.categoryType,
      payload.productId,
      payload.productName,
      payload.productSku,
      payload.coatingColor,
      payload.coatingType,
      payload.manufacturerName,
      JSON.stringify(payload.accessories || []),
      payload.price,
      payload.kitPrice,
      payload.sortOrder,
    ],
  );
  return getById(res.rows[0].id);
};

const update = async (id, payload) => {
  await ensureExhibitionDoorTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    UPDATE exhibition_doors
    SET
      category_type = $2,
      product_id = $3,
      product_name = $4,
      product_sku = $5,
      coating_color = $6,
      coating_type = $7,
      manufacturer_name = $8,
      accessories = $9::jsonb,
      price = $10,
      kit_price = $11,
      sort_order = $12,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [
      numericId,
      payload.categoryType,
      payload.productId,
      payload.productName,
      payload.productSku,
      payload.coatingColor,
      payload.coatingType,
      payload.manufacturerName,
      JSON.stringify(payload.accessories || []),
      payload.price,
      payload.kitPrice,
      payload.sortOrder,
    ],
  );
  if (!res.rows[0]) return null;
  return getById(numericId);
};

const remove = async (id) => {
  await ensureExhibitionDoorTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM exhibition_doors WHERE id = $1`, [numericId]);
  return res.rowCount > 0;
};

module.exports = {
  listAll,
  listManufacturers,
  getById,
  create,
  update,
  remove,
};
