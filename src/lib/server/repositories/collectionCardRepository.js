const { query } = require("../db/postgres");
const { ensureFactoryStorefrontTables } = require("../db/schemaPatches");

const DEFAULT_COLLECTION_DESCRIPTION = "описание";

const mapRow = (row) => ({
  id: Number(row.id),
  sectionId: String(row.sectionId),
  manufacturerName: String(row.manufacturerName),
  collectionName: String(row.collectionName),
  description: String(row.description || "").trim() || DEFAULT_COLLECTION_DESCRIPTION,
  isActive: row.isActive !== false,
  imageUrl: row.imageUrl ? String(row.imageUrl) : null,
  sortOrder: Number(row.sortOrder) || 0,
});

const listByScope = async (sectionId, manufacturerName) => {
  await ensureFactoryStorefrontTables();
  const sid = String(sectionId || "").trim();
  const manufacturer = String(manufacturerName || "").trim();
  if (!sid || !manufacturer) return [];
  const res = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      collection_name AS "collectionName",
      description,
      is_active AS "isActive",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM collection_cards
    WHERE section_id = $1 AND manufacturer_name = $2
    ORDER BY sort_order ASC, id ASC
    `,
    [sid, manufacturer],
  );
  return res.rows.map(mapRow);
};

const getById = async (id) => {
  await ensureFactoryStorefrontTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      collection_name AS "collectionName",
      description,
      is_active AS "isActive",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM collection_cards
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const upsertIfMissing = async ({
  sectionId,
  manufacturerName,
  collectionName,
  sortOrder = 0,
}) => {
  await ensureFactoryStorefrontTables();
  const sid = String(sectionId || "").trim();
  const manufacturer = String(manufacturerName || "").trim();
  const collection = String(collectionName || "").trim();
  if (!sid || !manufacturer || !collection) return null;
  const res = await query(
    `
    INSERT INTO collection_cards(section_id, manufacturer_name, collection_name, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (section_id, manufacturer_name, collection_name) DO NOTHING
    RETURNING
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      collection_name AS "collectionName",
      description,
      is_active AS "isActive",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    `,
    [sid, manufacturer, collection, Number(sortOrder) || 0],
  );
  if (res.rows[0]) return mapRow(res.rows[0]);
  const existing = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      collection_name AS "collectionName",
      description,
      is_active AS "isActive",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM collection_cards
    WHERE section_id = $1 AND manufacturer_name = $2 AND collection_name = $3
    LIMIT 1
    `,
    [sid, manufacturer, collection],
  );
  return existing.rows[0] ? mapRow(existing.rows[0]) : null;
};

const update = async (id, payload) => {
  await ensureFactoryStorefrontTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const params = [];
  const sets = ["updated_at = NOW()"];

  if (payload.isActive !== undefined) {
    params.push(payload.isActive === true);
    sets.push(`is_active = $${params.length}`);
  }
  if (payload.imageUrl !== undefined) {
    params.push(payload.imageUrl ? String(payload.imageUrl).trim() || null : null);
    sets.push(`image_url = $${params.length}`);
  }
  if (payload.sortOrder !== undefined && payload.sortOrder !== null) {
    params.push(Number(payload.sortOrder) || 0);
    sets.push(`sort_order = $${params.length}`);
  }
  if (payload.description !== undefined) {
    const text = String(payload.description ?? "").trim();
    params.push(text || DEFAULT_COLLECTION_DESCRIPTION);
    sets.push(`description = $${params.length}`);
  }

  if (sets.length === 1) return getById(numericId);

  params.push(numericId);
  const res = await query(
    `
    UPDATE collection_cards
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      collection_name AS "collectionName",
      description,
      is_active AS "isActive",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    `,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

module.exports = {
  listByScope,
  getById,
  upsertIfMissing,
  update,
};
