/**
 * Сводная таблица цен комплекта для всех межкомнатных дверей.
 * Методика подбора погонажа — loadInteriorKitParts (как на витрине).
 *
 * Usage: node scripts/export-interior-kit-prices.js [output.csv]
 */
const fs = require("fs");
const path = require("path");
const { query } = require("../src/lib/server/db/postgres");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
  computeInteriorKitPrice,
  loadInteriorKitParts,
} = require("../src/lib/server/domain/interiorKitPrice");
const { buildCsvContent } = require("../src/lib/server/domain/csvFormat");

const HEADERS = [
  "Модель",
  "Цена полотна",
  "Цена коробки",
  "Цена наличника",
  "Цена комплекта",
];

const parsePogonazhIdList = (raw) => {
  if (raw === undefined || raw === null) return [];
  const tokens = [];
  const visit = (value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    String(value)
      .split(/[\s,;]+/)
      .forEach((piece) => {
        const trimmed = piece.trim();
        if (trimmed) tokens.push(trimmed);
      });
  };
  visit(raw);
  return Array.from(new Set(tokens));
};

const ensureAttrs = (raw) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Math.round(Number(value));
  return Number.isFinite(num) ? String(num) : "";
};

const buildModelLabel = (row, attrs) => {
  const name = String(row.name || "").trim();
  const color = String(attrs.color ?? "").trim();
  if (!color || name.toLowerCase().includes(color.toLowerCase())) return name;
  return `${name} ${color}`;
};

const listInteriorDoors = async () => {
  const res = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.price,
      p.model_key,
      p.attrs,
      c.id AS "categoryId",
      parent.id AS "parentCategoryId"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND COALESCE(parent.slug, c.slug) = $1
    ORDER BY p.name ASC, p.id ASC
    `,
    [INTERIOR_DOORS_CATEGORY_SLUG],
  );
  return res.rows;
};

async function main() {
  const outputPath =
    process.argv[2] || path.join(__dirname, "..", "tmp", "interior-kit-prices.csv");

  const doors = await listInteriorDoors();
  const kitCache = new Map();
  const rows = [];

  for (const door of doors) {
    const attrs = ensureAttrs(door.attrs);
    const pogonazhIds = parsePogonazhIdList(attrs.pogonazh_id);
    const rootCategoryId = Number(door.parentCategoryId ?? door.categoryId) || null;
    const doorPrice = Number(door.price);

    let kitPricing = {
      available: false,
      korobka: null,
      nalichnik: null,
    };

    if (pogonazhIds.length > 0) {
      const cacheKey = `${[...pogonazhIds].sort().join("|")}:${rootCategoryId ?? ""}`;
      if (!kitCache.has(cacheKey)) {
        kitCache.set(
          cacheKey,
          await loadInteriorKitParts({
            pogonazhIds,
            excludeRootCategoryId: rootCategoryId,
          }),
        );
      }
      kitPricing = kitCache.get(cacheKey);
    }

    const kitPrice = computeInteriorKitPrice(doorPrice, kitPricing);

    rows.push({
      Модель: buildModelLabel(door, attrs),
      "Цена полотна": formatPrice(doorPrice),
      "Цена коробки": formatPrice(kitPricing.korobka?.price),
      "Цена наличника": formatPrice(kitPricing.nalichnik?.price),
      "Цена комплекта": formatPrice(kitPrice),
    });
  }

  const csv = buildCsvContent(HEADERS, rows);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, "utf8");

  const withKit = rows.filter((row) => String(row["Цена комплекта"] || "").trim()).length;
  console.log(`Межкомнатных дверей: ${rows.length}`);
  console.log(`С рассчитанным комплектом: ${withKit}`);
  console.log(`Без комплекта: ${rows.length - withKit}`);
  console.log(`CSV: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
