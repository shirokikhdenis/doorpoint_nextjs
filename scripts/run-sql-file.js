/**
 * Выполняет SQL-файл через DATABASE_URL из .env в корне проекта (без установки psql).
 * Usage (из папки test_nextjs): node scripts/run-sql-file.js scripts/add-attribute-is-visible-on-product.sql
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error("Usage: node scripts/run-sql-file.js <path-to.sql>");
    process.exit(1);
  }
  const sqlPath = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(sqlPath)) {
    console.error("File not found:", sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("OK:", path.basename(sqlPath));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
