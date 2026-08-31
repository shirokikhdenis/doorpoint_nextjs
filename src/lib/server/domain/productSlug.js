const { query } = require("../db/postgres");
const { slugifyPart } = require("../../slugify-part");
const { isMeaningfulToken, stripTrailingStars } = require("../../product-display-name");

const parseAttrs = (raw) => {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const slugPartIfMeaningful = (value) => {
  const trimmed = stripTrailingStars(value);
  if (!isMeaningfulToken(trimmed)) return "";
  return slugifyPart(trimmed);
};

/** ЧПУ: имя + цвет + стекло (Да/Нет и прочий мусор в slug не попадают). */
const buildProductSlug = (name, attrs = {}) => {
  const parts = [slugifyPart(stripTrailingStars(name))];
  const colorPart = slugPartIfMeaningful(attrs.color);
  const glassPart = slugPartIfMeaningful(attrs.glass);
  if (colorPart) parts.push(colorPart);
  if (glassPart && glassPart !== colorPart) parts.push(glassPart);
  return parts.filter(Boolean).join("-");
};

const slugIncludesGlassPart = (slug, glassPart) => {
  const current = String(slug || "");
  if (!glassPart || !current) return false;
  if (current === glassPart) return true;
  if (current.endsWith(`-${glassPart}`)) return true;
  const escaped = glassPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`-${escaped}-\\d+$`).test(current);
};

const productNeedsGlassInSlug = (name, attrs, slug) => {
  const glassPart = slugPartIfMeaningful(parseAttrs(attrs).glass);
  if (!glassPart) return false;
  return !slugIncludesGlassPart(slug, glassPart);
};

const nextUniqueSlug = (base, used, fallback) => {
  const root = base || fallback;
  let slug = root;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${root}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
};

const allocateUniqueSlug = async (client, name, attrs, excludeId = null) => {
  const base = buildProductSlug(name, attrs) || `product-${Date.now()}`;
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.query(
      `
      SELECT id FROM products
      WHERE slug = $1 AND ($2::bigint IS NULL OR id <> $2)
      LIMIT 1
      `,
      [slug, excludeId],
    );
    if (res.rows.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
};

const backfillMissingProductSlugs = async () => {
  const rowsRes = await query(
    `
    SELECT id, name, attrs
    FROM products
    WHERE slug IS NULL OR BTRIM(slug) = ''
    ORDER BY id
    `,
  );
  if (rowsRes.rows.length === 0) return 0;

  const usedRes = await query(`SELECT slug FROM products WHERE slug IS NOT NULL AND BTRIM(slug) <> ''`);
  const used = new Set(usedRes.rows.map((row) => String(row.slug)));

  let updated = 0;
  for (const row of rowsRes.rows) {
    const slug = nextUniqueSlug(
      buildProductSlug(row.name, parseAttrs(row.attrs)),
      used,
      `product-${row.id}`,
    );
    await query(`UPDATE products SET slug = $2 WHERE id = $1`, [row.id, slug]);
    updated += 1;
  }
  return updated;
};

const recordSlugRedirect = async (oldSlug, productId, newSlug) => {
  const from = String(oldSlug || "").trim();
  const to = String(newSlug || "").trim();
  if (!from || !to || from === to) return;
  await query(`DELETE FROM product_slug_redirects WHERE old_slug = $1`, [to]);
  await query(
    `
    INSERT INTO product_slug_redirects (old_slug, product_id)
    VALUES ($1, $2)
    ON CONFLICT (old_slug) DO UPDATE SET product_id = EXCLUDED.product_id
    `,
    [from, productId],
  );
};

/** Пересобрать slug (латиница / цвет+стекло). Двухфазно, чтобы не бить UNIQUE. */
const rebuildAllProductSlugs = async () => {
  const rowsRes = await query(`SELECT id, name, attrs, slug FROM products ORDER BY id`);
  if (rowsRes.rows.length === 0) return 0;

  for (const row of rowsRes.rows) {
    await query(`UPDATE products SET slug = $2 WHERE id = $1`, [row.id, `tmp-${row.id}`]);
  }

  const used = new Set();
  let updated = 0;
  for (const row of rowsRes.rows) {
    const slug = nextUniqueSlug(
      buildProductSlug(row.name, parseAttrs(row.attrs)),
      used,
      `product-${row.id}`,
    );
    await query(`DELETE FROM product_slug_redirects WHERE old_slug = $1`, [slug]);
    await query(`UPDATE products SET slug = $2 WHERE id = $1`, [row.id, slug]);
    await recordSlugRedirect(row.slug, row.id, slug);
    updated += 1;
  }
  return updated;
};

const findRedirectProductId = async (oldSlug) => {
  const raw = String(oldSlug || "").trim();
  if (!raw) return null;
  const res = await query(
    `SELECT product_id AS id FROM product_slug_redirects WHERE old_slug = $1 LIMIT 1`,
    [raw],
  );
  const id = Number(res.rows[0]?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

module.exports = {
  slugifyPart,
  buildProductSlug,
  productNeedsGlassInSlug,
  allocateUniqueSlug,
  backfillMissingProductSlugs,
  rebuildAllProductSlugs,
  findRedirectProductId,
};
