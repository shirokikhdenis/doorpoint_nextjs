const { randomUUID } = require("node:crypto");
const productRepository = require("../repositories/productRepository");
const vkSyncRepository = require("../repositories/vkSyncRepository");
const { parseExportQuery } = require("../services/csvExportService");
const { isVkConfigured, assertVkConfigured } = require("../vk/vkConfig");
const vkApiClient = require("../vk/vkApiClient");
const {
  buildMarketPayload,
  buildPayloadFingerprint,
  resolveAbsoluteUrl,
} = require("../vk/vkPayloadBuilder");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickExportableProducts = (products, siteUrl) =>
  products.filter((product) => {
    if (product.isActive === false) return false;
    const image =
      (Array.isArray(product.imageUrls) && product.imageUrls.find(Boolean)) ||
      product.primaryImageUrl ||
      "";
    return Boolean(resolveAbsoluteUrl(image, siteUrl));
  });

const exportProductsToVk = async (body = {}) => {
  if (!isVkConfigured()) {
    return { ok: false, status: 503, message: "VK не настроен: задайте VK_ACCESS_TOKEN и VK_GROUP_ID" };
  }

  const config = assertVkConfigured();
  const scope = body.scope === "selected" ? "selected" : "filtered";
  const dryRun = body.dryRun === true;
  const operationId = randomUUID();

  const filters = parseExportQuery({
    ids: scope === "selected" && Array.isArray(body.selectedIds) ? body.selectedIds.join(",") : undefined,
    search: body.search,
    categoryId: body.categoryId,
    subcategoryId: body.subcategoryId,
    manufacturer: body.manufacturer,
    hit: body.hit === true ? "1" : body.hit === false ? "0" : undefined,
    onSale: body.onSale === true ? "1" : body.onSale === false ? "0" : undefined,
    ...Object.fromEntries(
      Object.entries(body.attributeFilters || {}).map(([code, value]) => [`attr_${code}`, value]),
    ),
  });

  if (scope === "selected" && (!filters.ids || filters.ids.length === 0)) {
    return { ok: false, status: 400, message: "Для scope=selected нужен непустой selectedIds" };
  }

  const filtersSnapshot = {
    scope,
    search: filters.search || "",
    categoryId: filters.categoryId || null,
    subcategoryId: filters.subcategoryId || null,
    manufacturer: filters.manufacturer || null,
    ids: filters.ids || null,
  };

  const products = await productRepository.listProductsForExport(filters);
  const exportable = pickExportableProducts(products, config.siteUrl);

  if (dryRun) {
    const dryRunResult = {
      ok: true,
      operationId,
      dryRun: true,
      total: products.length,
      exportable: exportable.length,
      skippedInactive: products.filter((p) => p.isActive === false).length,
      skippedNoImage: products.length - exportable.length - products.filter((p) => p.isActive === false).length,
      created: 0,
      updated: 0,
      skippedUnchanged: 0,
      failed: 0,
      errors: [],
    };
    await vkSyncRepository.createSyncRun({
      operationId,
      scope,
      dryRun: true,
      filters: filtersSnapshot,
    });
    await vkSyncRepository.finishSyncRun(operationId, dryRunResult);
    return dryRunResult;
  }

  await vkSyncRepository.createSyncRun({
    operationId,
    scope,
    dryRun: false,
    filters: filtersSnapshot,
  });

  const albumCache = new Map();
  const result = {
    ok: true,
    operationId,
    dryRun: false,
    total: products.length,
    exportable: exportable.length,
    created: 0,
    updated: 0,
    skippedUnchanged: 0,
    skippedInactive: products.filter((p) => p.isActive === false).length,
    skippedNoImage:
      products.length -
      exportable.length -
      products.filter((p) => p.isActive === false).length,
    failed: 0,
    errors: [],
  };

  for (const product of exportable) {
    try {
      const existingSync = await vkSyncRepository.getProductSync(product.id);
      const { payload, imageUrl: resolvedImageUrl, description } = buildMarketPayload({
        product,
        siteUrl: config.siteUrl,
        marketCategoryId: config.marketCategoryId,
        photoId: existingSync?.vkPhotoId || 0,
      });
      const fingerprint = buildPayloadFingerprint({
        product,
        imageUrl: resolvedImageUrl,
        productUrl: payload.url || "",
        description,
        marketCategoryId: config.marketCategoryId,
        payload,
      });
      const payloadHash = vkSyncRepository.hashPayload(fingerprint);

      if (existingSync?.payloadHash === payloadHash && existingSync?.vkItemId) {
        result.skippedUnchanged += 1;
        continue;
      }

      const photoId = await vkApiClient.uploadMarketPhoto(resolvedImageUrl);
      payload.main_photo_id = photoId;

      const vkAlbumId = await vkSyncRepository.ensureAlbumForProduct(product, albumCache);

      let vkItemId = existingSync?.vkItemId ? Number(existingSync.vkItemId) : null;
      const isUpdate = Boolean(vkItemId);

      if (vkItemId) {
        await vkApiClient.editMarketItem(vkItemId, payload);
      } else {
        const createdId = await vkApiClient.addMarketItem(payload);
        vkItemId = Number(createdId);
      }

      if (!Number.isInteger(vkItemId) || vkItemId <= 0) {
        throw new Error("VK не вернул id товара");
      }

      await vkApiClient.addItemToAlbum(vkItemId, vkAlbumId);

      await vkSyncRepository.upsertProductSync({
        productId: product.id,
        vkItemId,
        vkAlbumId,
        vkPhotoId: photoId,
        payloadHash,
        status: "synced",
        lastError: null,
      });

      if (isUpdate) result.updated += 1;
      else result.created += 1;
    } catch (error) {
      result.failed += 1;
      const reason = error instanceof Error ? error.message : "Неизвестная ошибка";
      result.errors.push({
        productId: product.id,
        sku: product.sku,
        reason,
      });
      await vkSyncRepository.upsertProductSync({
        productId: product.id,
        status: "failed",
        lastError: reason,
      });
    }

    if (config.batchDelayMs > 0) {
      await sleep(config.batchDelayMs);
    }
  }

  await vkSyncRepository.finishSyncRun(operationId, result);
  return result;
};

module.exports = {
  pickExportableProducts,
  exportProductsToVk,
};
