/**
 * Импорт квартирного конфигуратора Dorston из G:\\dev\\dorston_parser.
 *
 * Usage: node scripts/import-dorston-configurator.js [parserDir]
 */
const path = require("path");
const { importDorstonConfigurator } = require("../src/lib/server/services/configuratorImportService");
const repository = require("../src/lib/server/repositories/configuratorCatalogRepository");

async function main() {
  const parserDir =
    process.argv[2] || process.env.DORSTON_PARSER_DIR || "G:\\dev\\dorston_parser";
  const result = await importDorstonConfigurator({
    parserDir: path.resolve(parserDir),
    repository,
  });
  console.log("Импорт конфигуратора завершён:");
  console.log(`  модели: ${result.models}`);
  console.log(`  номенклатура: ${result.nomenclature}`);
  console.log(`  фурнитура: ${result.furniture}`);
  console.log(`  опции цены: ${result.priceOptions}`);
  console.log(`  композиты снаружи: ${result.composites.exterior}`);
  console.log(`  композиты внутри: ${result.composites.interior}`);
  if (result.metalHires != null) {
    console.log(`  металлические hires: ${result.metalHires}`);
  }
  if (result.layers) {
    console.log(`  наличники: ${result.layers.casing}`);
    console.log(`  наличники краска: ${result.layers.casingPaint}`);
    console.log(`  вставки наличника: ${result.layers.insert}`);
    console.log(`  вставки полотна: ${result.layers.leafInsert}`);
    console.log(`  схемы короба: ${result.layers.box}`);
    console.log(`  петли: ${result.layers.hinge}`);
    console.log(`  пороги: ${result.layers.threshold}`);
  }
  console.log(`  картинки: ${result.destRoot}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
