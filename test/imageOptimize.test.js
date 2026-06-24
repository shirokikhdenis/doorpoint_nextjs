const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  resolveImagePreset,
  shouldOptimizeExtension,
  shouldSkipExtension,
  optimizeRasterBuffer,
  shouldSkipOptimization,
} = require("../src/lib/server/imageOptimize");

test("resolveImagePreset maps upload subdirs to presets", () => {
  assert.equal(resolveImagePreset("products"), "productCard");
  assert.equal(resolveImagePreset("merged"), "productCard");
  assert.equal(resolveImagePreset("furnitura"), "catalogCard");
  assert.equal(resolveImagePreset("finishes"), "finishThumb");
  assert.equal(resolveImagePreset("factories/logos"), "logo");
  assert.equal(resolveImagePreset("factories/doors"), "storefrontLabel");
  assert.equal(resolveImagePreset("portfolio/12"), "portfolio");
  assert.equal(resolveImagePreset("storefront"), "storefrontLabel");
  assert.equal(resolveImagePreset(""), "storefrontLabel");
});

test("shouldOptimizeExtension accepts raster formats only", () => {
  assert.equal(shouldOptimizeExtension(".png"), true);
  assert.equal(shouldOptimizeExtension(".JPG"), true);
  assert.equal(shouldOptimizeExtension(".svg"), false);
  assert.equal(shouldSkipExtension(".svg"), true);
  assert.equal(shouldSkipExtension(".gif"), true);
});

test("optimizeRasterBuffer returns JPEG within preset bounds", async () => {
  const input = await sharp({
    create: {
      width: 2400,
      height: 1800,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  })
    .png()
    .toBuffer();

  const result = await optimizeRasterBuffer(input, { preset: "catalogCard" });

  assert.equal(result.extension, ".jpg");
  assert.equal(result.contentType, "image/jpeg");
  assert.ok(result.buffer.length < input.length);
  assert.ok(result.buffer[0] === 0xff && result.buffer[1] === 0xd8);
  assert.ok(result.width <= 1200);
  assert.ok(result.height <= 1200);
});

test("shouldSkipOptimization skips small in-bounds JPEG files", async () => {
  const input = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  const skip = await shouldSkipOptimization(input, {
    preset: "catalogCard",
    fileSizeBytes: input.length,
    minSizeKb: 200,
  });

  assert.equal(skip, true);
});
