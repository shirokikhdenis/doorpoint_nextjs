import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fittingsRelated = require("@/lib/server/domain/fittingsRelated") as {
  FITTINGS_ROOT_SLUG: string;
  HANDLES_SUBCATEGORY_SLUG: string;
  RELATED_FITTING_SLOTS: Array<{
    group: string;
    subcategorySlug: string;
    colorMatch?: "shade" | "colorArticle";
    requiresRosette?: boolean;
    maxPrice?: number;
    typeMatch?: { code: string; value: string };
  }>;
  LIMITER_MAX_PRICE: number;
  resolveAttrCodes: (
    attrDefs: Array<{ name: string; code: string }>,
  ) => Record<string, string | null>;
};
const attributeRepository = require("@/lib/server/repositories/attributeRepository") as {
  listAttributes: () => Promise<Array<{ name: string; code: string }>>;
};
const { query } = require("@/lib/server/db/postgres") as {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

const SLOT_LABELS: Record<string, string> = {
  magnetic_latch: "Магнитная защёлка",
  fixator: "Фиксатор",
  flush_hinge: "Петли врезные",
  butterfly_hinge: "Петли бабочки",
  limiter: "Ограничители",
  shootbolt: "Шпингалеты",
};

const ATTR_FIELD_LABELS: Record<string, string> = {
  manufacturer: "Производитель",
  colorArticle: "Артикул цвета фурнитуры",
  shade: "Оттенок",
  rosette: "Розетка",
  lockType: "LOCK_TYPE",
  hingeType: "HINGE_TYPE",
};

const ATTR_FIELD_FALLBACK_CODES: Record<string, string> = {
  manufacturer: "manufacturer",
  shade: "ottenok",
  lockType: "LOCK_TYPE",
  hingeType: "HINGE_TYPE",
};

export type RelatedFittingsSlotRow = {
  order: number;
  group: string;
  label: string;
  subcategorySlug: string;
  matchWithHandle: string[];
  productCriteria: string[];
  selectionNote: string;
};

export type RelatedFittingsResolvedAttr = {
  field: string;
  label: string;
  code: string;
  source: "database" | "fallback" | "missing";
};

export type RelatedFittingsAdminSnapshot = {
  sourceFile: string;
  trigger: {
    categorySlug: string;
    subcategorySlug: string;
    requiredFields: string[];
    blockVisibleWhen: string;
  };
  slots: RelatedFittingsSlotRow[];
  resolvedAttributes: RelatedFittingsResolvedAttr[];
  selection: {
    ordering: string;
    storefrontRequirements: string[];
    deduplication: string;
  };
  stats: {
    activeHandles: number;
    handlesWithManufacturer: number;
    listedHandles: number;
    subcategoryCounts: Array<{ subcategorySlug: string; label: string; activeListed: number }>;
  };
};

const buildMatchWithHandle = (
  slot: (typeof fittingsRelated.RELATED_FITTING_SLOTS)[number],
): string[] => {
  const fields = ["Производитель"];
  if (slot.colorMatch === "colorArticle") {
    fields.push("Артикул цвета фурнитуры");
  } else {
    fields.push("Оттенок");
  }
  if (slot.requiresRosette) fields.push("Розетка");
  return fields;
};

const buildProductCriteria = (
  slot: (typeof fittingsRelated.RELATED_FITTING_SLOTS)[number],
): string[] => {
  const criteria: string[] = [`Подкатегория: ${slot.subcategorySlug}`];
  if (slot.typeMatch) {
    criteria.push(`${slot.typeMatch.code} = «${slot.typeMatch.value}»`);
  }
  if (slot.maxPrice !== undefined && slot.maxPrice !== null) {
    criteria.push(`Цена ≤ ${slot.maxPrice} ₽`);
  }
  criteria.push("Товар активен, есть фото на витрине");
  return criteria;
};

const resolveAttributeRows = (
  codes: Record<string, string | null>,
): RelatedFittingsResolvedAttr[] => {
  const fields = ["manufacturer", "colorArticle", "shade", "rosette", "lockType", "hingeType"] as const;

  return fields.map((field) => {
    const code = codes[field];
    const fallback = ATTR_FIELD_FALLBACK_CODES[field];
    let source: RelatedFittingsResolvedAttr["source"] = "missing";
    if (code) {
      source = fallback && code === fallback ? "fallback" : "database";
    }
    return {
      field,
      label: ATTR_FIELD_LABELS[field] || field,
      code: code || "—",
      source,
    };
  });
};

const loadStats = async (
  manufacturerCode: string,
): Promise<RelatedFittingsAdminSnapshot["stats"]> => {
  const subcategorySlugs = [
    ...new Set(fittingsRelated.RELATED_FITTING_SLOTS.map((slot) => slot.subcategorySlug)),
  ];

  const handlesRes = await query(
    `
    SELECT
      COUNT(*)::int AS "activeHandles",
      COUNT(*) FILTER (
        WHERE NULLIF(BTRIM(COALESCE(p.attrs->>$3, '')), '') IS NOT NULL
      )::int AS "handlesWithManufacturer",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM product_images pi
          WHERE pi.product_id = p.id
            AND NULLIF(BTRIM(pi.image_url), '') IS NOT NULL
        )
      )::int AS "listedHandles"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND COALESCE(parent.slug, '') = $1
      AND c.slug = $2
    `,
    [
      fittingsRelated.FITTINGS_ROOT_SLUG,
      fittingsRelated.HANDLES_SUBCATEGORY_SLUG,
      manufacturerCode,
    ],
  );

  const subRes = await query(
    `
    SELECT
      c.slug AS "subcategorySlug",
      COUNT(*)::int AS "activeListed"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND COALESCE(parent.slug, '') = $1
      AND c.slug = ANY($2::text[])
      AND EXISTS (
        SELECT 1 FROM product_images pi
        WHERE pi.product_id = p.id
          AND NULLIF(BTRIM(pi.image_url), '') IS NOT NULL
      )
    GROUP BY c.slug
    ORDER BY c.slug ASC
    `,
    [fittingsRelated.FITTINGS_ROOT_SLUG, subcategorySlugs],
  );

  const countBySlug = new Map(
    subRes.rows.map((row) => [String(row.subcategorySlug), Number(row.activeListed) || 0]),
  );

  return {
    activeHandles: Number(handlesRes.rows[0]?.activeHandles) || 0,
    handlesWithManufacturer: Number(handlesRes.rows[0]?.handlesWithManufacturer) || 0,
    listedHandles: Number(handlesRes.rows[0]?.listedHandles) || 0,
    subcategoryCounts: subcategorySlugs.map((subcategorySlug) => {
      const usedInSlots = fittingsRelated.RELATED_FITTING_SLOTS.filter(
        (slot) => slot.subcategorySlug === subcategorySlug,
      )
        .map((slot) => SLOT_LABELS[slot.group] || slot.group)
        .join(", ");

      return {
        subcategorySlug,
        label: usedInSlots || subcategorySlug,
        activeListed: countBySlug.get(subcategorySlug) || 0,
      };
    }),
  };
};

export const getRelatedFittingsAdminSnapshot = async (): Promise<RelatedFittingsAdminSnapshot> => {
  const attrDefs = await attributeRepository.listAttributes();
  const resolvedCodes = fittingsRelated.resolveAttrCodes(attrDefs);

  const slots = fittingsRelated.RELATED_FITTING_SLOTS.map((slot, index) => ({
    order: index + 1,
    group: slot.group,
    label: SLOT_LABELS[slot.group] || slot.group,
    subcategorySlug: slot.subcategorySlug,
    matchWithHandle: buildMatchWithHandle(slot),
    productCriteria: buildProductCriteria(slot),
    selectionNote: "Первый товар по id (детерминированно), без случайной выборки",
  }));

  const stats = await loadStats(resolvedCodes.manufacturer || "manufacturer");

  return {
    sourceFile: "src/lib/server/domain/fittingsRelated.js",
    trigger: {
      categorySlug: fittingsRelated.FITTINGS_ROOT_SLUG,
      subcategorySlug: fittingsRelated.HANDLES_SUBCATEGORY_SLUG,
      requiredFields: ["Производитель (для запуска подбора)"],
      blockVisibleWhen: "Подбор вернул хотя бы один товар",
    },
    slots,
    resolvedAttributes: resolveAttributeRows(resolvedCodes),
    selection: {
      ordering: "ORDER BY p.id ASC, LIMIT 1 на слот",
      storefrontRequirements: [
        "Товар активен (is_active = true)",
        "Есть хотя бы одно фото в product_images",
      ],
      deduplication: "Один товар не повторяется в разных слотах одной карточки",
    },
    stats,
  };
};
