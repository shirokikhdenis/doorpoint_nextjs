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
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS show_catalog_manufacturer_tree BOOLEAN NOT NULL DEFAULT TRUE
  `);
  await query(
    `
    INSERT INTO storefront_settings (id, show_catalog_kit_price, show_catalog_manufacturer_tree)
    VALUES (1, $1, $2)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice,
      DEFAULT_STOREFRONT_SETTINGS.showCatalogManufacturerTree,
    ],
  );
  storefrontSettingsTableEnsured = true;
};

const getStorefrontSettings = async () => {
  await ensureStorefrontSettingsTable();
  const res = await query(
    `
    SELECT
      show_catalog_kit_price AS "showCatalogKitPrice",
      show_catalog_manufacturer_tree AS "showCatalogManufacturerTree"
    FROM storefront_settings
    WHERE id = 1
    LIMIT 1
    `,
  );
  return normalizeStorefrontSettings(res.rows[0] || DEFAULT_STOREFRONT_SETTINGS);
};

const updateStorefrontSettings = async (payload) => {
  await ensureStorefrontSettingsTable();
  const current = await getStorefrontSettings();
  const normalized = normalizeStorefrontSettings({ ...current, ...payload });
  const res = await query(
    `
    UPDATE storefront_settings
    SET
      show_catalog_kit_price = $1,
      show_catalog_manufacturer_tree = $2,
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      show_catalog_kit_price AS "showCatalogKitPrice",
      show_catalog_manufacturer_tree AS "showCatalogManufacturerTree"
    `,
    [normalized.showCatalogKitPrice, normalized.showCatalogManufacturerTree],
  );
  return normalizeStorefrontSettings(res.rows[0] || normalized);
};

module.exports = {
  ensureStorefrontSettingsTable,
  getStorefrontSettings,
  updateStorefrontSettings,
};
