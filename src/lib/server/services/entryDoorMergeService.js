const fs = require("fs/promises");
const path = require("path");
const productRepository = require("../repositories/productRepository");
const { resolveImageBuffer } = require("../domain/resolveImageBuffer");
const {
  MERGED_UPLOAD_SUBDIR,
  mergedFileNameForSku,
  mergedPublicUrlForSku,
  mergeEntryDoorPair,
  resolveEntryDoorMergeAction,
} = require("../domain/entryDoorMerge");
const { optimizeRasterBuffer, writeCardThumbBeside } = require("../imageOptimize");
const { ensureWritableSubdir } = require("../uploadsPath");

const writeMergedEntryDoorImage = async (sku, leftBuffer, rightBuffer) => {
  const merged = await mergeEntryDoorPair(leftBuffer, rightBuffer);
  const optimized = await optimizeRasterBuffer(merged.buffer, { preset: "productCard" });
  const dir = await ensureWritableSubdir(MERGED_UPLOAD_SUBDIR);
  const fileName = mergedFileNameForSku(sku);
  const fullPath = path.join(/*turbopackIgnore: true*/ dir, fileName);
  await fs.writeFile(fullPath, optimized.buffer);
  await writeCardThumbBeside(fullPath, optimized.buffer, MERGED_UPLOAD_SUBDIR);
  return {
    publicUrl: mergedPublicUrlForSku(sku),
    fullPath,
    width: optimized.width,
    height: optimized.height,
    layout: merged.layout,
  };
};

const syncEntryDoorMergedImage = async ({ sku } = {}) => {
  const product = await productRepository.getProductMergeContextBySku(sku);
  if (!product) {
    return { ok: false, skipped: true, message: "Товар не найден" };
  }

  const decision = resolveEntryDoorMergeAction({
    categorySlug: product.categorySlug,
    imageUrls: product.imageUrls,
  });

  if (decision.action === "skip") {
    return { ok: true, skipped: true, sku: product.sku };
  }

  if (decision.action === "clear") {
    await productRepository.setMergedImageUrl(product.id, null);
    return { ok: true, cleared: true, sku: product.sku };
  }

  const left = await resolveImageBuffer(decision.leftUrl);
  const right = await resolveImageBuffer(decision.rightUrl);
  if (!left?.buffer || !right?.buffer) {
    return {
      ok: false,
      sku: product.sku,
      message: `Не удалось прочитать исходные фото для склейки SKU «${product.sku}»`,
    };
  }

  const written = await writeMergedEntryDoorImage(product.sku, left.buffer, right.buffer);
  await productRepository.setMergedImageUrl(product.id, written.publicUrl);
  return { ok: true, sku: product.sku, url: written.publicUrl };
};

const rebuildEntryDoorMergedImages = async ({ onProgress } = {}) => {
  const candidates = await productRepository.listEntryDoorMergeCandidates();
  const summary = { total: candidates.length, merged: 0, skipped: 0, failed: 0, errors: [] };
  for (let index = 0; index < candidates.length; index += 1) {
    const sku = candidates[index].sku;
    onProgress?.({ index: index + 1, total: candidates.length, sku });
    const result = await syncEntryDoorMergedImage({ sku });
    if (!result.ok) {
      summary.failed += 1;
      if (result.message) summary.errors.push(result.message);
      continue;
    }
    if (result.skipped) summary.skipped += 1;
    else if (result.url) summary.merged += 1;
    else summary.skipped += 1;
  }
  return summary;
};

module.exports = {
  writeMergedEntryDoorImage,
  syncEntryDoorMergedImage,
  rebuildEntryDoorMergedImages,
};
