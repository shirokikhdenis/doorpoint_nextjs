const { query } = require("../db/postgres");
const { normalizeAttrNameKey } = require("./attributeSemantics");

const FITTINGS_ROOT_SLUG = "fittings";
const HANDLES_SUBCATEGORY_SLUG = "ручки";

const FIXATORS_SUBCATEGORY_SLUG = "фиксаторы";
const LATCHES_SUBCATEGORY_SLUG = "защелки";
const HINGES_SUBCATEGORY_SLUG = "петли";
const LIMITERS_SUBCATEGORY_SLUG = "ограничители";
const SHOOTBOLTS_SUBCATEGORY_SLUG = "шпингалеты";

const ATTR_CODES = {
  lockType: "LOCK_TYPE",
  hingeType: "HINGE_TYPE",
};

const ATTR_NAME_KEYS = {
  manufacturer: "производитель",
  colorArticle: "артикул цвета фурнитуры",
  shade: "оттенок",
  rosette: "розетка",
};

/** Значение LOCK_TYPE на карточке защёлки. */
const MAGNETIC_LATCH_LOCK_TYPE = "Сантехническая магнитная";
const FLUSH_HINGE_TYPE = "Врезная универсальная";
const BUTTERFLY_HINGE_TYPE = "Бабочка";

/** Максимальная цена ограничителя в блоке сопутствующей фурнитуры (руб.). */
const LIMITER_MAX_PRICE = 1000;

/**
 * Фиксированный порядок слотов сопутствующей фурнитуры на карточке ручки.
 * @type {Array<{
 *   group: string;
 *   subcategorySlug: string;
 *   colorMatch?: "shade" | "colorArticle";
 *   requiresRosette?: boolean;
 *   maxPrice?: number;
 *   typeMatch?: { code: string; value: string };
 * }>}
 */
const RELATED_FITTING_SLOTS = [
  {
    group: "magnetic_latch",
    subcategorySlug: LATCHES_SUBCATEGORY_SLUG,
    colorMatch: "shade",
    typeMatch: { code: ATTR_CODES.lockType, value: MAGNETIC_LATCH_LOCK_TYPE },
  },
  {
    group: "fixator",
    subcategorySlug: FIXATORS_SUBCATEGORY_SLUG,
    colorMatch: "colorArticle",
    requiresRosette: true,
  },
  {
    group: "flush_hinge",
    subcategorySlug: HINGES_SUBCATEGORY_SLUG,
    colorMatch: "shade",
    typeMatch: { code: ATTR_CODES.hingeType, value: FLUSH_HINGE_TYPE },
  },
  {
    group: "butterfly_hinge",
    subcategorySlug: HINGES_SUBCATEGORY_SLUG,
    colorMatch: "shade",
    typeMatch: { code: ATTR_CODES.hingeType, value: BUTTERFLY_HINGE_TYPE },
  },
  {
    group: "limiter",
    subcategorySlug: LIMITERS_SUBCATEGORY_SLUG,
    colorMatch: "shade",
    maxPrice: LIMITER_MAX_PRICE,
  },
  {
    group: "shootbolt",
    subcategorySlug: SHOOTBOLTS_SUBCATEGORY_SLUG,
    colorMatch: "shade",
  },
];

const productImageSubquery = `
  COALESCE(
    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1),
    ''
  )
`;

const storefrontListedProductPredicatesSql = `
  EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND NULLIF(BTRIM(pi.image_url), '') IS NOT NULL
  )
`;

