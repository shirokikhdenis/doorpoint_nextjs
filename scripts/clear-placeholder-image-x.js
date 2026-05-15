/**
 * Убирает заглушку «X» в URL фото: в product_images строки удаляются
 * (в таблице image_url NOT NULL; пустое значение многим строкам дало бы конфликт UNIQUE).
 * У product_variants поле может быть NULL.
 */
const { query } = require("../src/lib/server/db/postgres");

async function main() {
  const img = await query(
    `DELETE FROM product_images WHERE upper(trim(image_url)) = $1 RETURNING id, product_id`,
    ["X"],
  );
  const vars = await query(
    `UPDATE product_variants
     SET image_url = NULL
     WHERE image_url IS NOT NULL AND upper(trim(image_url)) = $1
     RETURNING id, product_id`,
    ["X"],
  );
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        product_images_deleted: img.rowCount,
        product_variants_cleared: vars.rowCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
