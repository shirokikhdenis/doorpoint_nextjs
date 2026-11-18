const { query } = require("../db/postgres");

const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const POGONAZH_KOROBKA_SUBCATEGORY_SLUG = "коробки";
const POGONAZH_NALICHNIK_SUBCATEGORY_SLUG = "наличники";
const POGONAZH_DOBORY_SUBCATEGORY_SLUG = "доборы";
const KIT_PART_ATTR_CODE = "pogonazh_komplekt";
const KOROBKA_QTY = 2.5;
const NALICHNIK_QTY = 5;

const KIT_PART_TRUTHY = new Set(["да", "yes", "1", "true"]);

/** Маркеры длины в названии погонажа для высоты полотна (см). */
const LEAF_HEIGHT_KIT_MARKERS = {
  200: { korobka: ["2070"], nalichnik: ["2150"] },
  230: { korobka: ["2370"], nalichnik: ["2450"] },
};

const isKitPartAttrValue = (raw) => KIT_PART_TRUTHY.has(String(raw ?? "").trim().toLowerCase());

const isKitPartAttrs = (attrs) => isKitPartAttrValue(attrs?.[KIT_PART_ATTR_CODE]);

/** Нормализует высоту полотна к 200 или 230 для подбора комплекта. */
const normalizeKitLeafHeightCm = (raw) => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 200;
  if (value >= 225) return 230;
  return 200;
};

const nameHasMarker = (name, markers) => {
  const text = String(name || "");
  return (markers || []).some((marker) => text.includes(String(marker)));
};

/**
 * Выбор коробки/наличника под высоту полотна.
 * Если есть позиция с нужной длиной в названии (2070/2150 или 2370/2450) — берём её
 * (среди них приоритет у «часть комплекта»). Иначе — как раньше, по флагу комплекта.
 */
const pickKitPartForLeafHeight = (rows, { subcategorySlug, leafHeightCm }) => {
  const height = normalizeKitLeafHeightCm(leafHeightCm);
  const markers = LEAF_HEIGHT_KIT_MARKERS[height] || LEAF_HEIGHT_KIT_MARKERS[200];
  const needed =
    subcategorySlug === POGONAZH_KOROBKA_SUBCATEGORY_SLUG
      ? markers.korobka
      : markers.nalichnik;

  const inSubcategory = (rows || []).filter(
    (row) => String(row.subcategorySlug || "") === subcategorySlug,
  );
  if (inSubcategory.length === 0) return null;

  const withHeightMarker = inSubcategory.filter((row) => nameHasMarker(row.name, needed));
  const kitOnly = inSubcategory.filter((row) => row.isKitPart);
  const pool =
    withHeightMarker.length > 0
      ? withHeightMarker
      : kitOnly.length > 0
        ? kitOnly
        : inSubcategory;

  const ranked = [...pool].sort((a, b) => {
    const kitDiff = Number(Boolean(b.isKitPart)) - Number(Boolean(a.isKitPart));
    if (kitDiff !== 0) return kitDiff;
    return Number(a.id) - Number(b.id);
  });
  return ranked[0] || null;
};

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

const emptyKitPricing = () => ({
  available: false,
  korobkaQty: KOROBKA_QTY,
  nalichnikQty: NALICHNIK_QTY,
  korobka: null,
  nalichnik: null,
  leafHeightCm: null,
});

const buildKitPricingFromRows = (rows, leafHeightCm) => {
  const height = normalizeKitLeafHeightCm(leafHeightCm);
  const korobkaRow = pickKitPartForLeafHeight(rows, {
    subcategorySlug: POGONAZH_KOROBKA_SUBCATEGORY_SLUG,
    leafHeightCm: height,
  });
  const nalichnikRow = pickKitPartForLeafHeight(rows, {
    subcategorySlug: POGONAZH_NALICHNIK_SUBCATEGORY_SLUG,
    leafHeightCm: height,
  });

  if (!korobkaRow || !nalichnikRow) {
    return { ...emptyKitPricing(), leafHeightCm: height };
  }

  return {
    available: true,
    korobkaQty: KOROBKA_QTY,
    nalichnikQty: NALICHNIK_QTY,
    korobka: mapKitPartRow(korobkaRow),
    nalichnik: mapKitPartRow(nalichnikRow),
    leafHeightCm: height,
  };
};

const loadKitPartCandidateRows = async ({ pogonazhIds, excludeRootCategoryId }) => {
  if (!Array.isArray(pogonazhIds) || pogonazhIds.length === 0) {
    return [];
  }

  const res = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.price,
      c.slug AS "subcategorySlug",
      lower(trim(COALESCE(p.attrs->>'pogonazh_komplekt', ''))) = ANY($3::text[]) AS "isKitPart"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND c.slug = ANY($2::text[])
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
    [
      pogonazhIds,
      [POGONAZH_KOROBKA_SUBCATEGORY_SLUG, POGONAZH_NALICHNIK_SUBCATEGORY_SLUG],
      Array.from(KIT_PART_TRUTHY),
      excludeRootCategoryId,
    ],
  );

  return res.rows;
};

/**
 * Коробка и наличник для расчёта комплекта.
 * Учитывает высоту полотна: 200 → 2070/2150, 230 → 2370/2450.
 * Предпочитает позиции с флагом «часть комплекта».
 */
const loadInteriorKitParts = async ({
  pogonazhIds,
  excludeRootCategoryId,
  leafHeightCm = 200,
} = {}) => {
  const rows = await loadKitPartCandidateRows({ pogonazhIds, excludeRootCategoryId });
  if (rows.length === 0) {
    return emptyKitPricing();
  }
  return buildKitPricingFromRows(rows, leafHeightCm);
};

/**
 * Комплекты для высот 200 и 230 (если есть подходящий погонаж).
 */
const loadInteriorKitPartsByLeafHeight = async ({ pogonazhIds, excludeRootCategoryId } = {}) => {
  const rows = await loadKitPartCandidateRows({ pogonazhIds, excludeRootCategoryId });
  const byHeight = {
    200: buildKitPricingFromRows(rows, 200),
    230: buildKitPricingFromRows(rows, 230),
  };
  return byHeight;
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
  LEAF_HEIGHT_KIT_MARKERS,
  isKitPartAttrValue,
  isKitPartAttrs,
  normalizeKitLeafHeightCm,
  pickKitPartForLeafHeight,
  getPogonazhAccessorySortRank,
  buildPogonazhAccessoriesOrderSql,
  computeInteriorKitPrice,
  loadInteriorKitParts,
  loadInteriorKitPartsByLeafHeight,
};
