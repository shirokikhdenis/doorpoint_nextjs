const { query } = require("../db/postgres");
const { ensureDoorOptionModuleTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  manufacturerName: String(row.manufacturerName || ""),
  code: String(row.code || ""),
  name: String(row.name || ""),
  price: Number(row.price) || 0,
  sortOrder: Number(row.sortOrder) || 0,
  isActive: row.isActive !== false,
});

const listServices = async ({ manufacturerName = "", activeOnly = false } = {}) => {
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
  if (activeOnly) {
    where.push("is_active = TRUE");
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      code,
      name,
      price,
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_hardware_services
    ${whereSql}
    ORDER BY manufacturer_name ASC, sort_order ASC, name ASC, id ASC
    `,
    params,
  );

  return res.rows.map(mapRow);
};

const listActiveByManufacturer = async (manufacturerName) =>
  listServices({ manufacturerName, activeOnly: true });

const listManufacturers = async () => {
  await ensureDoorOptionModuleTables();
  const res = await query(
    `
    SELECT DISTINCT TRIM(manufacturer_name) AS name
    FROM door_hardware_services
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
      code,
      name,
      price,
      sort_order AS "sortOrder",
      is_active AS "isActive"
    FROM door_hardware_services
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
  const code = String(payload.code ?? existing.code).trim();
  const name = String(payload.name ?? existing.name).trim();
  const price = Math.round(Number(payload.price ?? existing.price) || 0);
  const sortOrder = Number(payload.sortOrder ?? existing.sortOrder) || 0;
  const isActive = payload.isActive ?? existing.isActive;

  if (!manufacturerName || !code || !name) return null;

  const res = await query(
    `
    UPDATE door_hardware_services
    SET
      manufacturer_name = $2,
      code = $3,
      name = $4,
      price = $5,
      sort_order = $6,
      is_active = $7,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      code,
      name,
      price,
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [Number(id), manufacturerName, code, name, price, sortOrder, isActive !== false],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteById = async (id) => {
  await ensureDoorOptionModuleTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM door_hardware_services WHERE id = $1`, [numericId]);
  return res.rowCount > 0;
};

const upsertService = async ({
  manufacturerName,
  code,
  name,
  price,
  sortOrder,
  isActive = true,
}) => {
  await ensureDoorOptionModuleTables();
  const manufacturer = String(manufacturerName || "").trim();
  const serviceCode = String(code || "").trim();
  const serviceName = String(name || "").trim();
  if (!manufacturer || !serviceCode || !serviceName) return null;

  const res = await query(
    `
    INSERT INTO door_hardware_services(
      manufacturer_name,
      code,
      name,
      price,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (manufacturer_name, code) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING
      id,
      manufacturer_name AS "manufacturerName",
      code,
      name,
      price,
      sort_order AS "sortOrder",
      is_active AS "isActive"
    `,
    [
      manufacturer,
      serviceCode,
      serviceName,
      Math.round(Number(price) || 0),
      Number(sortOrder) || 0,
      isActive !== false,
    ],
  );

  return mapRow(res.rows[0]);
};

module.exports = {
  listActiveByManufacturer,
  listServices,
  listManufacturers,
  getById,
  updateById,
  deleteById,
  upsertService,
};
