const { query } = require("../db/postgres");
const {
  DEFAULT_HOME_PROMO_CARDS,
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
} = require("../domain/storefrontSettings");

let storefrontSettingsTableEnsured = false;

const SETTINGS_SELECT = `
      show_catalog_kit_price AS "showCatalogKitPrice",
      show_catalog_manufacturer_tree AS "showCatalogManufacturerTree",
      related_fittings_cards_per_row AS "relatedFittingsCardsPerRow",
      collection_doors_cards_per_row AS "collectionDoorsCardsPerRow",
      suggested_handles_cards_per_row AS "suggestedHandlesCardsPerRow",
      subcategory_doors_cards_per_row AS "subcategoryDoorsCardsPerRow",
      home_hits_cards_per_row AS "homeHitsCardsPerRow",
      home_portfolio_cards_per_row AS "homePortfolioCardsPerRow",
      factory_cards_per_row AS "factoryCardsPerRow",
      home_promo_cards AS "homePromoCards"
`;

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
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS related_fittings_cards_per_row INTEGER NOT NULL DEFAULT 6
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS collection_doors_cards_per_row INTEGER NOT NULL DEFAULT 4
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS suggested_handles_cards_per_row INTEGER NOT NULL DEFAULT 6
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS subcategory_doors_cards_per_row INTEGER NOT NULL DEFAULT 4
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS home_hits_cards_per_row INTEGER NOT NULL DEFAULT 4
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS home_portfolio_cards_per_row INTEGER NOT NULL DEFAULT 4
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS factory_cards_per_row INTEGER NOT NULL DEFAULT 2
  `);
  await query(`
    ALTER TABLE storefront_settings
    ADD COLUMN IF NOT EXISTS home_promo_cards JSONB
  `);
  await query(
    `
    UPDATE storefront_settings
    SET home_promo_cards = $1::jsonb
    WHERE home_promo_cards IS NULL
    `,
    [JSON.stringify(DEFAULT_HOME_PROMO_CARDS)],
  );
  await query(`
    ALTER TABLE storefront_settings
    ALTER COLUMN home_promo_cards SET DEFAULT $promo$${JSON.stringify(DEFAULT_HOME_PROMO_CARDS)}$promo$::jsonb
  `);
  await query(`
    ALTER TABLE storefront_settings
    ALTER COLUMN home_promo_cards SET NOT NULL
  `);
  await query(
    `
    INSERT INTO storefront_settings (
      id,
      show_catalog_kit_price,
      show_catalog_manufacturer_tree,
      related_fittings_cards_per_row,
      collection_doors_cards_per_row,
      suggested_handles_cards_per_row,
      subcategory_doors_cards_per_row,
      home_hits_cards_per_row,
      home_portfolio_cards_per_row,
      factory_cards_per_row,
      home_promo_cards
    )
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice,
      DEFAULT_STOREFRONT_SETTINGS.showCatalogManufacturerTree,
      DEFAULT_STOREFRONT_SETTINGS.relatedFittingsCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.collectionDoorsCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.suggestedHandlesCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.subcategoryDoorsCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.homeHitsCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.homePortfolioCardsPerRow,
      DEFAULT_STOREFRONT_SETTINGS.factoryCardsPerRow,
      JSON.stringify(DEFAULT_STOREFRONT_SETTINGS.homePromoCards),
    ],
  );
  storefrontSettingsTableEnsured = true;
};

const getStorefrontSettings = async () => {
  await ensureStorefrontSettingsTable();
  const res = await query(
    `
    SELECT
      ${SETTINGS_SELECT}
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
      related_fittings_cards_per_row = $3,
      collection_doors_cards_per_row = $4,
      suggested_handles_cards_per_row = $5,
      subcategory_doors_cards_per_row = $6,
      home_hits_cards_per_row = $7,
      home_portfolio_cards_per_row = $8,
      factory_cards_per_row = $9,
      home_promo_cards = $10::jsonb,
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      ${SETTINGS_SELECT}
    `,
    [
      normalized.showCatalogKitPrice,
      normalized.showCatalogManufacturerTree,
      normalized.relatedFittingsCardsPerRow,
      normalized.collectionDoorsCardsPerRow,
      normalized.suggestedHandlesCardsPerRow,
      normalized.subcategoryDoorsCardsPerRow,
      normalized.homeHitsCardsPerRow,
      normalized.homePortfolioCardsPerRow,
      normalized.factoryCardsPerRow,
      JSON.stringify(normalized.homePromoCards),
    ],
  );
  return normalizeStorefrontSettings(res.rows[0] || normalized);
};

module.exports = {
  ensureStorefrontSettingsTable,
  getStorefrontSettings,
  updateStorefrontSettings,
};
