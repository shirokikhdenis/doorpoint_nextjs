const { query, withTransaction } = require("../db/postgres");
const { ensureHomeFactoryLogoTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  id: Number(row.id),
  manufacturerName: String(row.manufacturerName || ""),
  sortOrder: Number(row.sortOrder) || 0,
  isVisible: row.isVisible !== false,
});

const listAll = async () => {
  await ensureHomeFactoryLogoTables();
  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      sort_order AS "sortOrder",
      is_visible AS "isVisible"
    FROM home_factory_logos
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const listVisible = async () => {
  await ensureHomeFactoryLogoTables();
  const res = await query(
    `
    SELECT
      id,
      manufacturer_name AS "manufacturerName",
      sort_order AS "sortOrder",
      is_visible AS "isVisible"
    FROM home_factory_logos
    WHERE is_visible = TRUE
    ORDER BY sort_order ASC, id ASC
    `,
  );
  return res.rows.map(mapRow);
};

const replaceAll = async (entries) => {
  await ensureHomeFactoryLogoTables();
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM home_factory_logos`);
    if (entries.length === 0) return [];

    const inserted = [];
    for (const entry of entries) {
      const res = await client.query(
        `
        INSERT INTO home_factory_logos (manufacturer_name, sort_order, is_visible)
        VALUES ($1, $2, $3)
        RETURNING
          id,
          manufacturer_name AS "manufacturerName",
          sort_order AS "sortOrder",
          is_visible AS "isVisible"
        `,
        [entry.manufacturerName, entry.sortOrder, entry.isVisible === true],
      );
      inserted.push(mapRow(res.rows[0]));
    }
    return inserted;
  });
};

module.exports = {
  listAll,
  listVisible,
  replaceAll,
};
