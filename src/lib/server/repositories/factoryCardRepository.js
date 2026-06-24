const { query } = require("../db/postgres");
const { ensureFactoryStorefrontTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  sectionId: String(row.sectionId),
  manufacturerName: String(row.manufacturerName),
  isActive: row.isActive !== false,
  imageUrl: row.imageUrl ? String(row.imageUrl) : null,
  logoUrl: row.logoUrl ? String(row.logoUrl) : null,
  badgeLabel: row.badgeLabel ? String(row.badgeLabel) : null,
  linkTarget: row.linkTarget ? String(row.linkTarget) : "collections",
  sortOrder: Number(row.sortOrder) || 0,
});

const listBySection = async (sectionId) => {
  await ensureFactoryStorefrontTables();
  const sid = String(sectionId || "").trim();
  if (!sid) return [];
  const res = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      is_active AS "isActive",
      image_url AS "imageUrl",
      logo_url AS "logoUrl",
      badge_label AS "badgeLabel",
      link_target AS "linkTarget",
      sort_order AS "sortOrder"
    FROM factory_cards
    WHERE section_id = $1
    ORDER BY sort_order ASC, id ASC
    `,
    [sid],
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
      is_active AS "isActive",
      image_url AS "imageUrl",
      logo_url AS "logoUrl",
      badge_label AS "badgeLabel",
      link_target AS "linkTarget",
      sort_order AS "sortOrder"
    FROM factory_cards
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const upsertIfMissing = async ({ sectionId, manufacturerName, sortOrder = 0 }) => {
  await ensureFactoryStorefrontTables();
  const sid = String(sectionId || "").trim();
  const name = String(manufacturerName || "").trim();
  if (!sid || !name) return null;
  const res = await query(
    `
    INSERT INTO factory_cards(section_id, manufacturer_name, sort_order)
    VALUES ($1, $2, $3)
    ON CONFLICT (section_id, manufacturer_name) DO NOTHING
    RETURNING
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      is_active AS "isActive",
      image_url AS "imageUrl",
      logo_url AS "logoUrl",
      badge_label AS "badgeLabel",
      link_target AS "linkTarget",
      sort_order AS "sortOrder"
    `,
    [sid, name, Number(sortOrder) || 0],
  );
  if (res.rows[0]) return mapRow(res.rows[0]);
  const existing = await query(
    `
    SELECT
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      is_active AS "isActive",
      image_url AS "imageUrl",
      logo_url AS "logoUrl",
      badge_label AS "badgeLabel",
      link_target AS "linkTarget",
      sort_order AS "sortOrder"
    FROM factory_cards
    WHERE section_id = $1 AND manufacturer_name = $2
    LIMIT 1
    `,
    [sid, name],
  );
  return existing.rows[0] ? mapRow(existing.rows[0]) : null;
};

const getLogoUrlByManufacturerName = async (manufacturerName) => {
  await ensureFactoryStorefrontTables();
  const name = String(manufacturerName || "").trim();
  if (!name) return null;

  const res = await query(
    `
    SELECT logo_url AS "logoUrl"
    FROM factory_cards
    WHERE LOWER(TRIM(manufacturer_name)) = LOWER(TRIM($1))
      AND NULLIF(TRIM(logo_url), '') IS NOT NULL
    ORDER BY is_active DESC, sort_order ASC, id ASC
    LIMIT 1
    `,
    [name],
  );

  const logoUrl = res.rows[0]?.logoUrl;
  return logoUrl ? String(logoUrl).trim() : null;
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
  if (payload.logoUrl !== undefined) {
    params.push(payload.logoUrl ? String(payload.logoUrl).trim() || null : null);
    sets.push(`logo_url = $${params.length}`);
  }
  if (payload.badgeLabel !== undefined) {
    params.push(payload.badgeLabel ? String(payload.badgeLabel).trim() || null : null);
    sets.push(`badge_label = $${params.length}`);
  }
  if (payload.linkTarget !== undefined) {
    const target = String(payload.linkTarget || "").trim().toLowerCase();
    params.push(target === "catalog" ? "catalog" : "collections");
    sets.push(`link_target = $${params.length}`);
  }
  if (payload.sortOrder !== undefined && payload.sortOrder !== null) {
    params.push(Number(payload.sortOrder) || 0);
    sets.push(`sort_order = $${params.length}`);
  }

  if (sets.length === 1) return getById(numericId);

  params.push(numericId);
  const res = await query(
    `
    UPDATE factory_cards
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING
      id,
      section_id AS "sectionId",
      manufacturer_name AS "manufacturerName",
      is_active AS "isActive",
      image_url AS "imageUrl",
      logo_url AS "logoUrl",
      badge_label AS "badgeLabel",
      link_target AS "linkTarget",
      sort_order AS "sortOrder"
    `,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

module.exports = {
  listBySection,
  getById,
  upsertIfMissing,
  getLogoUrlByManufacturerName,
  update,
};