const taxonomyJoin = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
`;

const resolveAttrCodes = (attrDefs) => {
  const byName = new Map(
    (attrDefs || []).map((def) => [normalizeAttrNameKey(def.name), def.code]),
  );
  return {
    manufacturer: byName.get(ATTR_NAME_KEYS.manufacturer) || "manufacturer",
    colorArticle: byName.get(ATTR_NAME_KEYS.colorArticle) || null,
    shade: byName.get(ATTR_NAME_KEYS.shade) || "ottenok",
    rosette: byName.get(ATTR_NAME_KEYS.rosette) || null,
    lockType: byName.get(normalizeAttrNameKey("lock type")) || ATTR_CODES.lockType,
    hingeType: byName.get(normalizeAttrNameKey("hinge type")) || ATTR_CODES.hingeType,
  };
};

const readAttrValue = (attrs, code) => {
  if (!code || !attrs || typeof attrs !== "object") return "";
  const raw = attrs[code];
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
};

const mapRelatedRow = (row, group) => ({
  id: Number(row.id),
  sku: row.sku,
  slug: row.slug || null,
  name: row.name,
  price: Number(row.price),
  image: row.image || "",
  subcategory: row.subcategoryName || "",
  group,
});

const fetchFirstInSubcategory = async ({
  productId,
  subcategorySlug,
  matchFields,
  excludeIds,
  group,
  maxPrice,
}) => {
  const activeMatches = matchFields.filter((field) => field.code && field.value);
  if (activeMatches.length !== matchFields.length) return [];

  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const matchSql = activeMatches
    .map((field) => {
      const codeParam = addParam(field.code);
      const valueParam = addParam(field.value);
      return `LOWER(TRIM(COALESCE(p.attrs->>${codeParam}, ''))) = LOWER(${valueParam})`;
    })
    .join(" AND ");

  const excludeParam =
    excludeIds.length > 0 ? addParam(excludeIds.map(Number).filter((id) => id > 0)) : null;
  const maxPriceParam =
    maxPrice !== undefined && maxPrice !== null && Number.isFinite(Number(maxPrice))
      ? addParam(Number(maxPrice))
      : null;

  const res = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.price,
      ${productImageSubquery} AS image,
      c.name AS "subcategoryName"
    FROM products p
    ${taxonomyJoin}
    WHERE p.is_active = TRUE
      AND p.id <> ${addParam(productId)}
      AND COALESCE(parent.slug, '') = ${addParam(FITTINGS_ROOT_SLUG)}
      AND c.slug = ${addParam(subcategorySlug)}
      AND ${matchSql}
      AND ${storefrontListedProductPredicatesSql}
      ${maxPriceParam ? `AND p.price <= ${maxPriceParam}` : ""}
      ${excludeParam ? `AND p.id <> ALL(${excludeParam}::bigint[])` : ""}
    ORDER BY p.id ASC
    LIMIT 1
    `,
    params,
  );

  return res.rows.map((row) => mapRelatedRow(row, group));
};

const isFittingsHandle = (taxonomy) =>
  taxonomy?.categorySlug === FITTINGS_ROOT_SLUG &&
  taxonomy?.subcategorySlug === HANDLES_SUBCATEGORY_SLUG;

const buildSlotMatchFields = (slot, codes, manufacturer, colorArticle, shade, rosette) => {
  const colorField =
    slot.colorMatch === "colorArticle"
      ? { code: codes.colorArticle, value: colorArticle }
      : { code: codes.shade, value: shade };

  const fields = [{ code: codes.manufacturer, value: manufacturer }, colorField];

  if (slot.requiresRosette) {
    fields.push({ code: codes.rosette, value: rosette });
  }

  if (slot.typeMatch) {
    const attrCode =
      slot.typeMatch.code === ATTR_CODES.lockType ? codes.lockType : codes.hingeType;
    fields.push({ code: attrCode, value: slot.typeMatch.value });
  }

  return fields;
};

/**
 * Сопутствующая фурнитура для ручек — фиксированный порядок слотов (см. RELATED_FITTING_SLOTS).
 */
const loadRelatedFittingsForHandle = async ({ productId, productAttrs, taxonomy, attrDefs }) => {
  if (!isFittingsHandle(taxonomy)) {
    return { items: [] };
  }

  const codes = resolveAttrCodes(attrDefs);
  const manufacturer = readAttrValue(productAttrs, codes.manufacturer);
  const colorArticle = readAttrValue(productAttrs, codes.colorArticle);
  const shade = readAttrValue(productAttrs, codes.shade);
  const rosette = readAttrValue(productAttrs, codes.rosette);

  if (!manufacturer) {
    return { items: [] };
  }

  const items = [];
  const excludeIds = [productId];

  for (const slot of RELATED_FITTING_SLOTS) {
    const matchFields = buildSlotMatchFields(
      slot,
      codes,
      manufacturer,
      colorArticle,
      shade,
      rosette,
    );
    const found = await fetchFirstInSubcategory({
      productId,
      subcategorySlug: slot.subcategorySlug,
      matchFields,
      excludeIds,
      group: slot.group,
      maxPrice: slot.maxPrice,
    });

    if (found.length > 0) {
      items.push(found[0]);
      excludeIds.push(found[0].id);
    }
  }

  return { items };
};

module.exports = {
  FITTINGS_ROOT_SLUG,
  HANDLES_SUBCATEGORY_SLUG,
  RELATED_FITTING_SLOTS,
  MAGNETIC_LATCH_LOCK_TYPE,
  FLUSH_HINGE_TYPE,
  BUTTERFLY_HINGE_TYPE,
  LIMITER_MAX_PRICE,
  loadRelatedFittingsForHandle,
  isFittingsHandle,
  buildSlotMatchFields,
  resolveAttrCodes,
};
