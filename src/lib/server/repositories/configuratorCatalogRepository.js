const { query } = require("../db/postgres");
const { ensureConfiguratorTables } = require("../db/schemaPatches");

const bool = (value) => value === true || value === 1 || value === "1";
const num = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const mapModel = (row) => ({
  id: Number(row.sourceId),
  name: String(row.name || ""),
  type: row.type === "interior" ? "interior" : "exterior",
  classification: row.classification || null,
  imageUrl: String(row.imageUrl || ""),
  hasPrimaryFilmColor: bool(row.hasPrimaryFilmColor),
  hasSecondaryFilmColor: bool(row.hasSecondaryFilmColor),
  hasCasingFilmColor: bool(row.hasCasingFilmColor),
  hasPrimaryPaint: bool(row.hasPrimaryPaint),
  hasSecondaryPaint: bool(row.hasSecondaryPaint),
  hasCasingPaint: bool(row.hasCasingPaint),
  defaultPrimaryFilmColorId: num(row.defaultPrimaryFilmColorId),
  defaultSecondaryFilmColorId: num(row.defaultSecondaryFilmColorId),
  defaultCasingFilmColorId: num(row.defaultCasingFilmColorId),
  defaultPrimaryPaintId: num(row.defaultPrimaryPaintId),
  defaultSecondaryPaintId: num(row.defaultSecondaryPaintId),
  defaultCasingPaintId: num(row.defaultCasingPaintId),
  filmColorSource: row.filmColorSource || null,
  paintColorSource: row.paintColorSource || null,
  peepholePosition: row.peepholePosition || "anywhere",
  markupAbs: Number(row.markupAbs) || 0,
});

const mapNomenclature = (row) => ({
  id: Number(row.sourceId),
  kind: String(row.kind || ""),
  name: String(row.name || ""),
  imageUrl: String(row.imageUrl || ""),
  basePrice: Number(row.basePrice) || 0,
  unit: row.unit || null,
  properties: row.properties && typeof row.properties === "object" ? row.properties : {},
});

const mapFurniture = (row) => ({
  id: Number(row.sourceId),
  title: String(row.title || ""),
  type: String(row.type || "push"),
  shape: String(row.shape || ""),
  color: String(row.color || ""),
  previewUrl: String(row.previewUrl || ""),
  interiorPreviewUrl: String(row.interiorPreviewUrl || ""),
  overlays: row.overlays && typeof row.overlays === "object" ? row.overlays : {},
  handleId: num(row.handleId),
  primaryCylindricalLockId: num(row.primaryCylindricalLockId),
  primaryLeverLockId: num(row.primaryLeverLockId),
  secondaryCylindricalLockId: num(row.secondaryCylindricalLockId),
  secondaryLeverLockId: num(row.secondaryLeverLockId),
  peepholeId: num(row.peepholeId),
  nightLatchId: num(row.nightLatchId),
  cylinderRodId: num(row.cylinderRodId),
});

const mapPriceOption = (row) => ({
  code: String(row.code || ""),
  name: String(row.name || ""),
  delta: Number(row.delta) || 0,
  category: String(row.category || ""),
  comment: String(row.comment || ""),
});

