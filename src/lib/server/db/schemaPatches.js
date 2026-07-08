const { query } = require("./postgres");
const { backfillMissingProductSlugs, rebuildAllProductSlugs } = require("../domain/productSlug");

let productBadgesColumnEnsured = false;
let productSaleColumnsEnsured = false;
let productSlugColumnEnsured = false;
let productSlugLatinEnsured = false;
let portfolioTablesEnsured = false;
let promotionTablesEnsured = false;
let leadTablesEnsured = false;
let servicesTablesEnsured = false;
let seoColumnsEnsured = false;
let catalogPageFilterDefaultsEnsured = false;
let catalogPageSlugRenamesEnsured = false;
let factoryStorefrontTablesEnsured = false;
let doorFinishTablesEnsured = false;
let doorOptionModuleTablesEnsured = false;
let homeProductSectionTablesEnsured = false;
let testimonialTablesEnsured = false;
let homeFactoryLogoTablesEnsured = false;
let vkSyncTablesEnsured = false;
let vkSyncTablesEnsurePromise = null;
let manufacturerIdAttributeEnsured = false;

const ensureManufacturerIdAttribute = async () => {
  if (manufacturerIdAttributeEnsured) return;
  const maxOrderRes = await query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM attribute_definitions`,
  );
  const sortOrder = Number(maxOrderRes.rows[0]?.max_order || 0) + 10;
  await query(
    `
    INSERT INTO attribute_definitions(
      code, name, type, unit, options, scope, is_filterable, is_visible_on_product, sort_order
    )
    VALUES ($1, $2, $3, $4, '[]'::jsonb, $5, FALSE, FALSE, $6)
    ON CONFLICT (code) DO NOTHING
    `,
    ["manufacturer_id", "ID у производителя", "text", null, "variant", sortOrder],
  );
  await query(
    `
    UPDATE attribute_definitions
    SET
      scope = 'variant',
      is_filterable = FALSE,
      is_visible_on_product = FALSE,
      name = 'ID у производителя'
    WHERE code = 'manufacturer_id'
    `,
  );
  manufacturerIdAttributeEnsured = true;
};

const CATALOG_PAGE_SLUG_RENAMES = [
  ["entry-doors", "vhodnye-dveri"],
  ["thermal-break-doors", "termo-dveri"],
  ["interior-doors", "dveri-mezhkomnatnyye"],
  ["fittings", "furnitura"],
];

const ensureProductBadgesColumn = async () => {
  if (productBadgesColumnEnsured) return;
  await query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}'::text[]
  `);
  productBadgesColumnEnsured = true;
};

const ensureProductSaleColumns = async () => {
  if (productSaleColumnsEnsured) return;
  await query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price INTEGER`);
  productSaleColumnsEnsured = true;
};

const ensurePromotionTables = async () => {
  if (promotionTablesEnsured) return;
  await ensureProductSaleColumns();
  await query(`
    CREATE TABLE IF NOT EXISTS promotion_banners (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      background_image_url TEXT NOT NULL,
      catalog_page_slug TEXT NOT NULL DEFAULT 'all',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_promotion_banners_active_sort
    ON promotion_banners(is_active, sort_order)
  `);
  await query(`ALTER TABLE promotion_banners ADD COLUMN IF NOT EXISTS filter_manufacturer TEXT`);
  await query(`ALTER TABLE promotion_banners ADD COLUMN IF NOT EXISTS filter_collection TEXT`);
  promotionTablesEnsured = true;
};

const ensureProductSlugColumn = async () => {
  if (productSlugColumnEnsured) return;
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT`);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique
    ON products(slug)
    WHERE slug IS NOT NULL AND BTRIM(slug) <> ''
  `);
  await backfillMissingProductSlugs();
  productSlugColumnEnsured = true;
};

const ensureLatinProductSlugs = async () => {
  if (productSlugLatinEnsured) return;
  await ensureProductSlugColumn();
  const check = await query(`SELECT id FROM products WHERE slug ~ '[а-яёА-ЯЁ]' LIMIT 1`);
  if (check.rows.length > 0) {
    await rebuildAllProductSlugs();
  }
  productSlugLatinEnsured = true;
};

const ensurePortfolioTables = async () => {
  if (portfolioTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS portfolio_projects (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS portfolio_images (
      id BIGSERIAL PRIMARY KEY,
      project_id BIGINT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(project_id, image_url)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_portfolio_images_project_id
    ON portfolio_images(project_id)
  `);
  portfolioTablesEnsured = true;
};

