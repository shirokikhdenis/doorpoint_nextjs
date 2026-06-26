const { query } = require("../db/postgres");

const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const POGONAZH_KOROBKA_SUBCATEGORY_SLUG = "коробки";
const POGONAZH_NALICHNIK_SUBCATEGORY_SLUG = "наличники";
const POGONAZH_DOBORY_SUBCATEGORY_SLUG = "доборы";
const KIT_PART_ATTR_CODE = "pogonazh_komplekt";
const KOROBKA_QTY = 2.5;
const NALICHNIK_QTY = 5;

const KIT_PART_TRUTHY = new Set(["да", "yes", "1", "true"]);

const isKitPartAttrValue = (raw) => KIT_PART_TRUTHY.has(String(raw ?? "").trim().toLowerCase());

const isKitPartAttrs = (attrs) => isKitPartAttrValue(attrs?.[KIT_PART_ATTR_CODE]);

/** Порядок строк в таблице «Погонаж» на карточке двери (0 — выше). */
const getPogonazhAccessorySortRank = (categorySlug, pogonazhKomplektRaw) => {
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  const isKitPart = isKitPartAttrValue(pogonazhKomplektRaw);
  if (slug === POGONAZH_KOROBKA_SUBCATEGORY_SLUG && isKitPart) return 0;
  if (slug === POGONAZH_NALICHNIK_SUBCATEGORY_SLUG && isKitPart) return 1;
  if (slug === POGONAZH_DOBORY_SUBCATEGORY_SLUG) return 2;
  return 3;
};

/** SQL ORDER BY для accessories: коробки (комплект) → наличники (комплект) → доборы → остальное. */
const buildPogonazhAccessoriesOrderSql = (kitPartParamIndex = 4) => `
  CASE
    WHEN lower(c.slug) = '${POGONAZH_KOROBKA_SUBCATEGORY_SLUG}'
      AND lower(trim(COALESCE(p.attrs->>'${KIT_PART_ATTR_CODE}', ''))) = ANY($${kitPartParamIndex}::text[])
      THEN 0
    WHEN lower(c.slug) = '${POGONAZH_NALICHNIK_SUBCATEGORY_SLUG}'
      AND lower(trim(COALESCE(p.attrs->>'${KIT_PART_ATTR_CODE}', ''))) = ANY($${kitPartParamIndex}::text[])
      THEN 1
    WHEN lower(c.slug) = '${POGONAZH_DOBORY_SUBCATEGORY_SLUG}' THEN 2
    ELSE 3
  END,
  p.name`;

/**
 * @param {number} doorPrice
 * @param {{ available: boolean, korobka?: { price: number }, nalichnik?: { price: number } }} kitPricing
 */
const computeInteriorKitPrice = (doorPrice, kitPricing) => {
  if (!kitPricing?.available || !kitPricing.korobka || !kitPricing.nalichnik) {
    return null;
  }
  const door = Math.round(Number(doorPrice));
  const korobka = Math.round(Number(kitPricing.korobka.price));
  const nalichnik = Math.round(Number(kitPricing.nalichnik.price));
  if (!Number.isFinite(door) || !Number.isFinite(korobka) || !Number.isFinite(nalichnik)) {
    return null;
  }
  return Math.round(door + KOROBKA_QTY * korobka + NALICHNIK_QTY * nalichnik);
};

const mapKitPartRow = (row) => ({
  id: Number(row.id),
  sku: String(row.sku || ""),
  name: String(row.name || ""),
  price: Number(row.price),
});

/**
 * Коробка и наличник для расчёта комплекта: подкатегория + pogonazh_komplekt + общий pogonazh_id.
 */
const loadInteriorKitParts = async ({ pogonazhIds, excludeRootCategoryId }) => {
  const empty = {
    available: false,
    korobkaQty: KOROBKA_QTY,
    nalichnikQty: NALICHNIK_QTY,
    korobka: null,
    nalichnik: null,
  };

  if (!Array.isArray(pogonazhIds) || pogonazhIds.length === 0) {
    return empty;
  }

  const res = await query(
    `
    SELECT DISTINCT ON (c.slug)
      p.id,
      p.sku,
      p.name,
      p.price,
      c.slug AS "subcategorySlug"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND c.slug = ANY($2::text[])
      AND lower(trim(COALESCE(p.attrs->>'pogonazh_komplekt', ''))) = ANY($3::text[])
      AND EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
          COALESCE(NULLIF(TRIM(p.attrs->>'pogonazh_id'), ''), ''),
          E'[\\\\s,;]+'
        ) AS token(value)
        WHERE token.value <> '' AND token.value = ANY($1::text[])
      )
      AND ($4::bigint IS NULL OR COALESCE(parent.id, c.id) <> $4::bigint)
    ORDER BY c.slug, p.id
    `,
    [pogonazhIds, [POGONAZH_KOROBKA_SUBCATEGORY_SLUG, POGONAZH_NALICHNIK_SUBCATEGORY_SLUG], Array.from(KIT_PART_TRUTHY), excludeRootCategoryId],
  );

  const korobkaRow = res.rows.find((row) => row.subcategorySlug === POGONAZH_KOROBKA_SUBCATEGORY_SLUG);
  const nalichnikRow = res.rows.find((row) => row.subcategorySlug === POGONAZH_NALICHNIK_SUBCATEGORY_SLUG);

  if (!korobkaRow || !nalichnikRow) {
    return empty;
  }

  return {
    available: true,
    korobkaQty: KOROBKA_QTY,
    nalichnikQty: NALICHNIK_QTY,
    korobka: mapKitPartRow(korobkaRow),
    nalichnik: mapKitPartRow(nalichnikRow),
  };
};

module.exports = {
  INTERIOR_DOORS_CATEGORY_SLUG,
  POGONAZH_KOROBKA_SUBCATEGORY_SLUG,
  POGONAZH_NALICHNIK_SUBCATEGORY_SLUG,
  POGONAZH_DOBORY_SUBCATEGORY_SLUG,
  KIT_PART_ATTR_CODE,
  KIT_PART_TRUTHY,
  KOROBKA_QTY,
  NALICHNIK_QTY,
  isKitPartAttrValue,
  isKitPartAttrs,
  getPogonazhAccessorySortRank,
  buildPogonazhAccessoriesOrderSql,
  computeInteriorKitPrice,
  loadInteriorKitParts,
};
