const { query } = require("../src/lib/server/db/postgres");

async function main() {
  const r = await query(`
    SELECT p.sku, COUNT(pi.id)::int AS cnt,
           array_agg(pi.image_url ORDER BY pi.sort_order, pi.id) AS urls
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.sku ~ '^3010'
    GROUP BY p.id, p.sku
    ORDER BY p.sku
    LIMIT 20
  `);
  console.log(JSON.stringify(r.rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
