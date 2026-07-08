const { query } = require("../db/postgres");
const { ensureDoorOptionModuleTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  manufacturerName: String(row.manufacturerName || ""),
  parentSku: String(row.parentSku || ""),
  glassName: String(row.glassName || ""),
  priceDelta: Number(row.priceDelta) || 0,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: row.isActive !== false,
});

const listOptions = async ({
  manufacturerName = "",
  parentSku = "",
  activeOnly = false,
} = {}) => {
  await ensureDoorOptionModuleTables();
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const where = [];
  const manufacturer = String(manufacturerName || "").trim();
  if (manufacturer) {
    where.push(`LOWER(TRIM(manufacturer_name)) = LOWER(TRIM(${addParam(manufacturer)}))`);
  }
  const sku = String(parentSku || "").trim();
  if (sku) {
    where.push(`TRIM(parent_sku) = TRIM(${addParam(sku)})`);
  }
  if (activeOnly) {
    where.push("is_active = TRUE");
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      parent_sku AS "parentSku",
      glass_name AS "glassName",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_glass_options
    ${whereSql}
    ORDER BY manufacturer_name ASC, parent_sku ASC, sort_order ASC, glass_name ASC, id ASC
    `,
    params,
  );

  return res.rows.map(mapRow);
};

const listActiveByParentSku = async (manufacturerName, parentSku) =>
  listOptions({ manufacturerName, parentSku, activeOnly: true });

const listManufacturers = async () => {
  await ensureDoorOptionModuleTables();
  const res = await query(
    `
    SELECT DISTINCT TRIM(manufacturer_name) AS name
    FROM door_glass_options
    WHERE TRIM(manufacturer_name) <> ''
    ORDER BY name ASC
    `,
  );
  return res.rows.map((row) => String(row.name || "").trim()).filter(Boolean);
};

const getById = async (id) => {
  await ensureDoorOptionModuleTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      parent_sku AS "parentSku",
      glass_name AS "glassName",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_glass_options
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const updateById = async (id, payload) => {
  await ensureDoorOptionModuleTables();
  const existing = await getById(id);
  if (!existing) return null;

  const manufacturerName = String(payload.manufacturerName ?? existing.manufacturerName).trim();
  const parentSku = String(payload.parentSku ?? existing.parentSku).trim();
  const glassName = String(payload.glassName ?? existing.glassName).trim();
  const priceDelta = Math.round(Number(payload.priceDelta ?? existing.priceDelta) || 0);
  const sortOrder = Number(payload.sortOrder ?? existing.sortOrder) || 0;
  const isActive = payload.isActive ?? existing.isActive;

  if (!manufacturerName || !parentSku || !glassName) return null;

  const res = await query(
    `
    UPDATE door_glass_options
    SET
      manufacturer_name = $2,
      parent_sku = $3,
      glass_name = $4,
      price_delta = $5,
      sort_order = $6,
      is_active = $7,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      parent_sku AS "parentSku",
      glass_name AS "glassName",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [Number(id), manufacturerName, parentSku, glassName, priceDelta, sortOrder, isActive !== false],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteById = async (id) => {
  await ensureDoorOptionModuleTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM door_glass_options WHERE id = $1`, [numericId]);
  return res.rowCount > 0;
};

const upsertOption = async ({
  manufacturerName,
  parentSku,
  glassName,
  priceDelta,
  sortOrder,
  isActive = true,
}) => {
  await ensureDoorOptionModuleTables();
  const manufacturer = String(manufacturerName || "").trim();
  const sku = String(parentSku || "").trim();
  const name = String(glassName || "").trim();
  if (!manufacturer || !sku || !name) return null;

  const res = await query(
    `
    INSERT INTO door_glass_options(
      manufacturer_name,
      parent_sku,
      glass_name,
      price_delta,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (manufacturer_name, parent_sku, glass_name) DO UPDATE SET
      price_delta = EXCLUDED.price_delta,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      parent_sku AS "parentSku",
      glass_name AS "glassName",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [
      manufacturer,
      sku,
      name,
      Math.round(Number(priceDelta) || 0),
      Number(sortOrder) || 0,
      isActive !== false,
    ],
  );

  return mapRow(res.rows[0]);
};

const productParentSkuExists = async (parentSku) => {
  await ensureDoorOptionModuleTables();
  const sku = String(parentSku || "").trim();
  if (!sku) return false;
  const res = await query(
    `
    SELECT 1
    FROM products
    WHERE TRIM(sku) = TRIM($1)
    LIMIT 1
    `,
    [sku],
  );
  return res.rowCount > 0;
};

module.exports = {
  listOptions,
  listActiveByParentSku,
  listManufacturers,
  getById,
  updateById,
  deleteById,
  upsertOption,
  productParentSkuExists,
};
