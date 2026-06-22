/**
 * Idempotent E2E seed: ≥25 products on vitrine "all", named anchors for Playwright.
 * Run after db:init — node scripts/seed-e2e-catalog.js
 */
const { loadEnv } = require("../src/lib/server/env");
const { getPool } = require("../src/lib/server/db/postgres");

const E2E_COUNT = 25;
const ALPHA_SKU = "E2E-PRODUCT-ALPHA";
const BETA_SKU = "E2E-PRODUCT-BETA";

const seedOneProduct = async (client, { sku, name, slug, categoryId, price, attrs, isOnSale }) => {
  const existing = await client.query(`SELECT id FROM products WHERE sku = $1`, [sku]);
  let productId;
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE products
       SET name = $2, slug = $3, category_id = $4, price = $5, attrs = $6::jsonb,
           is_on_sale = $7, is_active = TRUE
       WHERE sku = $1`,
      [sku, name, slug, categoryId, price, JSON.stringify(attrs), isOnSale],
    );
    productId = Number(existing.rows[0].id);
  } else {
    const res = await client.query(
      `INSERT INTO products(category_id, sku, name, slug, price, attrs, is_on_sale, is_active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, TRUE)
       RETURNING id`,
      [categoryId, sku, name, slug, price, JSON.stringify(attrs), isOnSale],
    );
    productId = Number(res.rows[0].id);
  }

  const imgCheck = await client.query(
    `SELECT 1 FROM product_images WHERE product_id = $1 LIMIT 1`,
    [productId],
  );
  if (imgCheck.rows.length === 0) {
    await client.query(
      `INSERT INTO product_images(product_id, image_url, sort_order) VALUES ($1, $2, 0)`,
      [productId, `https://picsum.photos/seed/${slug}/600/800`],
    );
  }
  return productId;
};

const main = async () => {
  loadEnv();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const catRes = await client.query(
      `SELECT id FROM categories WHERE slug = 'interior-classic' LIMIT 1`,
    );
    if (catRes.rows.length === 0) {
      throw new Error("Run npm run db:init first — taxonomy missing.");
    }
    const categoryId = Number(catRes.rows[0].id);

    await seedOneProduct(client, {
      sku: ALPHA_SKU,
      name: "E2E-PRODUCT-ALPHA",
      slug: "e2e-product-alpha",
      categoryId,
      price: 15000,
      attrs: { color: "E2E-Синий", manufacturer: "Браво", width: 700, height: 2000 },
      isOnSale: false,
    });

    await seedOneProduct(client, {
      sku: BETA_SKU,
      name: "E2E-PRODUCT-BETA",
      slug: "e2e-product-beta",
      categoryId,
      price: 16000,
      attrs: { color: "E2E-Зелёный", manufacturer: "Браво", width: 800, height: 2000 },
      isOnSale: true,
    });

    for (let i = 1; i <= E2E_COUNT; i += 1) {
      const sku = `E2E-BULK-${String(i).padStart(3, "0")}`;
      const slug = `e2e-bulk-${String(i).padStart(3, "0")}`;
      const color = i % 2 === 0 ? "E2E-Синий" : "E2E-Зелёный";
      await seedOneProduct(client, {
        sku,
        name: `E2E Bulk ${i}`,
        slug,
        categoryId,
        price: 10000 + i * 100,
        attrs: { color, manufacturer: "Браво", width: 700, height: 2000 },
        isOnSale: i % 5 === 0,
      });
    }

    await client.query("COMMIT");
    console.log(`E2E catalog seed OK: ${E2E_COUNT + 2} products (anchors: ${ALPHA_SKU}, ${BETA_SKU}).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