const upsertModel = async (model) => {
  await ensureConfiguratorTables();
  await query(
    `
    INSERT INTO configurator_models (
      source_id, name, type, classification, image_url,
      has_primary_film_color, has_secondary_film_color, has_casing_film_color,
      has_primary_paint, has_secondary_paint, has_casing_paint,
      default_primary_film_color_id, default_secondary_film_color_id, default_casing_film_color_id,
      default_primary_paint_id, default_secondary_paint_id, default_casing_paint_id,
      film_color_source, paint_color_source, peephole_position, markup_abs, sort_order, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      classification = EXCLUDED.classification,
      image_url = EXCLUDED.image_url,
      has_primary_film_color = EXCLUDED.has_primary_film_color,
      has_secondary_film_color = EXCLUDED.has_secondary_film_color,
      has_casing_film_color = EXCLUDED.has_casing_film_color,
      has_primary_paint = EXCLUDED.has_primary_paint,
      has_secondary_paint = EXCLUDED.has_secondary_paint,
      has_casing_paint = EXCLUDED.has_casing_paint,
      default_primary_film_color_id = EXCLUDED.default_primary_film_color_id,
      default_secondary_film_color_id = EXCLUDED.default_secondary_film_color_id,
      default_casing_film_color_id = EXCLUDED.default_casing_film_color_id,
      default_primary_paint_id = EXCLUDED.default_primary_paint_id,
      default_secondary_paint_id = EXCLUDED.default_secondary_paint_id,
      default_casing_paint_id = EXCLUDED.default_casing_paint_id,
      film_color_source = EXCLUDED.film_color_source,
      paint_color_source = EXCLUDED.paint_color_source,
      peephole_position = EXCLUDED.peephole_position,
      markup_abs = EXCLUDED.markup_abs,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    `,
    [
      model.sourceId,
      model.name,
      model.type,
      model.classification,
      model.imageUrl,
      model.hasPrimaryFilmColor,
      model.hasSecondaryFilmColor,
      model.hasCasingFilmColor,
      model.hasPrimaryPaint,
      model.hasSecondaryPaint,
      model.hasCasingPaint,
      model.defaultPrimaryFilmColorId,
      model.defaultSecondaryFilmColorId,
      model.defaultCasingFilmColorId,
      model.defaultPrimaryPaintId,
      model.defaultSecondaryPaintId,
      model.defaultCasingPaintId,
      model.filmColorSource,
      model.paintColorSource,
      model.peepholePosition,
      model.markupAbs,
      model.sortOrder,
    ],
  );
};

const upsertNomenclature = async (item) => {
  await ensureConfiguratorTables();
  await query(
    `
    INSERT INTO configurator_nomenclature (
      source_id, kind, name, image_url, base_price, unit, properties, sort_order, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8, NOW())
    ON CONFLICT (kind, source_id) DO UPDATE SET
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      base_price = EXCLUDED.base_price,
      unit = EXCLUDED.unit,
      properties = EXCLUDED.properties,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    `,
    [
      item.sourceId,
      item.kind,
      item.name,
      item.imageUrl,
      item.basePrice,
      item.unit,
      JSON.stringify(item.properties || {}),
      item.sortOrder,
    ],
  );
};

const upsertFurniture = async (item) => {
  await ensureConfiguratorTables();
  await query(
    `
    INSERT INTO configurator_furniture (
      source_id, title, type, shape, color, preview_url, interior_preview_url, overlays,
      handle_id, primary_cylindrical_lock_id, primary_lever_lock_id,
      secondary_cylindrical_lock_id, secondary_lever_lock_id,
      peephole_id, night_latch_id, cylinder_rod_id, sort_order, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
      title = EXCLUDED.title,
      type = EXCLUDED.type,
      shape = EXCLUDED.shape,
      color = EXCLUDED.color,
      preview_url = EXCLUDED.preview_url,
      interior_preview_url = EXCLUDED.interior_preview_url,
      overlays = EXCLUDED.overlays,
      handle_id = EXCLUDED.handle_id,
      primary_cylindrical_lock_id = EXCLUDED.primary_cylindrical_lock_id,
      primary_lever_lock_id = EXCLUDED.primary_lever_lock_id,
      secondary_cylindrical_lock_id = EXCLUDED.secondary_cylindrical_lock_id,
      secondary_lever_lock_id = EXCLUDED.secondary_lever_lock_id,
      peephole_id = EXCLUDED.peephole_id,
      night_latch_id = EXCLUDED.night_latch_id,
      cylinder_rod_id = EXCLUDED.cylinder_rod_id,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    `,
    [
      item.sourceId,
      item.title,
      item.type,
      item.shape,
      item.color,
      item.previewUrl,
      item.interiorPreviewUrl,
      JSON.stringify(item.overlays || {}),
      item.handleId,
      item.primaryCylindricalLockId,
      item.primaryLeverLockId,
      item.secondaryCylindricalLockId,
      item.secondaryLeverLockId,
      item.peepholeId,
      item.nightLatchId,
      item.cylinderRodId,
      item.sortOrder,
    ],
  );
};

