const { query } = require("../db/postgres");

const CYRILLIC_TO_LATIN = [
  ["щ", "sch"],
  ["ш", "sh"],
  ["ч", "ch"],
  ["ц", "ts"],
  ["ю", "yu"],
  ["я", "ya"],
  ["ё", "yo"],
  ["ж", "zh"],
  ["х", "kh"],
  ["ъ", ""],
  ["ь", ""],
  ["э", "e"],
  ["ы", "y"],
  ["а", "a"],
  ["б", "b"],
  ["в", "v"],
  ["г", "g"],
  ["д", "d"],
  ["е", "e"],
  ["з", "z"],
  ["и", "i"],
  ["й", "y"],
  ["к", "k"],
  ["л", "l"],
  ["м", "m"],
  ["н", "n"],
  ["о", "o"],
  ["п", "p"],
  ["р", "r"],
  ["с", "s"],
  ["т", "t"],
  ["у", "u"],
  ["ф", "f"],
];

const transliterateCyrillic = (value) => {
  let out = String(value || "").toLowerCase().replace(/ё/g, "е");
  for (const [from, to] of CYRILLIC_TO_LATIN) {
    out = out.split(from).join(to);
  }
  return out;
};

const slugifyPart = (value) =>
  transliterateCyrillic(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** ЧПУ вида `bravo-22-snow-art` из названия и attrs (цвет / стекло). */
const buildProductSlug = (name, attrs = {}) => {
  const parts = [slugifyPart(name)];
  const color = String(attrs.color ?? "").trim();
  const glass = String(attrs.glass ?? "").trim();
  if (color) parts.push(slugifyPart(color));
  else if (glass) parts.push(slugifyPart(glass));
  return parts.filter(Boolean).join("-");
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
    const attrs =
      row.attrs && typeof row.attrs === "object"
        ? row.attrs
        : typeof row.attrs === "string"
          ? JSON.parse(row.attrs)
          : {};
    let base = buildProductSlug(row.name, attrs) || `product-${row.id}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    await query(`UPDATE products SET slug = $2 WHERE id = $1`, [row.id, slug]);
    updated += 1;
  }
  return updated;
};

/** Пересобрать slug в латинице (одноразово после смены правил slugify). */
const rebuildAllProductSlugs = async () => {
  const rowsRes = await query(`SELECT id, name, attrs FROM products ORDER BY id`);
  if (rowsRes.rows.length === 0) return 0;

  const used = new Set();
  let updated = 0;
  for (const row of rowsRes.rows) {
    const attrs =
      row.attrs && typeof row.attrs === "object"
        ? row.attrs
        : typeof row.attrs === "string"
          ? JSON.parse(row.attrs)
          : {};
    let base = buildProductSlug(row.name, attrs) || `product-${row.id}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    await query(`UPDATE products SET slug = $2 WHERE id = $1`, [row.id, slug]);
    updated += 1;
  }
  return updated;
};

module.exports = {
  slugifyPart,
  buildProductSlug,
  allocateUniqueSlug,
  backfillMissingProductSlugs,
  rebuildAllProductSlugs,
};
