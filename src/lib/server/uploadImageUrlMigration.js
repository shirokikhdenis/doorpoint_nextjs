const { query } = require("./db/postgres");

const IMAGE_URL_COLUMNS = [
  { table: "product_images", column: "image_url" },
  { table: "product_variants", column: "image_url" },
  { table: "catalog_page_labels", column: "image_url" },
  { table: "promotion_banners", column: "background_image_url" },
  { table: "portfolio_images", column: "image_url" },
  { table: "factory_cards", column: "image_url" },
  { table: "factory_cards", column: "logo_url" },
  { table: "collection_cards", column: "image_url" },
  { table: "door_finishes", column: "image_url" },
];

const replaceImageUrlInDb = async (oldUrl, newUrl) => {
  if (!oldUrl || !newUrl || oldUrl === newUrl) {
    return { updated: 0 };
  }

  let updated = 0;
  for (const { table, column } of IMAGE_URL_COLUMNS) {
    const result = await query(
      `UPDATE ${table}
       SET ${column} = $2
       WHERE ${column} = $1`,
      [oldUrl, newUrl],
    );
    updated += Number(result.rowCount) || 0;
  }

  return { updated };
};

module.exports = {
  IMAGE_URL_COLUMNS,
  replaceImageUrlInDb,
};
