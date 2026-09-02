const { query } = require("../db/postgres");
const { ensureDoorOfWeekTables } = require("../db/schemaPatches");
const { normalizeDoorOfWeekSlot } = require("../domain/doorOfWeek");

const mapSettingsRow = (row) => ({
  slot: Number(row.slot) || 1,
  isEnabled: row.isEnabled === true,
  discountPercent: Number(row.discountPercent) || 10,
  title: String(row.title || "Дверь недели"),
});

const mapPoolRow = (row) => ({
  id: Number(row.id),
  slot: Number(row.slot) || 1,
  productId: Number(row.productId),
  sortOrder: Number(row.sortOrder) || 0,
  name: String(row.name || ""),
  sku: String(row.sku || ""),
  slug: String(row.slug || ""),
  image: String(row.image || ""),
  price: Number(row.price) || 0,
});

const getSettings = async (slot) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return null;
  await ensureDoorOfWeekTables();
  const res = await query(
    `
    SELECT
      id AS slot,
      is_enabled AS "isEnabled",
      discount_percent AS "discountPercent",
      title
    FROM door_of_week_settings
    WHERE id = $1
    LIMIT 1
    `,
    [normalizedSlot],
  );
  return res.rows[0] ? mapSettingsRow(res.rows[0]) : null;
};

const updateSettings = async (slot, patch) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return null;
  await ensureDoorOfWeekTables();
  const current = await getSettings(normalizedSlot);
  if (!current) return null;
  const isEnabled = patch.isEnabled !== undefined ? patch.isEnabled === true : current.isEnabled;
  const discountPercent =
    patch.discountPercent !== undefined ? Number(patch.discountPercent) : current.discountPercent;
  const title =
    patch.title !== undefined ? String(patch.title || "").trim() || current.title : current.title;

  const res = await query(
    `
    UPDATE door_of_week_settings
    SET
      is_enabled = $1,
      discount_percent = $2,
      title = $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING
      id AS slot,
      is_enabled AS "isEnabled",
      discount_percent AS "discountPercent",
      title
    `,
    [isEnabled, discountPercent, title, normalizedSlot],
  );
  return res.rows[0] ? mapSettingsRow(res.rows[0]) : null;
};

const listPool = async (slot) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return [];
  await ensureDoorOfWeekTables();
  const res = await query(
    `
    SELECT
      d.id,
      d.slot,
      d.product_id AS "productId",
      d.sort_order AS "sortOrder",
      p.name,
      p.sku,
      p.slug,
      p.price,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order ASC, pi.id ASC
        LIMIT 1
      ) AS image
    FROM door_of_week_products d
    JOIN products p ON p.id = d.product_id
    WHERE p.is_active = TRUE
      AND d.slot = $1
    ORDER BY d.sort_order ASC, d.id ASC
    `,
    [normalizedSlot],
  );
  return res.rows.map(mapPoolRow);
};

const addProduct = async (slot, productId) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return null;
  await ensureDoorOfWeekTables();
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const productRes = await query(
    `SELECT id FROM products WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [numericId],
  );
  if (productRes.rows.length === 0) return null;

  const maxRes = await query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max FROM door_of_week_products WHERE slot = $1`,
    [normalizedSlot],
  );
  const nextSort = Number(maxRes.rows[0]?.max || 0) + 1;

  await query(
    `
    INSERT INTO door_of_week_products (slot, product_id, sort_order)
    VALUES ($1, $2, $3)
    ON CONFLICT (slot, product_id) DO NOTHING
    `,
    [normalizedSlot, numericId, nextSort],
  );

  const pool = await listPool(normalizedSlot);
  return pool.find((row) => row.productId === numericId) || null;
};

const removeProduct = async (slot, productId) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return false;
  await ensureDoorOfWeekTables();
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const res = await query(
    `DELETE FROM door_of_week_products WHERE slot = $1 AND product_id = $2`,
    [normalizedSlot, numericId],
  );
  return res.rowCount > 0;
};

const moveProduct = async (slot, productId, direction) => {
  const normalizedSlot = normalizeDoorOfWeekSlot(slot);
  if (!normalizedSlot) return null;
  await ensureDoorOfWeekTables();
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const pool = await listPool(normalizedSlot);
  const index = pool.findIndex((row) => row.productId === numericId);
  if (index < 0) return null;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= pool.length) return pool;

  const current = pool[index];
  const other = pool[swapIndex];
  await query(`UPDATE door_of_week_products SET sort_order = $2 WHERE id = $1`, [
    current.id,
    other.sortOrder,
  ]);
  await query(`UPDATE door_of_week_products SET sort_order = $2 WHERE id = $1`, [
    other.id,
    current.sortOrder,
  ]);
  return listPool(normalizedSlot);
};

module.exports = {
  getSettings,
  updateSettings,
  listPool,
  addProduct,
  removeProduct,
  moveProduct,
};
