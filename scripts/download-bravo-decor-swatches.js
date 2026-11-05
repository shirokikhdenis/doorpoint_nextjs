/**
 * Скачивает пиктограммы цветов Браво из выгрузки dveri.com
 * (colors.picture → /storage/colors/small/…) в public/uploads/finishes/bravo.
 *
 * Usage:
 *   node scripts/download-bravo-decor-swatches.js
 *   node scripts/download-bravo-decor-swatches.js --force
 */
const {
  syncBravoDecorSwatches,
  PUBLIC_PREFIX,
} = require("../src/lib/server/services/bravoDecorSwatches");

const force = process.argv.includes("--force");

async function main() {
  console.log(`Скачивание декоров Браво → ${PUBLIC_PREFIX}${force ? " (force)" : ""}`);
  const result = await syncBravoDecorSwatches({
    force,
    onProgress: ({ index, total, key, status }) => {
      const label = status === "downloaded" ? "↓" : status === "reused" ? "=" : "!";
      console.log(`[${index}/${total}] ${label} ${key}`);
    },
  });

  console.log(
    `Готово: ${result.count} локальных (новых ${result.downloaded}, уже было ${result.reused}, ошибок ${result.failed})`,
  );
  if (result.errors?.length) {
    for (const message of result.errors.slice(0, 20)) console.warn(message);
    if (result.errors.length > 20) console.warn(`… и ещё ${result.errors.length - 20}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
