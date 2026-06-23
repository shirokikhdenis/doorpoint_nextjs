const { query } = require("../db/postgres");
const {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
} = require("../domain/storefrontSettings");

let storefrontSettingsTableEnsured = false;

const ensureStorefrontSettingsTable = async () => {
  if (storefrontSettingsTableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS storefront_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      show_catalog_kit_price BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `
    INSERT INTO storefront_settings (id, show_catalog_kit_price)
    VALUES (1, $1)
    ON CONFLICT (id) DO NOTHING
    `,
    [DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice],
  );
  storefrontSettingsTableEnsured = true;
};

const getStorefrontSettings = async () => {
  await ensureStorefrontSettingsTable();
  const res = await query(
    `
    SELECT show_catalog_kit_price AS "showCatalogKitPrice"
    FROM storefront_settings
    WHERE id = 1
    LIMIT 1
    `,
  );
  return normalizeStorefrontSettings(res.rows[0] || DEFAULT_STOREFRONT_SETTINGS);
};

const updateStorefrontSettings = async (payload) => {
  await ensureStorefrontSettingsTable();
  const normalized = normalizeStorefrontSettings(payload);
  const res = await query(
    `
    UPDATE storefront_settings
    SET show_catalog_kit_price = $1, updated_at = NOW()
    WHERE id = 1
    RETURNING show_catalog_kit_price AS "showCatalogKitPrice"
    `,
    [normalized.showCatalogKitPrice],
  );
  return normalizeStorefrontSettings(res.rows[0] || normalized);
};

module.exports = {
  ensureStorefrontSettingsTable,
  getStorefrontSettings,
  updateStorefrontSettings,
};