const upsertPriceOption = async (item) => {
  await ensureConfiguratorTables();
  await query(
    `
    INSERT INTO configurator_price_options (code, name, delta, category, comment)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      delta = EXCLUDED.delta,
      category = EXCLUDED.category,
      comment = EXCLUDED.comment
    `,
    [item.code, item.name, item.delta, item.category, item.comment],
  );
};

const deleteModelsNotIn = async (sourceIds) => {
  await ensureConfiguratorTables();
  const ids = (sourceIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (!ids.length) {
    await query(`DELETE FROM configurator_models`);
    return;
  }
  await query(`DELETE FROM configurator_models WHERE NOT (source_id = ANY($1::int[]))`, [ids]);
};

const listModels = async () => {
  await ensureConfiguratorTables();
  const res = await query(`
    SELECT
      source_id AS "sourceId",
      name,
      type,
      classification,
      image_url AS "imageUrl",
      has_primary_film_color AS "hasPrimaryFilmColor",
      has_secondary_film_color AS "hasSecondaryFilmColor",
      has_casing_film_color AS "hasCasingFilmColor",
      has_primary_paint AS "hasPrimaryPaint",
      has_secondary_paint AS "hasSecondaryPaint",
      has_casing_paint AS "hasCasingPaint",
      default_primary_film_color_id AS "defaultPrimaryFilmColorId",
      default_secondary_film_color_id AS "defaultSecondaryFilmColorId",
      default_casing_film_color_id AS "defaultCasingFilmColorId",
      default_primary_paint_id AS "defaultPrimaryPaintId",
      default_secondary_paint_id AS "defaultSecondaryPaintId",
      default_casing_paint_id AS "defaultCasingPaintId",
      film_color_source AS "filmColorSource",
      paint_color_source AS "paintColorSource",
      peephole_position AS "peepholePosition",
      markup_abs AS "markupAbs"
    FROM configurator_models
    ORDER BY type ASC, sort_order ASC, name ASC, source_id ASC
  `);
  return res.rows.map(mapModel);
};

const listNomenclature = async () => {
  await ensureConfiguratorTables();
  const res = await query(`
    SELECT
      source_id AS "sourceId",
      kind,
      name,
      image_url AS "imageUrl",
      base_price AS "basePrice",
      unit,
      properties
    FROM configurator_nomenclature
    ORDER BY kind ASC, sort_order ASC, name ASC, source_id ASC
  `);
  return res.rows.map(mapNomenclature);
};

const listFurniture = async () => {
  await ensureConfiguratorTables();
  const res = await query(`
    SELECT
      source_id AS "sourceId",
      title,
      type,
      shape,
      color,
      preview_url AS "previewUrl",
      interior_preview_url AS "interiorPreviewUrl",
      overlays,
      handle_id AS "handleId",
      primary_cylindrical_lock_id AS "primaryCylindricalLockId",
      primary_lever_lock_id AS "primaryLeverLockId",
      secondary_cylindrical_lock_id AS "secondaryCylindricalLockId",
      secondary_lever_lock_id AS "secondaryLeverLockId",
      peephole_id AS "peepholeId",
      night_latch_id AS "nightLatchId",
      cylinder_rod_id AS "cylinderRodId"
    FROM configurator_furniture
    ORDER BY sort_order ASC, title ASC, source_id ASC
  `);
  return res.rows.map(mapFurniture);
};

const listPriceOptions = async () => {
  await ensureConfiguratorTables();
  const res = await query(`
    SELECT code, name, delta, category, comment
    FROM configurator_price_options
    ORDER BY code ASC
  `);
  return res.rows.map(mapPriceOption);
};

const countRows = async () => {
  await ensureConfiguratorTables();
  const res = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM configurator_models) AS models,
      (SELECT COUNT(*)::int FROM configurator_nomenclature) AS nomenclature,
      (SELECT COUNT(*)::int FROM configurator_furniture) AS furniture,
      (SELECT COUNT(*)::int FROM configurator_price_options) AS price_options
  `);
  return res.rows[0] || { models: 0, nomenclature: 0, furniture: 0, price_options: 0 };
};

module.exports = {
  upsertModel,
  upsertNomenclature,
  upsertFurniture,
  upsertPriceOption,
  deleteModelsNotIn,
  listModels,
  listNomenclature,
  listFurniture,
  listPriceOptions,
  countRows,
};
