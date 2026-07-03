const { createHash } = require("node:crypto");
const { query } = require("../db/postgres");
const { ensureVkSyncTables } = require("../db/schemaPatches");
const vkApiClient = require("../vk/vkApiClient");

const buildScopeKey = (product) => {
  const cat = String(product.category || "").trim();
  const sub = String(product.subcategory || "").trim();
  if (sub && cat) return `sub:${cat}>>>${sub}`;
  if (cat) return `cat:${cat}`;
  return "all";
};

const buildAlbumTitle = (product) => {
  const sub = String(product.subcategory || "").trim();
  const cat = String(product.category || "").trim();
  if (sub && cat) return `${cat} / ${sub}`;
  return sub || cat || "Каталог";
};

const getAlbumMappingByScope = async (scopeKey) => {
  await ensureVkSyncTables();
  const res = await query(
    `SELECT scope_key AS "scopeKey", title, vk_album_id AS "vkAlbumId"
     FROM vk_album_mappings WHERE scope_key = $1 LIMIT 1`,
    [scopeKey],
  );
  return res.rows[0] || null;
};

const saveAlbumMapping = async ({ scopeKey, title, vkAlbumId }) => {
  await ensureVkSyncTables();
  const res = await query(
    `
    INSERT INTO vk_album_mappings(scope_key, title, vk_album_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (scope_key) DO UPDATE SET
      title = EXCLUDED.title,
      vk_album_id = EXCLUDED.vk_album_id,
      updated_at = NOW()
    RETURNING scope_key AS "scopeKey", title, vk_album_id AS "vkAlbumId"
    `,
    [scopeKey, title, vkAlbumId],
  );
  return res.rows[0];
};

const getProductSync = async (productId) => {
  await ensureVkSyncTables();
  const res = await query(
    `
    SELECT
      product_id AS "productId",
      vk_item_id AS "vkItemId",
      vk_album_id AS "vkAlbumId",
      vk_photo_id AS "vkPhotoId",
      payload_hash AS "payloadHash",
      status,
      last_error AS "lastError",
      synced_at AS "syncedAt"
    FROM vk_product_sync
    WHERE product_id = $1
  `,
    [productId],
  );
  return res.rows[0] || null;
};

const upsertProductSync = async ({
  productId,
  vkItemId = null,
  vkAlbumId = null,
  vkPhotoId = null,
  payloadHash = null,
  status,
  lastError = null,
}) => {
  await ensureVkSyncTables();
  const res = await query(
    `
    INSERT INTO vk_product_sync(
      product_id, vk_item_id, vk_album_id, vk_photo_id, payload_hash, status, last_error, synced_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $6 = 'synced' THEN NOW() ELSE NULL END)
    ON CONFLICT (product_id) DO UPDATE SET
      vk_item_id = COALESCE(EXCLUDED.vk_item_id, vk_product_sync.vk_item_id),
      vk_album_id = COALESCE(EXCLUDED.vk_album_id, vk_product_sync.vk_album_id),
      vk_photo_id = COALESCE(EXCLUDED.vk_photo_id, vk_product_sync.vk_photo_id),
      payload_hash = COALESCE(EXCLUDED.payload_hash, vk_product_sync.payload_hash),
      status = EXCLUDED.status,
      last_error = EXCLUDED.last_error,
      synced_at = CASE WHEN EXCLUDED.status = 'synced' THEN NOW() ELSE vk_product_sync.synced_at END,
      updated_at = NOW()
    RETURNING
      product_id AS "productId",
      vk_item_id AS "vkItemId",
      vk_album_id AS "vkAlbumId",
      vk_photo_id AS "vkPhotoId",
      payload_hash AS "payloadHash",
      status,
      last_error AS "lastError",
      synced_at AS "syncedAt"
    `,
    [productId, vkItemId, vkAlbumId, vkPhotoId, payloadHash, status, lastError],
  );
  return res.rows[0];
};

const ensureAlbumForProduct = async (product, albumCache) => {
  const scopeKey = buildScopeKey(product);
  const title = buildAlbumTitle(product);

  if (albumCache.has(scopeKey)) {
    return albumCache.get(scopeKey);
  }

  const existing = await getAlbumMappingByScope(scopeKey);
  if (existing) {
    albumCache.set(scopeKey, Number(existing.vkAlbumId));
    return Number(existing.vkAlbumId);
  }

  const albums = await vkApiClient.listAlbums();
  const matched = albums.find(
    (album) => String(album.title || "").trim().toLowerCase() === title.toLowerCase(),
  );
  const vkAlbumId = matched ? Number(matched.id) : await vkApiClient.createAlbum(title);

  await saveAlbumMapping({ scopeKey, title, vkAlbumId });
  albumCache.set(scopeKey, vkAlbumId);
  return vkAlbumId;
};

const hashPayload = (payload) =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const createSyncRun = async ({
  operationId,
  scope,
  dryRun = false,
  filters = {},
}) => {
  await ensureVkSyncTables();
  const res = await query(
    `
    INSERT INTO vk_sync_runs(operation_id, scope, dry_run, filters, status)
    VALUES ($1, $2, $3, $4::jsonb, 'running')
    RETURNING
      id,
      operation_id AS "operationId",
      scope,
      dry_run AS "dryRun",
      filters,
      status,
      started_at AS "startedAt"
    `,
    [operationId, scope, dryRun, JSON.stringify(filters)],
  );
  return res.rows[0];
};

