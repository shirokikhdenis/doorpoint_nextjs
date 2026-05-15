const { query } = require("../src/lib/server/db/postgres");

async function main() {
  const stats = await query(`
    SELECT
      COUNT(*) FILTER (WHERE img_cnt = 0)::int AS no_images,
      COUNT(*) FILTER (WHERE img_cnt = 1)::int AS one_image,
      COUNT(*) FILTER (WHERE img_cnt >= 2)::int AS two_plus
    FROM (
      SELECT p.id, COUNT(pi.id)::int AS img_cnt
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE p.is_active = TRUE
        AND (
          COALESCE(parent.name, c.name) ILIKE '%входн%'
          OR c.name ILIKE '%входн%'
        )
      GROUP BY p.id
    ) t
  `);
  console.log("Входные двери (активные):", stats.rows[0]);

  const samples = await query(`
    SELECT p.id, p.sku, p.name, COUNT(pi.id)::int AS cnt
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND (
        COALESCE(parent.name, c.name) ILIKE '%входн%'
        OR c.name ILIKE '%входн%'
      )
    GROUP BY p.id
    HAVING COUNT(pi.id) <= 1
    ORDER BY p.id DESC
    LIMIT 15
  `);
  console.log("Примеры с 0–1 фото:", samples.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
