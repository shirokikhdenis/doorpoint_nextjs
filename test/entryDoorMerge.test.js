const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  ENTRY_DOORS_CATEGORY_SLUG,
  RIGHT_SCALE,
  isMergedImageUrl,
  originalImageUrls,
  sanitizeProductGalleryUrls,
  mergedFileNameForSku,
  mergedPublicUrlForSku,
  resolveEntryDoorMergeAction,
  mergeEntryDoorPair,
} = require("../src/lib/server/domain/entryDoorMerge");

const solidJpeg = async (width, height, color) =>
  sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();

test("isMergedImageUrl detects derived merge files", () => {
  assert.equal(isMergedImageUrl("/uploads/merged/30100_merged.jpg"), true);
  assert.equal(isMergedImageUrl("/uploads/products/30100_merged.jpg"), true);
  assert.equal(isMergedImageUrl("/uploads/products/30100.jpg"), false);
  assert.equal(isMergedImageUrl("/uploads/products/30100_1.jpg"), false);
});

test("originalImageUrls drops pre-baked merges", () => {
  assert.deepEqual(
    originalImageUrls([
      "/uploads/merged/30100_merged.jpg",
      "/uploads/products/30100.jpg",
      "/uploads/products/30100_1.jpg",
    ]),
    ["/uploads/products/30100.jpg", "/uploads/products/30100_1.jpg"],
  );
});

test("sanitizeProductGalleryUrls drops merges and duplicates", () => {
  assert.deepEqual(
    sanitizeProductGalleryUrls([
      "/uploads/merged/30100_merged.jpg",
      "/uploads/products/30100.jpg",
      "/uploads/products/30100.jpg",
      "/uploads/products/30100_1.jpg",
    ]),
    ["/uploads/products/30100.jpg", "/uploads/products/30100_1.jpg"],
  );
});

test("merged file name stays sku-based", () => {
  assert.equal(mergedFileNameForSku("30100"), "30100_merged.jpg");
  assert.equal(mergedPublicUrlForSku("30100"), "/uploads/merged/30100_merged.jpg");
});

test("resolveEntryDoorMergeAction merges first two originals for entry doors", () => {
  const decision = resolveEntryDoorMergeAction({
    categorySlug: ENTRY_DOORS_CATEGORY_SLUG,
    imageUrls: ["/uploads/products/a.jpg", "/uploads/products/a_1.jpg"],
  });
  assert.equal(decision.action, "merge");
  assert.equal(decision.leftUrl, "/uploads/products/a.jpg");
  assert.equal(decision.rightUrl, "/uploads/products/a_1.jpg");
});

test("resolveEntryDoorMergeAction skips legacy merged-only gallery", () => {
  const decision = resolveEntryDoorMergeAction({
    categorySlug: ENTRY_DOORS_CATEGORY_SLUG,
    imageUrls: ["/uploads/merged/30100_merged.jpg"],
  });
  assert.equal(decision.action, "skip");
});

test("resolveEntryDoorMergeAction clears entry doors with a single original", () => {
  const decision = resolveEntryDoorMergeAction({
    categorySlug: ENTRY_DOORS_CATEGORY_SLUG,
    imageUrls: ["/uploads/products/a.jpg"],
  });
  assert.equal(decision.action, "clear");
});

test("resolveEntryDoorMergeAction skips interior doors", () => {
  const decision = resolveEntryDoorMergeAction({
    categorySlug: "interior-doors",
    imageUrls: ["/uploads/products/a.jpg", "/uploads/products/b.jpg"],
  });
  assert.equal(decision.action, "skip");
});

test("mergeEntryDoorPair matches image_merge layout", async () => {
  const left = await solidJpeg(200, 400, { r: 200, g: 40, b: 40 });
  const right = await solidJpeg(200, 400, { r: 40, g: 40, b: 200 });
  const result = await mergeEntryDoorPair(left, right);

  const expectedRightHeight = Math.floor(400 * RIGHT_SCALE);
  const expectedRightWidth = Math.round(200 * (expectedRightHeight / 400));
  assert.equal(result.layout.leftWidth, 200);
  assert.equal(result.layout.leftHeight, 400);
  assert.equal(result.layout.rightHeight, expectedRightHeight);
  assert.equal(result.layout.rightWidth, expectedRightWidth);
  assert.equal(result.layout.rightTop, 400 - expectedRightHeight);
  assert.equal(result.layout.canvasWidth, 200 + expectedRightWidth);
  assert.equal(result.layout.canvasHeight, 400);

  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.width, result.layout.canvasWidth);
  assert.equal(meta.height, 400);
});