const finishSyncRun = async (operationId, result) => {
  await ensureVkSyncTables();
  const res = await query(
    `
    UPDATE vk_sync_runs
    SET
      total = $2,
      exportable = $3,
      created_count = $4,
      updated_count = $5,
      skipped_unchanged = $6,
      skipped_inactive = $7,
      skipped_no_image = $8,
      failed_count = $9,
      status = $10,
      errors = $11::jsonb,
      finished_at = NOW()
    WHERE operation_id = $1
    RETURNING
      id,
      operation_id AS "operationId",
      scope,
      dry_run AS "dryRun",
      filters,
      total,
      exportable,
      created_count AS "created",
      updated_count AS "updated",
      skipped_unchanged AS "skippedUnchanged",
      skipped_inactive AS "skippedInactive",
      skipped_no_image AS "skippedNoImage",
      failed_count AS "failed",
      status,
      errors,
      started_at AS "startedAt",
      finished_at AS "finishedAt"
    `,
    [
      operationId,
      Number(result.total) || 0,
      Number(result.exportable) || 0,
      Number(result.created) || 0,
      Number(result.updated) || 0,
      Number(result.skippedUnchanged) || 0,
      Number(result.skippedInactive) || 0,
      Number(result.skippedNoImage) || 0,
      Number(result.failed) || 0,
      result.failed > 0 ? "completed_with_errors" : "completed",
      JSON.stringify(Array.isArray(result.errors) ? result.errors : []),
    ],
  );
  return res.rows[0] || null;
};

const mapSyncRunRow = (row) => ({
  id: Number(row.id),
  operationId: row.operationId,
  scope: row.scope,
  dryRun: row.dryRun === true,
  filters: row.filters || {},
  total: Number(row.total) || 0,
  exportable: Number(row.exportable) || 0,
  created: Number(row.created ?? row.created_count) || 0,
  updated: Number(row.updated ?? row.updated_count) || 0,
  skippedUnchanged: Number(row.skippedUnchanged ?? row.skipped_unchanged) || 0,
  skippedInactive: Number(row.skippedInactive ?? row.skipped_inactive) || 0,
  skippedNoImage: Number(row.skippedNoImage ?? row.skipped_no_image) || 0,
  failed: Number(row.failed ?? row.failed_count) || 0,
  status: row.status,
  errors: Array.isArray(row.errors) ? row.errors : [],
  startedAt: row.startedAt,
  finishedAt: row.finishedAt || null,
});

const getLatestSyncRun = async () => {
  await ensureVkSyncTables();
  const res = await query(
    `
    SELECT
      id,
      operation_id AS "operationId",
      scope,
      dry_run AS "dryRun",
      filters,
      total,
      exportable,
      created_count,
      updated_count,
      skipped_unchanged,
      skipped_inactive,
      skipped_no_image,
      failed_count,
      status,
      errors,
      started_at AS "startedAt",
      finished_at AS "finishedAt"
    FROM vk_sync_runs
    ORDER BY started_at DESC
    LIMIT 1
    `,
  );
  return res.rows[0] ? mapSyncRunRow(res.rows[0]) : null;
};

const listSyncRuns = async ({ limit = 20, offset = 0 } = {}) => {
  await ensureVkSyncTables();
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const res = await query(
    `
    SELECT
      id,
      operation_id AS "operationId",
      scope,
      dry_run AS "dryRun",
      filters,
      total,
      exportable,
      created_count,
      updated_count,
      skipped_unchanged,
      skipped_inactive,
      skipped_no_image,
      failed_count,
      status,
      errors,
      started_at AS "startedAt",
      finished_at AS "finishedAt"
    FROM vk_sync_runs
    ORDER BY started_at DESC
    LIMIT $1 OFFSET $2
    `,
    [safeLimit, safeOffset],
  );
  const countRes = await query(`SELECT COUNT(*)::int AS total FROM vk_sync_runs`);
  return {
    items: res.rows.map(mapSyncRunRow),
    total: countRes.rows[0]?.total || 0,
    limit: safeLimit,
    offset: safeOffset,
  };
};

const listFailedProductSyncs = async ({ limit = 100 } = {}) => {
  await ensureVkSyncTables();
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  const res = await query(
    `
    SELECT
      s.product_id AS "productId",
      p.sku,
      p.name AS "productName",
      s.vk_item_id AS "vkItemId",
      s.status,
      s.last_error AS "lastError",
      s.synced_at AS "syncedAt",
      s.updated_at AS "updatedAt"
    FROM vk_product_sync s
    JOIN products p ON p.id = s.product_id
    WHERE s.status = 'failed'
    ORDER BY s.updated_at DESC
    LIMIT $1
    `,
    [safeLimit],
  );
  return res.rows.map((row) => ({
    productId: Number(row.productId),
    sku: row.sku,
    productName: row.productName,
    vkItemId: row.vkItemId ? Number(row.vkItemId) : null,
    status: row.status,
    lastError: row.lastError || null,
    syncedAt: row.syncedAt || null,
    updatedAt: row.updatedAt,
  }));
};

const getSyncStats = async () => {
  await ensureVkSyncTables();
  const res = await query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'synced')::int AS synced,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*)::int AS total
    FROM vk_product_sync
    `,
  );
  return {
    synced: res.rows[0]?.synced || 0,
    failed: res.rows[0]?.failed || 0,
    total: res.rows[0]?.total || 0,
  };
};

module.exports = {
  buildScopeKey,
  buildAlbumTitle,
  getAlbumMappingByScope,
  saveAlbumMapping,
  getProductSync,
  upsertProductSync,
  ensureAlbumForProduct,
  hashPayload,
  createSyncRun,
  finishSyncRun,
  getLatestSyncRun,
  listSyncRuns,
  listFailedProductSyncs,
  getSyncStats,
};
