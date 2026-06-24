/**
 * Импорт каталога покрытий дверей из CSV.
 *
 * Формат (разделитель ;):
 * manufacturer;group_key;name;image_url;price_delta;sort_order
 *
 * Usage: node scripts/import-door-finishes.js path/to/finishes.csv
 */
const fs = require("fs");
const path = require("path");
const { importDoorFinishesFromRows } = require("../src/lib/server/services/doorFinishAdminService");
const { parseCsv } = require("../src/lib/server/domain/doorFinishCsv");

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/import-door-finishes.js <file.csv>");
    process.exit(1);
  }

  const absolutePath = path.resolve(inputPath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const rows = parseCsv(content);
  if (rows.length === 0) {
    console.error("CSV пустой или без строк данных");
    process.exit(1);
  }

  const result = await importDoorFinishesFromRows(rows);
  if (result.errors?.length) {
    result.errors.forEach((message) => console.warn(message));
  }
  console.log(`Импортировано покрытий: ${result.imported} из ${result.total}`);
  if (result.errors?.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