const ensureTestimonialTables = async () => {
  if (testimonialTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id BIGSERIAL PRIMARY KEY,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  testimonialTablesEnsured = true;
};

const ensureHomeFactoryLogoTables = async () => {
  if (homeFactoryLogoTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS home_factory_logos (
      id BIGSERIAL PRIMARY KEY,
      manufacturer_name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_home_factory_logos_sort
    ON home_factory_logos(is_visible, sort_order, id)
  `);
  homeFactoryLogoTablesEnsured = true;
};

const ensureLeadTables = async () => {
  if (leadTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'admin_order',
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      contract_number TEXT NOT NULL DEFAULT '',
      contract_date DATE,
      total_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      manager_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS lead_items (
      id BIGSERIAL PRIMARY KEY,
      lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      product_id INTEGER,
      name TEXT NOT NULL DEFAULT '',
      sku TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_leads_created_at
    ON leads(created_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_leads_status
    ON leads(status)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_lead_items_lead_id
    ON lead_items(lead_id)
  `);
  await query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS discount_kind TEXT NOT NULL DEFAULT 'none'
  `);
  await query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS discount_value INTEGER NOT NULL DEFAULT 0
  `);
  await query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS client_comment TEXT NOT NULL DEFAULT ''
  `);
  await query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS source_page TEXT NOT NULL DEFAULT ''
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_leads_type_created_at
    ON leads(type, created_at DESC)
  `);
  await query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS delivery_days INTEGER
  `);
  leadTablesEnsured = true;
};

const saleSettingsRepository = require("../repositories/saleSettingsRepository");

let saleSettingsTableEnsured = false;
const ensureSaleSettingsTable = async () => {
  if (saleSettingsTableEnsured) return;
  await saleSettingsRepository.ensureSaleSettingsTable();
  saleSettingsTableEnsured = true;
};

const ensureServicesTables = async () => {
  if (servicesTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS service_sections (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS service_rows (
      id BIGSERIAL PRIMARY KEY,
      section_id BIGINT NOT NULL REFERENCES service_sections(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_service_rows_section_id
    ON service_rows(section_id)
  `);
  servicesTablesEnsured = true;
};

const ensureSeoColumns = async () => {
  if (seoColumnsEnsured) return;
  await query(`ALTER TABLE catalog_pages ADD COLUMN IF NOT EXISTS seo_title TEXT`);
  await query(`ALTER TABLE catalog_pages ADD COLUMN IF NOT EXISTS seo_description TEXT`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT`);
  await query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT`);
  seoColumnsEnsured = true;
};

const ensureCatalogPageFilterDefaultsColumn = async () => {
  if (catalogPageFilterDefaultsEnsured) return;
  await ensureSeoColumns();
  await query(`
    ALTER TABLE catalog_pages
    ADD COLUMN IF NOT EXISTS collapsed_filter_sections TEXT[]
  `);
  catalogPageFilterDefaultsEnsured = true;
};

const ensureCatalogPageSlugRenames = async () => {
  if (catalogPageSlugRenamesEnsured) return;
  for (const [oldSlug, newSlug] of CATALOG_PAGE_SLUG_RENAMES) {
    await query(`UPDATE catalog_pages SET slug = $1 WHERE slug = $2`, [newSlug, oldSlug]);
    await query(
      `UPDATE promotion_banners SET catalog_page_slug = $1 WHERE catalog_page_slug = $2`,
      [newSlug, oldSlug],
    );
  }
  catalogPageSlugRenamesEnsured = true;
};

