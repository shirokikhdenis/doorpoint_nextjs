/**
 * Sync retail prices for Bravo interior-door size variants from dveri.com.
 * Formula: round(priceDealerFinal / 100 * 180)
 *
 * Scope: manufacturer «Браво», root category interior-doors only
 * (fittings / погонаж / entry-doors are skipped).
 *
 * Usage:
 *   node scripts/sync-bravo-interior-size-prices-from-dveri.js --dry-run
 *   node scripts/sync-bravo-interior-size-prices-from-dveri.js
 */
const { query, withTransaction } = require("../src/lib/server/db/postgres");
const { getCatalog } = require("../src/lib/server/services/dveriCatalogService");
const { INTERIOR_DOORS_CATEGORY_SLUG } = require("../src/lib/server/domain/interiorKitPrice");

const BRAVO_MANUFACTURER = "браво";
const RETAIL_FROM_DEALER = (dealer) => {
  const n = Number(dealer);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / 100) * 180);
};

const parseArgs = (argv) => ({
  dryRun: argv.includes("--dry-run"),
});

const parseSizeParts = (raw) => {
  const text = String(raw || "").trim().toLowerCase().replace(/,/g, ".");
  const match = text.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return { height: match[1], width: match[2] };
};

const pickDefaultVariant = (variants) => {
  const scored = variants
    .map((row) => {
      const parts = parseSizeParts(row.size);
      const height = parts ? Number(parts.height) : NaN;
      const width = parts ? Number(parts.width) : NaN;
      let score = 0;
      if (height === 200) score += 1000;
      else if (Number.isFinite(height)) score += Math.max(0, 500 - Math.abs(height - 200));
      if (width === 60) score += 50;
      else if (Number.isFinite(width)) score += Math.max(0, 40 - Math.abs(width - 60));
      return { row, score };
    })
    .sort((a, b) => b.score - a.score || a.row.id - b.row.id);
  return scored[0]?.row || null;
};

const buildDealerRetailMap = (products) => {
  const map = new Map();
  for (const product of products || []) {
    const baseCode = String(product.vendorCode || "").trim();
    const baseRetail = RETAIL_FROM_DEALER(product.priceDealerFinal ?? product.priceDealer);
    if (baseCode && baseRetail != null) map.set(baseCode, baseRetail);

    for (const option of product.options || []) {
      const code = String(option.vendorCode || "").trim();
      const retail = RETAIL_FROM_DEALER(option.priceDealerFinal ?? option.priceDealer);
      if (code && retail != null) map.set(code, retail);
    }
  }
  return map;
};

const loadBravoInteriorTargets = async () => {
  const result = await query(
    `
    WITH RECURSIVE tree AS (
      SELECT id, slug, parent_id, slug AS root_slug
      FROM categories
      WHERE parent_id IS NULL
      UNION ALL
      SELECT c.id, c.slug, c.parent_id, t.root_slug
      FROM categories c
      JOIN tree t ON c.parent_id = t.id
    )
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.price AS product_price,
      p.attrs AS product_attrs,
      v.id AS variant_id,
      v.sku AS variant_sku,
      v.price AS variant_price,
      v.attrs->>'size' AS size,
      NULLIF(TRIM(v.attrs->>'manufacturer_id'), '') AS manufacturer_id
    FROM products p
    JOIN tree t ON t.id = p.category_id
    JOIN product_variants v ON v.product_id = p.id
    WHERE t.root_slug = $1
      AND lower(TRIM(COALESCE(p.attrs->>'manufacturer', ''))) = $2
      AND NULLIF(TRIM(v.attrs->>'manufacturer_id'), '') IS NOT NULL
    ORDER BY p.id, v.id
    `,
    [INTERIOR_DOORS_CATEGORY_SLUG, BRAVO_MANUFACTURER],
  );
  return result.rows;
};

