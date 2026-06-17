/**
 * Аудит погонажа у межкомнатных дверей (одна карточка на model_key + name).
 * Usage: node scripts/check-pogonazh-coverage.js
 */
const path = require("path");
const fs = require("fs");
const { query } = require("../src/lib/server/db/postgres");

const SQL_PATH = path.join(__dirname, "check-pogonazh-coverage.sql");

const splitQueries = (sql) =>
  sql
    .split(/^-- -{10,}/m)
    .map((block) => block.replace(/^--[^\n]*\n/gm, "").trim())
    .filter((q) => q.length > 0 && /^\s*WITH\b|^\s*SELECT\b/im.test(q));

async function main() {
  const sql = fs.readFileSync(SQL_PATH, "utf8");
  const queries = splitQueries(sql);

  const [withPogonazh, withoutPogonazh, summary] = queries;

  console.log("=== Межкомнатные двери с pogonazh_id (N коробок / M наличников) ===\n");
  const rows = await query(withPogonazh);
  if (rows.rows.length === 0) {
    console.log("(нет строк)\n");
  } else {
    for (const row of rows.rows) {
      console.log(
        `#${row.door_id} ${row.door_sku} — ${row.door_name}` +
          (row.model_key ? ` [model: ${row.model_key}]` : "") +
          `\n  pogonazh_id: ${row.pogonazh_id}` +
          `\n  коробок: ${row.korobka_count}, наличников: ${row.nalichnik_count}`,
      );
      if (row.korobka_count === 0 || row.nalichnik_count === 0) {
        console.log("  ⚠ неполный комплект");
      }
    }
    console.log(`\nВсего моделей с pogonazh_id: ${rows.rows.length}\n`);
  }

  console.log("=== Двери БЕЗ pogonazh_id ===\n");
  const noId = await query(withoutPogonazh);
  if (noId.rows.length === 0) {
    console.log("(нет строк)\n");
  } else {
    for (const row of noId.rows) {
      console.log(
        `#${row.door_id} ${row.door_sku} — ${row.door_name}` +
          (row.model_key ? ` [model: ${row.model_key}]` : ""),
      );
    }
    console.log(`\nВсего моделей без pogonazh_id: ${noId.rows.length}\n`);
  }

  console.log("=== Сводка ===\n");
  const sum = await query(summary);
  console.table(sum.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
