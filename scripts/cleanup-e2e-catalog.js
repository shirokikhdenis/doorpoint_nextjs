/**
 * Удаляет товары E2E-seed (SKU E2E-*) из БД.
 * Демо/реальные товары не трогает.
 */
const { loadEnv } = require("../src/lib/server/env");
const { getPool } = require("../src/lib/server/db/postgres");

const main = async () => {
  loadEnv();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const res = await client.query(
      `DELETE FROM products WHERE sku LIKE 'E2E-%' RETURNING id, sku, name`,
    );
    const rows = res.rows;
    if (rows.length === 0) {
      await client.query("COMMIT");
      console.log("E2E-товаров не найдено — нечего удалять.");
      return;
    }
    await client.query("COMMIT");
    console.log(`Удалено E2E-товаров: ${rows.length}`);
    for (const row of rows) {
      console.log(`  - ${row.sku} (${row.name})`);
    }
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
