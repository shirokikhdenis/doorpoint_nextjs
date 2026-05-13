const { query } = require("../db/postgres");
const { normalizeAttributeLabel } = require("../domain/attributeSemantics");

/**
 * Атрибуты:
 *   - options теперь лежат прямо в attribute_definitions.options (JSONB-массив строк),
 *     отдельной таблицы attribute_options нет;
 *   - вместо четырёх булевых флагов один scope: 'product' | 'variant' (бывший is_variant_axis).
 *
 * Сюда подмешиваются legacy-поля (isVariantAxis, isVisibleOnProduct, isRequired),
 * чтобы admin-форма и CSV-импорт продолжали работать без изменений.
 */

const OPTION_BASE = 100000;

const toCode = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const mapDefinitionRow = (row) => ({
  id: Number(row.id),
  code: row.code,
  name: row.name,
  type: row.type,
  unit: row.unit || null,
  isFilterable: row.isFilterable !== false,
  isRequired: false,
  isVisibleOnProduct: row.isVisibleOnProduct !== false,
  isVariantAxis: row.scope === "variant",
  sortOrder: Number(row.sortOrder) || 0,
  scope: row.scope,
  options: Array.isArray(row.options) ? row.options : [],
});

const listAttributes = async () => {
  const res = await query(
    `
    SELECT
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    FROM attribute_definitions
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapDefinitionRow);
};

const listAttributeOptions = async (attributeId) => {
  const res = await query(
    `SELECT id, options FROM attribute_definitions WHERE id = $1`,
    [attributeId],
  );
  if (!res.rows[0]) return [];
  const options = Array.isArray(res.rows[0].options) ? res.rows[0].options : [];
  return options.map((value, index) => ({
    id: Number(attributeId) * OPTION_BASE + index,
    attributeId: Number(attributeId),
    value: String(value),
    sortOrder: index,
  }));
};

const findAttributeById = async (id) => {
  const res = await query(
    `
    SELECT
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    FROM attribute_definitions
    WHERE id = $1
    `,
    [id],
  );
  return res.rows[0] ? mapDefinitionRow(res.rows[0]) : null;
};

const findAttributeByCode = async (code) => {
  const res = await query(
    `
    SELECT
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    FROM attribute_definitions
    WHERE code = $1
    `,
    [code],
  );
  return res.rows[0] ? mapDefinitionRow(res.rows[0]) : null;
};

const createAttribute = async (payload) => {
  const orderRes = await query(
    `SELECT COALESCE(MAX(sort_order), 0) + 10 AS n FROM attribute_definitions`,
  );
  const sortOrder =
    payload.sortOrder !== undefined && payload.sortOrder !== null
      ? Number(payload.sortOrder)
      : Number(orderRes.rows[0].n);
  const scope = payload.isVariantAxis === true ? "variant" : "product";
  const res = await query(
    `
    INSERT INTO attribute_definitions(
      code, name, type, unit, options, scope, is_filterable, is_visible_on_product, sort_order
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
    RETURNING
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    `,
    [
      payload.code,
      payload.name,
      payload.type,
      payload.unit || null,
      JSON.stringify(Array.isArray(payload.options) ? payload.options : []),
      scope,
      payload.isFilterable !== false,
      payload.isVisibleOnProduct !== false,
      Number.isFinite(sortOrder) ? sortOrder : 0,
    ],
  );
  return mapDefinitionRow(res.rows[0]);
};

const updateAttribute = async (id, payload) => {
  const existing = await findAttributeById(id);
  if (!existing) return null;

  const isVariantAxis =
    payload.isVariantAxis !== undefined ? payload.isVariantAxis === true : existing.isVariantAxis;
  const scope = isVariantAxis ? "variant" : "product";
  const code = payload.code !== undefined ? payload.code : existing.code;
  const name = payload.name !== undefined ? payload.name : existing.name;
  const type = payload.type !== undefined ? payload.type : existing.type;
  const unit = payload.unit !== undefined ? payload.unit || null : existing.unit;
  const isFilterable =
    payload.isFilterable !== undefined ? payload.isFilterable !== false : existing.isFilterable;
  const isVisibleOnProduct =
    payload.isVisibleOnProduct !== undefined
      ? payload.isVisibleOnProduct !== false
      : existing.isVisibleOnProduct;
  const sortOrder =
    payload.sortOrder !== undefined && payload.sortOrder !== null
      ? Number(payload.sortOrder)
      : existing.sortOrder;

  const res = await query(
    `
    UPDATE attribute_definitions
    SET
      code = $2,
      name = $3,
      type = $4,
      unit = $5,
      scope = $6,
      is_filterable = $7,
      is_visible_on_product = $8,
      sort_order = $9
    WHERE id = $1
    RETURNING
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    `,
    [id, code, name, type, unit, scope, isFilterable, isVisibleOnProduct, sortOrder],
  );
  return res.rows[0] ? mapDefinitionRow(res.rows[0]) : null;
};

const findAttributeByName = async (name) => {
  const normalized = normalizeAttributeLabel(name);
  if (!normalized) return null;
  const res = await query(
    `
    SELECT
      id,
      code,
      name,
      type,
      unit,
      options,
      scope,
      is_filterable AS "isFilterable",
      is_visible_on_product AS "isVisibleOnProduct",
      sort_order AS "sortOrder"
    FROM attribute_definitions
    WHERE
      regexp_replace(replace(lower(name), 'ё', 'е'), '\\s+', ' ', 'g')
      = regexp_replace(replace(lower($1), 'ё', 'е'), '\\s+', ' ', 'g')
    LIMIT 1
    `,
    [normalized],
  );
  return res.rows[0] ? mapDefinitionRow(res.rows[0]) : null;
};

const findOrCreateTextAttributeByName = async (name) => {
  const normalizedName = normalizeAttributeLabel(name);
  if (!normalizedName) return null;

  const existing = await findAttributeByName(normalizedName);
  if (existing) return existing;

  const baseCode = toCode(normalizedName) || "csv_attribute";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = attempt === 0 ? baseCode : `${baseCode}_${attempt + 1}`;
    try {
      return await createAttribute({
        code,
        name: normalizedName,
        type: "text",
        unit: null,
        isFilterable: false,
        isVariantAxis: false,
      });
    } catch (error) {
      if (error?.code === "23505") {
        const byName = await findAttributeByName(normalizedName);
        if (byName) return byName;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Unable to create attribute "${normalizedName}"`);
};

const createAttributeOption = async (payload) => {
  const attributeId = Number(payload.attributeId);
  const value = String(payload.value || "").trim();
  if (!Number.isFinite(attributeId) || !value) return null;
  const res = await query(
    `
    UPDATE attribute_definitions
    SET options = CASE
      WHEN options ? $2 THEN options
      ELSE options || to_jsonb($2::text)
    END
    WHERE id = $1
    RETURNING id, options
    `,
    [attributeId, value],
  );
  if (!res.rows[0]) return null;
  const options = Array.isArray(res.rows[0].options) ? res.rows[0].options : [];
  const index = options.indexOf(value);
  return {
    id: attributeId * OPTION_BASE + (index >= 0 ? index : options.length - 1),
    attributeId,
    value,
    sortOrder: index >= 0 ? index : options.length - 1,
  };
};

/**
 * legacy-payload, который админ-форма посылает в createProduct/updateProduct, содержит
 * { attributeId, valueText?, valueNumber?, valueOptionId? }. valueOptionId — синтетический
 * id опции = attribute_id * OPTION_BASE + index. Здесь решаем «что в итоге кладём в JSONB».
 */
const resolveAttributeValue = (def, payload) => {
  if (!def) return null;

  if (payload.valueOptionId !== null && payload.valueOptionId !== undefined) {
    const id = Number(payload.valueOptionId);
    const index = id - Number(def.id) * OPTION_BASE;
    if (index >= 0 && index < (def.options || []).length) {
      return def.options[index];
    }
  }

  if (def.type === "number") {
    if (payload.valueNumber !== null && payload.valueNumber !== undefined && payload.valueNumber !== "") {
      const num = Number(payload.valueNumber);
      if (Number.isFinite(num)) return num;
    }
    if (payload.valueText) {
      const num = Number(String(payload.valueText).replace(",", "."));
      if (Number.isFinite(num)) return num;
    }
    return null;
  }

  const text = String(payload.valueText ?? "").trim();
  return text === "" ? null : text;
};

module.exports = {
  listAttributes,
  listAttributeOptions,
  findAttributeById,
  findAttributeByCode,
  createAttribute,
  updateAttribute,
  createAttributeOption,
  findAttributeByName,
  findOrCreateTextAttributeByName,
  resolveAttributeValue,
  OPTION_BASE,
};
