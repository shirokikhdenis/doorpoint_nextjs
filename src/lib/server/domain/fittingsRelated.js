const { query } = require("../db/postgres");
const { normalizeAttrNameKey } = require("./attributeSemantics");

const FITTINGS_ROOT_SLUG = "fittings";
const HANDLES_SUBCATEGORY_SLUG = "ручки";
const FIXATORS_SUBCATEGORY_SLUG = "фиксаторы";
const LATCHES_SUBCATEGORY_SLUG = "защелки";
const HINGES_SUBCATEGORY_SLUG = "петли";

const ATTR_NAME_KEYS = {
  manufacturer: "производитель",
  colorArticle: "артикул цвета фурнитуры",
  rosette: "розетка",
};

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
    rosette: byName.get(ATTR_NAME_KEYS.rosette) || null,
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

const fetchRandomInSubcategory = async ({
  productId,
  subcategorySlug,
  matchFields,
  limit,
  excludeIds,
  group,
}) => {
  if (!limit || limit <= 0) return [];
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
      ${excludeParam ? `AND p.id <> ALL(${excludeParam}::bigint[])` : ""}
    ORDER BY RANDOM()
    LIMIT ${addParam(limit)}
    `,
    params,
  );

  return res.rows.map((row) => mapRelatedRow(row, group));
};

const isFittingsHandle = (taxonomy) =>
  taxonomy?.categorySlug === FITTINGS_ROOT_SLUG &&
  taxonomy?.subcategorySlug === HANDLES_SUBCATEGORY_SLUG;

/**
 * Сопутствующая фурнитура для ручек:
 * - 1 фиксатор (производитель + артикул цвета + розетка)
 * - 2 защелки (производитель + артикул цвета)
 * - 3 петли (производитель + артикул цвета)
 */
const loadRelatedFittingsForHandle = async ({ productId, productAttrs, taxonomy, attrDefs }) => {
  if (!isFittingsHandle(taxonomy)) {
    return { fixators: [], latches: [], hinges: [] };
  }

  const codes = resolveAttrCodes(attrDefs);
  const manufacturer = readAttrValue(productAttrs, codes.manufacturer);
  const colorArticle = readAttrValue(productAttrs, codes.colorArticle);
  const rosette = readAttrValue(productAttrs, codes.rosette);

  if (!manufacturer || !colorArticle) {
    return { fixators: [], latches: [], hinges: [] };
  }

  const baseMatch = [
    { code: codes.manufacturer, value: manufacturer },
    { code: codes.colorArticle, value: colorArticle },
  ];

  const excludeIds = [productId];

  const fixators = await fetchRandomInSubcategory({
    productId,
    subcategorySlug: FIXATORS_SUBCATEGORY_SLUG,
    matchFields: [...baseMatch, { code: codes.rosette, value: rosette }],
    limit: 1,
    excludeIds,
    group: "fixators",
  });
  excludeIds.push(...fixators.map((item) => item.id));

  const latches = await fetchRandomInSubcategory({
    productId,
    subcategorySlug: LATCHES_SUBCATEGORY_SLUG,
    matchFields: baseMatch,
    limit: 2,
    excludeIds,
    group: "latches",
  });
  excludeIds.push(...latches.map((item) => item.id));

  const hinges = await fetchRandomInSubcategory({
    productId,
    subcategorySlug: HINGES_SUBCATEGORY_SLUG,
    matchFields: baseMatch,
    limit: 3,
    excludeIds,
    group: "hinges",
  });

  return { fixators, latches, hinges };
};

module.exports = {
  FITTINGS_ROOT_SLUG,
  HANDLES_SUBCATEGORY_SLUG,
  loadRelatedFittingsForHandle,
  isFittingsHandle,
};
