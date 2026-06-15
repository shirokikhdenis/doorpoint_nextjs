const { query } = require("./postgres");
const { backfillMissingProductSlugs, rebuildAllProductSlugs } = require("../domain/productSlug");

let productBadgesColumnEnsured = false;
let productSlugColumnEnsured = false;
let productSlugLatinEnsured = false;
let portfolioTablesEnsured = false;

const ensureProductBadgesColumn = async () => {
  if (productBadgesColumnEnsured) return;
  await query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}'::text[]
  `);
  productBadgesColumnEnsured = true;
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

module.exports = {
  ensureProductBadgesColumn,
  ensureProductSlugColumn,
  ensureLatinProductSlugs,
  ensurePortfolioTables,
};
