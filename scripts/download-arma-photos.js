const { downloadArmaPhotosFromYandex } = require("../src/lib/server/services/armaPhotosService");

const main = async () => {
  process.stdout.write("Скачиваю фото Арма с Яндекс.Диска в public/uploads/arma-photos…\n");
  const result = await downloadArmaPhotosFromYandex({
    onProgress: ({ index, total, fileName }) => {
      process.stdout.write(`[${index + 1}/${total}] ${fileName}\n`);
    },
  });
  process.stdout.write(`Готово: ${result.saved} из ${result.total}\n`);
  if (result.errors.length > 0) {
    process.stderr.write(`${result.errors.length} ошибок:\n${result.errors.join("\n")}\n`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
