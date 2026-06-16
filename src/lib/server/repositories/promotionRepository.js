const { query } = require("../db/postgres");
const { ensurePromotionTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  title: String(row.title || ""),
  subtitle: String(row.subtitle || ""),
  backgroundImageUrl: String(row.backgroundImageUrl || ""),
  catalogPageSlug: String(row.catalogPageSlug || "all"),
  filterManufacturer: row.filterManufacturer ? String(row.filterManufacturer) : "",
  filterCollection: row.filterCollection ? String(row.filterCollection) : "",
  sortOrder: Number(row.sortOrder) || 0,
  isActive: row.isActive !== false,
});

const bannerSelect = `
  id,
  title,
  subtitle,
  background_image_url AS "backgroundImageUrl",
  catalog_page_slug AS "catalogPageSlug",
  filter_manufacturer AS "filterManufacturer",
  filter_collection AS "filterCollection",
  sort_order AS "sortOrder",
  is_active AS "isActive"
`;

const listAll = async () => {
  await ensurePromotionTables();
  const res = await query(
    `
    SELECT ${bannerSelect}
    FROM promotion_banners
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const listActive = async () => {
  await ensurePromotionTables();
  const res = await query(
    `
    SELECT ${bannerSelect}
    FROM promotion_banners
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const getById = async (id) => {
  await ensurePromotionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT ${bannerSelect}
    FROM promotion_banners
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const create = async (payload) => {
  await ensurePromotionTables();
  const title = String(payload.title || "").trim();
  const subtitle = String(payload.subtitle || "").trim();
  const backgroundImageUrl = String(payload.backgroundImageUrl || "").trim();
  const catalogPageSlug = String(payload.catalogPageSlug || "all").trim() || "all";
  const filterManufacturer = payload.filterManufacturer
    ? String(payload.filterManufacturer).trim()
    : null;
  const filterCollection = payload.filterCollection ? String(payload.filterCollection).trim() : null;
  const sortOrder =
    payload.sortOrder !== undefined && payload.sortOrder !== null ? Number(payload.sortOrder) : 0;
  const isActive = payload.isActive !== false;

  const res = await query(
    `
    INSERT INTO promotion_banners(
      title, subtitle, background_image_url, catalog_page_slug,
      filter_manufacturer, filter_collection, sort_order, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${bannerSelect}
    `,
    [
      title,
      subtitle,
      backgroundImageUrl,
      catalogPageSlug,
      filterManufacturer,
      filterCollection,
      sortOrder,
      isActive,
    ],
  );
  return mapRow(res.rows[0]);
};

const update = async (id, payload) => {
  await ensurePromotionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const params = [];
  const sets = [];

  if (payload.title !== undefined) {
    const title = String(payload.title || "").trim();
    if (!title) return null;
    params.push(title);
    sets.push(`title = $${params.length}`);
  }
  if (payload.subtitle !== undefined) {
    params.push(String(payload.subtitle || "").trim());
    sets.push(`subtitle = $${params.length}`);
  }
  if (payload.backgroundImageUrl !== undefined) {
    const url = String(payload.backgroundImageUrl || "").trim();
    if (!url) return null;
    params.push(url);
    sets.push(`background_image_url = $${params.length}`);
  }
  if (payload.catalogPageSlug !== undefined) {
    params.push(String(payload.catalogPageSlug || "all").trim() || "all");
    sets.push(`catalog_page_slug = $${params.length}`);
  }
  if (payload.filterManufacturer !== undefined) {
    params.push(payload.filterManufacturer ? String(payload.filterManufacturer).trim() : null);
    sets.push(`filter_manufacturer = $${params.length}`);
  }
  if (payload.filterCollection !== undefined) {
    params.push(payload.filterCollection ? String(payload.filterCollection).trim() : null);
    sets.push(`filter_collection = $${params.length}`);
  }
  if (payload.sortOrder !== undefined) {
    params.push(Number(payload.sortOrder) || 0);
    sets.push(`sort_order = $${params.length}`);
  }
  if (payload.isActive !== undefined) {
    params.push(Boolean(payload.isActive));
    sets.push(`is_active = $${params.length}`);
  }

  if (sets.length === 0) return getById(numericId);

  params.push(numericId);
  const res = await query(
    `
    UPDATE promotion_banners
    SET ${sets.join(", ")}, updated_at = NOW()
    WHERE id = $${params.length}
    RETURNING ${bannerSelect}
    `,
    params,
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const deleteById = async (id) => {
  await ensurePromotionTables();
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;
  const res = await query(`DELETE FROM promotion_banners WHERE id = $1`, [numericId]);
  return Number(res.rowCount) > 0;
};

const reorder = async (orderedIds) => {
  await ensurePromotionTables();
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (ids.length === 0) return [];
  for (let i = 0; i < ids.length; i += 1) {
    await query(`UPDATE promotion_banners SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      ids[i],
      (i + 1) * 10,
    ]);
  }
  return listAll();
};

module.exports = {
  listAll,
  listActive,
  getById,
  create,
  update,
  deleteById,
  reorder,
};