const ensureFactoryStorefrontTables = async () => {
  if (factoryStorefrontTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS factory_cards (
      id BIGSERIAL PRIMARY KEY,
      section_id TEXT NOT NULL,
      manufacturer_name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(section_id, manufacturer_name)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_factory_cards_section_sort
    ON factory_cards(section_id, sort_order, id)
  `);
  await query(`
    ALTER TABLE factory_cards
    ADD COLUMN IF NOT EXISTS logo_url TEXT
  `);
  await query(`
    ALTER TABLE factory_cards
    ADD COLUMN IF NOT EXISTS badge_label TEXT
  `);
  await query(`
    ALTER TABLE factory_cards
    ADD COLUMN IF NOT EXISTS link_target TEXT NOT NULL DEFAULT 'collections'
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS collection_cards (
      id BIGSERIAL PRIMARY KEY,
      section_id TEXT NOT NULL,
      manufacturer_name TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT 'описание',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(section_id, manufacturer_name, collection_name)
    )
  `);
  await query(`
    ALTER TABLE collection_cards
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT 'описание'
  `);
  await query(`
    UPDATE collection_cards
    SET description = 'описание'
    WHERE description IS NULL OR BTRIM(description) = ''
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_collection_cards_scope_sort
    ON collection_cards(section_id, manufacturer_name, sort_order, id)
  `);
  factoryStorefrontTablesEnsured = true;
};

const ensureDoorFinishTables = async () => {
  if (doorFinishTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS door_finishes (
      id BIGSERIAL PRIMARY KEY,
      manufacturer_name TEXT NOT NULL,
      group_key TEXT NOT NULL DEFAULT 'other',
      name TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      price_delta INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(manufacturer_name, name)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_door_finishes_manufacturer_active_sort
    ON door_finishes(manufacturer_name, is_active, sort_order, id)
  `);
  doorFinishTablesEnsured = true;
};

const ensureDoorOptionModuleTables = async () => {
  if (doorOptionModuleTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS door_hardware_services (
      id BIGSERIAL PRIMARY KEY,
      manufacturer_name TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(manufacturer_name, code)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_door_hardware_services_manufacturer_active_sort
    ON door_hardware_services(manufacturer_name, is_active, sort_order, id)
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS door_glass_options (
      id BIGSERIAL PRIMARY KEY,
      manufacturer_name TEXT NOT NULL,
      parent_sku TEXT NOT NULL,
      glass_name TEXT NOT NULL,
      price_delta INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(manufacturer_name, parent_sku, glass_name)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_door_glass_options_parent_sku
    ON door_glass_options(manufacturer_name, parent_sku, is_active, sort_order, id)
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS door_manufacturer_modules (
      manufacturer_name TEXT PRIMARY KEY,
      finish_picker_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      hardware_services_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      glass_options_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    INSERT INTO door_manufacturer_modules(
      manufacturer_name,
      finish_picker_enabled,
      hardware_services_enabled,
      glass_options_enabled
    )
    VALUES ('Аэлита', TRUE, FALSE, FALSE)
    ON CONFLICT (manufacturer_name) DO NOTHING
  `);
  doorOptionModuleTablesEnsured = true;
};

const ensureHomeProductSectionTables = async () => {
  if (homeProductSectionTablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS home_product_sections (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      catalog_page_slug TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      product_limit INTEGER NOT NULL DEFAULT 8,
      filters JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_home_product_sections_active_sort
    ON home_product_sections(is_active, sort_order, id)
  `);
  homeProductSectionTablesEnsured = true;
};

const ensureVkSyncTables = async () => {
  if (vkSyncTablesEnsured) return;
  if (!vkSyncTablesEnsurePromise) {
    vkSyncTablesEnsurePromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS vk_album_mappings (
          id BIGSERIAL PRIMARY KEY,
          scope_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          vk_album_id BIGINT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS vk_product_sync (
          product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
          vk_item_id BIGINT,
          vk_album_id BIGINT,
          vk_photo_id BIGINT,
          payload_hash TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          last_error TEXT,
          synced_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_vk_product_sync_status
        ON vk_product_sync(status, updated_at DESC)
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS vk_sync_runs (
          id BIGSERIAL PRIMARY KEY,
          operation_id UUID NOT NULL UNIQUE,
          scope TEXT NOT NULL DEFAULT 'filtered',
          dry_run BOOLEAN NOT NULL DEFAULT FALSE,
          filters JSONB NOT NULL DEFAULT '{}'::jsonb,
          total INTEGER NOT NULL DEFAULT 0,
          exportable INTEGER NOT NULL DEFAULT 0,
          created_count INTEGER NOT NULL DEFAULT 0,
          updated_count INTEGER NOT NULL DEFAULT 0,
          skipped_unchanged INTEGER NOT NULL DEFAULT 0,
          skipped_inactive INTEGER NOT NULL DEFAULT 0,
          skipped_no_image INTEGER NOT NULL DEFAULT 0,
          failed_count INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'running',
          errors JSONB NOT NULL DEFAULT '[]'::jsonb,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          finished_at TIMESTAMPTZ
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_vk_sync_runs_started_at
        ON vk_sync_runs(started_at DESC)
      `);
      vkSyncTablesEnsured = true;
    })().catch((error) => {
      vkSyncTablesEnsurePromise = null;
      throw error;
    });
  }
  await vkSyncTablesEnsurePromise;
};

module.exports = {
  CATALOG_PAGE_SLUG_RENAMES,
  ensureProductBadgesColumn,
  ensureProductSaleColumns,
  ensureProductSlugColumn,
  ensureLatinProductSlugs,
  ensurePortfolioTables,
  ensurePromotionTables,
  ensureLeadTables,
  ensureSaleSettingsTable,
  ensureServicesTables,
  ensureSeoColumns,
  ensureCatalogPageFilterDefaultsColumn,
  ensureCatalogPageSlugRenames,
  ensureFactoryStorefrontTables,
  ensureDoorFinishTables,
  ensureDoorOptionModuleTables,
  ensureHomeProductSectionTables,
  ensureTestimonialTables,
  ensureHomeFactoryLogoTables,
  ensureVkSyncTables,
  ensureManufacturerIdAttribute,
};
