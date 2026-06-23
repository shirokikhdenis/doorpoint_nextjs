/**
 * Аудит подбора сопутствующей фурнитуры для всех ручек.
 * Usage: node scripts/audit-related-fittings-handles.js [output.csv]
 */
const fs = require("fs");
const path = require("path");
const { query } = require("../src/lib/server/db/postgres");
const attributeRepository = require("../src/lib/server/repositories/attributeRepository");
const { loadRelatedFittingsForHandle } = require("../src/lib/server/domain/fittingsRelated");
const { buildCsvContent } = require("../src/lib/server/domain/csvFormat");

const FITTINGS_ROOT_SLUG = "fittings";
const HANDLES_SUBCATEGORY_SLUG = "ручки";

const SLOT_COLUMNS = [
  { group: "magnetic_latch", header: "Магнитная защёлка" },
  { group: "fixator", header: "Фиксатор" },
  { group: "flush_hinge", header: "Петли врезные" },
  { group: "butterfly_hinge", header: "Петли бабочки" },
  { group: "limiter", header: "Ограничители" },
  { group: "shootbolt", header: "Шпингалеты" },
];

const HEADERS = ["Ручка", ...SLOT_COLUMNS.map((col) => col.header)];

const listHandles = async () => {
  const res = await query(
    `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.attrs
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND COALESCE(parent.slug, '') = $1
      AND c.slug = $2
    ORDER BY p.name ASC, p.id ASC
    `,
    [FITTINGS_ROOT_SLUG, HANDLES_SUBCATEGORY_SLUG],
  );
  return res.rows;
};

const itemNameByGroup = (items, group) => {
  const found = items.find((item) => item.group === group);
  return found?.name || "";
};

async function main() {
  const outputPath =
    process.argv[2] ||
    path.join(__dirname, "..", "tmp", "related-fittings-handles-audit.csv");

  const [handles, attrDefs] = await Promise.all([
    listHandles(),
    attributeRepository.listAttributes(),
  ]);

  const rows = [];
  for (const handle of handles) {
    const { items } = await loadRelatedFittingsForHandle({
      productId: Number(handle.id),
      productAttrs: handle.attrs || {},
      taxonomy: {
        categorySlug: FITTINGS_ROOT_SLUG,
        subcategorySlug: HANDLES_SUBCATEGORY_SLUG,
      },
      attrDefs,
    });

    const row = { Ручка: handle.name };
    for (const col of SLOT_COLUMNS) {
      row[col.header] = itemNameByGroup(items, col.group);
    }
    rows.push(row);
  }

  const csv = buildCsvContent(HEADERS, rows);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, "utf8");

  const filled = (header) => rows.filter((row) => String(row[header] || "").trim()).length;

  console.log(`Ручек в каталоге: ${rows.length}`);
  console.log(`CSV: ${outputPath}`);
  console.log("\nЗаполненность слотов:");
  for (const col of SLOT_COLUMNS) {
    console.log(`  ${col.header}: ${filled(col.header)}/${rows.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
