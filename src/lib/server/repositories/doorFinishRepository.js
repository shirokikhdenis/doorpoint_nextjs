const { query } = require("../db/postgres");
const { ensureDoorFinishTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  manufacturerName: String(row.manufacturerName || ""),
  groupKey: String(row.groupKey || "other"),
  name: String(row.name || ""),
  imageUrl: String(row.imageUrl || ""),
  priceDelta: Number(row.priceDelta) || 0,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: row.isActive !== false,
});

const listActiveByManufacturer = async (manufacturerName) => {
  const rows = await listFinishes({
    manufacturerName,
    activeOnly: true,
  });
  return rows;
};

const listFinishes = async ({ manufacturerName = "", activeOnly = false } = {}) => {
  await ensureDoorFinishTables();
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
  if (activeOnly) {
    where.push("is_active = TRUE");
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      group_key AS "groupKey",
      name,
      image_url AS "imageUrl",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_finishes
    ${whereSql}
    ORDER BY manufacturer_name ASC, sort_order ASC, name ASC, id ASC
    `,
    params,
  );

  return res.rows.map(mapRow);
};

const listManufacturers = async () => {
  await ensureDoorFinishTables();
  const res = await query(
    `
    SELECT DISTINCT TRIM(manufacturer_name) AS name
    FROM door_finishes
    WHERE TRIM(manufacturer_name) <> ''
    ORDER BY name ASC
    `,
  );
  return res.rows.map((row) => String(row.name || "").trim()).filter(Boolean);
};

const getById = async (id) => {
  await ensureDoorFinishTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      group_key AS "groupKey",
      name,
      image_url AS "imageUrl",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_finishes
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const updateById = async (id, payload) => {
  await ensureDoorFinishTables();
  const existing = await getById(id);
  if (!existing) return null;

  const manufacturerName = String(payload.manufacturerName ?? existing.manufacturerName).trim();
  const name = String(payload.name ?? existing.name).trim();
  const groupKey = String(payload.groupKey ?? existing.groupKey).trim() || "other";
  const imageUrl = String(payload.imageUrl ?? existing.imageUrl).trim();
  const priceDelta = Math.round(Number(payload.priceDelta ?? existing.priceDelta) || 0);
  const sortOrder = Number(payload.sortOrder ?? existing.sortOrder) || 0;
  const isActive = payload.isActive ?? existing.isActive;

  if (!manufacturerName || !name) return null;

  const res = await query(
    `
    UPDATE door_finishes
    SET
      manufacturer_name = $2,
      group_key = $3,
      name = $4,
      image_url = $5,
      price_delta = $6,
      sort_order = $7,
      is_active = $8,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      group_key AS "groupKey",
      name,
      image_url AS "imageUrl",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [Number(id), manufacturerName, groupKey, name, imageUrl, priceDelta, sortOrder, isActive !== false],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteById = async (id) => {
  await ensureDoorFinishTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM door_finishes WHERE id = $1`, [numericId]);
  return res.rowCount > 0;
};

const deleteByManufacturer = async (manufacturerName) => {
  await ensureDoorFinishTables();
  const manufacturer = String(manufacturerName || "").trim();
  if (!manufacturer) return 0;

  const res = await query(
    `
    DELETE FROM door_finishes
    WHERE LOWER(TRIM(manufacturer_name)) = LOWER(TRIM($1))
    `,
    [manufacturer],
  );
  return res.rowCount || 0;
};

const upsertFinish = async ({
  manufacturerName,
  groupKey,
  name,
  imageUrl,
  priceDelta,
  sortOrder,
  isActive = true,
}) => {
  await ensureDoorFinishTables();
  const manufacturer = String(manufacturerName || "").trim();
  const finishName = String(name || "").trim();
  if (!manufacturer || !finishName) return null;

  const res = await query(
    `
    INSERT INTO door_finishes(
      manufacturer_name,
      group_key,
      name,
      image_url,
      price_delta,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (manufacturer_name, name) DO UPDATE SET
      group_key = EXCLUDED.group_key,
      image_url = EXCLUDED.image_url,
      price_delta = EXCLUDED.price_delta,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      group_key AS "groupKey",
      name,
      image_url AS "imageUrl",
      price_delta AS "priceDelta",
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [
      manufacturer,
      String(groupKey || "other").trim() || "other",
      finishName,
      String(imageUrl || "").trim(),
      Math.round(Number(priceDelta) || 0),
      Number(sortOrder) || 0,
      isActive !== false,
    ],
  );

  return mapRow(res.rows[0]);
};

module.exports = {
  listActiveByManufacturer,
  listFinishes,
  listManufacturers,
  getById,
  updateById,
  deleteById,
  deleteByManufacturer,
  upsertFinish,
};