const main = async () => {
  const { dryRun } = parseArgs(process.argv.slice(2));
  console.log(
    dryRun
      ? "Dry-run: Bravo interior-door size prices from dveri (/100*180)"
      : "Applying: Bravo interior-door size prices from dveri (/100*180)",
  );

  const catalogRes = await getCatalog({ refresh: true });
  if (!catalogRes.ok) {
    throw new Error(catalogRes.message || catalogRes.error || "dveri catalog failed");
  }
  const retailByVendor = buildDealerRetailMap(catalogRes.data.products);
  console.log(`dveri vendor codes with retail: ${retailByVendor.size}`);

  const rows = await loadBravoInteriorTargets();
  console.log(`Bravo interior variants with manufacturer_id: ${rows.length}`);

  const byProduct = new Map();
  const variantUpdates = [];
  let missingVendor = 0;
  let unchangedVariants = 0;

  for (const row of rows) {
    const list = byProduct.get(row.product_id) || [];
    list.push(row);
    byProduct.set(row.product_id, list);

    const expected = retailByVendor.get(String(row.manufacturer_id));
    if (expected == null) {
      missingVendor += 1;
      continue;
    }
    const current = row.variant_price == null ? null : Number(row.variant_price);
    if (current === expected) {
      unchangedVariants += 1;
      continue;
    }
    variantUpdates.push({
      variantId: Number(row.variant_id),
      productId: Number(row.product_id),
      productName: row.product_name,
      size: row.size,
      manufacturerId: row.manufacturer_id,
      from: current,
      to: expected,
    });
  }

  const productUpdates = [];
  for (const [productId, variants] of byProduct.entries()) {
    const priced = variants
      .map((row) => {
        const expected = retailByVendor.get(String(row.manufacturer_id));
        return {
          id: Number(row.variant_id),
          size: row.size,
          price: expected != null ? expected : Number(row.variant_price),
          manufacturerId: row.manufacturer_id,
          productName: row.product_name,
          productPrice: Number(row.product_price),
          productAttrs: row.product_attrs,
        };
      })
      .filter((row) => Number.isFinite(row.price) && row.price > 0);

    if (priced.length === 0) continue;
    const preferred = pickDefaultVariant(priced);
    if (!preferred) continue;

    const attrs =
      preferred.productAttrs && typeof preferred.productAttrs === "object"
        ? { ...preferred.productAttrs }
        : {};
    const parts = parseSizeParts(preferred.size);
    const nextHeight = parts?.height || null;
    const heightChanged = nextHeight != null && String(attrs.height ?? "") !== String(nextHeight);
    const priceChanged = Number(preferred.productPrice) !== Number(preferred.price);

    if (!priceChanged && !heightChanged) continue;

    productUpdates.push({
      productId: Number(productId),
      productName: preferred.productName,
      fromPrice: Number(preferred.productPrice),
      toPrice: Number(preferred.price),
      fromHeight: attrs.height ?? null,
      toHeight: nextHeight,
      defaultSize: preferred.size,
      attrs,
      heightChanged,
      priceChanged,
    });
  }

  console.log(`variant price updates: ${variantUpdates.length}`);
  console.log(`product shelf price/height updates: ${productUpdates.length}`);
  console.log(`variants already matching: ${unchangedVariants}`);
  console.log(`variants without dveri vendor: ${missingVendor}`);

  const sample = variantUpdates.slice(0, 12);
  if (sample.length) {
    console.log("sample variant updates:");
    for (const item of sample) {
      console.log(
        `  #${item.productId} ${item.productName} ${item.size || "?"} ${item.manufacturerId}: ${item.from} -> ${item.to}`,
      );
    }
  }

  if (dryRun) {
    console.log("Dry-run complete. No DB writes.");
    return;
  }

  await withTransaction(async (client) => {
    for (const item of variantUpdates) {
      await client.query(`UPDATE product_variants SET price = $2 WHERE id = $1`, [
        item.variantId,
        item.to,
      ]);
    }

    for (const item of productUpdates) {
      const nextAttrs = { ...item.attrs };
      if (item.toHeight != null) nextAttrs.height = item.toHeight;
      await client.query(`UPDATE products SET price = $2, attrs = $3::jsonb WHERE id = $1`, [
        item.productId,
        item.toPrice,
        JSON.stringify(nextAttrs),
      ]);
    }
  });

  console.log(
    `Done. Updated variants=${variantUpdates.length}, products=${productUpdates.length}.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
