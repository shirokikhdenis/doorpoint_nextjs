/**
 * Пересобрать склейки входных дверей из двух оригиналов в product_images.
 *
 * Usage: node scripts/rebuild-entry-door-merges.js
 */
const { rebuildEntryDoorMergedImages } = require("../src/lib/server/services/entryDoorMergeService");

async function main() {
  const summary = await rebuildEntryDoorMergedImages({
    onProgress: ({ index, total, sku }) => {
      process.stdout.write(`\r${index}/${total} ${sku}          `);
    },
  });
  process.stdout.write("\n");
  console.log(
    `Готово. Кандидатов: ${summary.total}, склеено: ${summary.merged}, пропущено: ${summary.skipped}, ошибок: ${summary.failed}`,
  );
  if (summary.errors.length > 0) {
    for (const message of summary.errors) {
      console.error(message);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
