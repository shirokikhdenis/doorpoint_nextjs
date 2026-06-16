const { query } = require("../db/postgres");
const {
  DEFAULT_SALE_SETTINGS,
  normalizeSaleSettings,
} = require("../domain/salePricing");

let saleSettingsTableEnsured = false;

const ensureSaleSettingsTable = async () => {
  if (saleSettingsTableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS sale_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      mode TEXT NOT NULL DEFAULT 'minus_percent',
      percent INTEGER NOT NULL DEFAULT 10,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO sale_settings (id, mode, percent)
    VALUES (1, $1, $2)
    ON CONFLICT (id) DO NOTHING
  `, [DEFAULT_SALE_SETTINGS.mode, DEFAULT_SALE_SETTINGS.percent]);
  saleSettingsTableEnsured = true;
};

const getSaleSettings = async () => {
  await ensureSaleSettingsTable();
  const res = await query(
    `SELECT mode, percent FROM sale_settings WHERE id = 1 LIMIT 1`,
  );
  return normalizeSaleSettings(res.rows[0] || DEFAULT_SALE_SETTINGS);
};

const updateSaleSettings = async (payload) => {
  await ensureSaleSettingsTable();
  const normalized = normalizeSaleSettings(payload);
  const res = await query(
    `
    UPDATE sale_settings
    SET mode = $1, percent = $2, updated_at = NOW()
    WHERE id = 1
    RETURNING mode, percent
    `,
    [normalized.mode, normalized.percent],
  );
  return normalizeSaleSettings(res.rows[0] || normalized);
};

module.exports = {
  ensureSaleSettingsTable,
  getSaleSettings,
  updateSaleSettings,
};
