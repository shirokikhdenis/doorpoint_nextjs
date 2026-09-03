const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  loadCreativeFonts,
  wrapText,
  truncateText,
  pathForText,
  buildLayout,
  placeOverlayItems,
  rectsOverlap,
  rectInside,
  encodeJpegUnderLimit,
  resolveCollageCells,
  renderDirectCreative,
} = require("../src/lib/server/domain/directCreativeRender");
const {
  MAX_JPEG_BYTES,
  DESIGN_SCALE,
  DIRECT_CREATIVE_SIZES,
} = require("../src/lib/direct-creative-sizes");

const solidJpeg = async (width, height, color) =>
  sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();

const sampleTexts = {
  name: "Альфа белый эмаль",
  priceLabel: "от 18 900 ₽",
  compareLabel: "24 900 ₽",
  ctaText: "Смотреть модель",
  siteName: "dvernayatochka.ru",
  discountPercent: 24,
};

test("wrapText fits Cyrillic into max lines", () => {
  const { bold } = loadCreativeFonts();
  const lines = wrapText(bold, "Дверь Альфа белый эмаль", 20, 180, 2);
  assert.ok(lines.length >= 1 && lines.length <= 2);
  for (const line of lines) {
    assert.ok(bold.getAdvanceWidth(line.replace(/\.\.\.$/, ""), 20) <= 180 + 20);
  }
});

test("wrapText adds ellipsis when words do not fit", () => {
  const { bold } = loadCreativeFonts();
  const lines = wrapText(bold, "Очень длинное название модели межкомнатной двери", 18, 90, 1);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\.\.\.$/);
});

test("truncateText adds ellipsis when too wide", () => {
  const { regular } = loadCreativeFonts();
  const out = truncateText(regular, "Очень длинное название модели двери", 18, 80);
  assert.match(out, /\.\.\.$/);
  assert.ok(regular.getAdvanceWidth(out, 18) <= 80 + 1);
});

test("pathForText serializes Cyrillic without NaN", () => {
  const { bold } = loadCreativeFonts();
  const d = pathForText(bold, "Альфа белый эмаль", 26, 40, 25);
  assert.ok(d.length > 50);
  assert.equal(d.includes("NaN"), false);
});

test("portrait layout keeps photo above the text bar", () => {
  const slots = buildLayout({
    blockWidth: 240,
    blockHeight: 400,
    family: "portrait",
    logoAspect: 3,
  });
  assert.equal(slots.canvas.width, 240 * DESIGN_SCALE);
  assert.equal(slots.photo.top, 0);
  assert.ok(slots.photo.height < slots.canvas.height);
  assert.ok(slots.content.top >= slots.photo.height);
});

test("wide banners use a larger photo slot than 0.6 of height", () => {
  const slots = buildLayout({
    blockWidth: 970,
    blockHeight: 250,
    family: "wide",
    logoAspect: 3.02,
  });
  assert.ok(slots.photo.width > slots.canvas.height * 0.6);
  assert.equal(slots.allowCollage, true);
});

test("landscape 16:9 puts more than half the canvas on the photo", () => {
  const slots = buildLayout({
    blockWidth: 1600,
    blockHeight: 900,
    family: "landscape",
    logoAspect: 3.02,
  });
  const ratio = slots.photo.width / slots.canvas.width;
  assert.ok(ratio >= 0.55 && ratio <= 0.62);
  assert.equal(slots.name.maxLines, 2);
});

test("small cards hide the domain when a logo is present", () => {
  const slots = buildLayout({
    blockWidth: 300,
    blockHeight: 250,
    family: "card",
    logoAspect: 3.02,
  });
  assert.equal(slots.brandBox, null);
  assert.ok(slots.logo.height > 0);
  assert.ok(slots.cta.padX >= Math.round(slots.cta.fontSize * 0.9));
  assert.equal(slots.hideCta, false);
});

test("compact banners collapse collage and hide CTA on 320x50", () => {
  const leader = buildLayout({
    blockWidth: 320,
    blockHeight: 50,
    family: "wide",
    logoAspect: 3.02,
  });
  assert.equal(leader.hideCta, true);
  assert.equal(leader.allowCollage, false);
  assert.equal(leader.stackAlign, "spread");

  const compactCta = buildLayout({
    blockWidth: 320,
    blockHeight: 100,
    family: "wide",
    logoAspect: 3.02,
  });
  assert.equal(compactCta.hideCta, true);

  const leaderBoard = buildLayout({
    blockWidth: 728,
    blockHeight: 90,
    family: "wide",
    logoAspect: 3.02,
  });
  assert.equal(leaderBoard.hideCta, false);

  const fonts = loadCreativeFonts();
  const { items, rects } = placeOverlayItems(leader, fonts, {
    ...sampleTexts,
    photoCount: 4,
    collageActive: false,
  });
  assert.equal(items.cta, null);
  assert.equal(rects.colorCount != null, true);
  assert.match(items.colorCount.text, /4 цвета/);
});

test("layout does not depend on output scale", () => {
  const a = buildLayout({
    blockWidth: 728,
    blockHeight: 90,
    family: "wide",
    logoAspect: 3.02,
  });
  const b = buildLayout({
    blockWidth: 728,
    blockHeight: 90,
    family: "wide",
    logoAspect: 3.02,
  });
  assert.deepEqual(a, b);
  assert.equal(a.compact, true);
  assert.equal(a.hideCta, false);
});

test("overlay boxes do not overlap and stay inside the canvas", () => {
  const fonts = loadCreativeFonts();
  for (const size of DIRECT_CREATIVE_SIZES) {
    const slots = buildLayout({
      blockWidth: size.blockWidth,
      blockHeight: size.blockHeight,
      family: size.family,
      logoAspect: 3.02,
    });
    const { rects } = placeOverlayItems(slots, fonts, sampleTexts);
    const named = ["name", "compare", "price", "cta", "logo", "brand", "colorCount"].filter(
      (key) => rects[key],
    );
    for (const key of named) {
      assert.equal(
        rectInside(rects[key], rects.canvas, 2),
        true,
        `${size.id}: ${key} outside canvas`,
      );
    }
    for (let i = 0; i < named.length; i += 1) {
      for (let j = i + 1; j < named.length; j += 1) {
        const left = named[i];
        const right = named[j];
        assert.equal(
          rectsOverlap(rects[left], rects[right]),
          false,
          `${size.id}: ${left} overlaps ${right}`,
        );
      }
    }
    if (rects.badge) {
      assert.equal(
        rectInside(rects.badge, rects.photo, 2),
        true,
        `${size.id}: badge outside photo`,
      );
    }
  }
});

test("JPEG encoder stays under Direct 512 KB limit", async () => {
  const noisy = await sharp({
    create: { width: 1940, height: 750, channels: 3, background: { r: 40, g: 40, b: 180 } },
  })
    .png()
    .toBuffer();
  const encoded = await encodeJpegUnderLimit(noisy);
  assert.ok(encoded.length <= MAX_JPEG_BYTES);
  const meta = await sharp(encoded).metadata();
  assert.equal(meta.format, "jpeg");
});

test("renderDirectCreative outputs requested pixels and JPEG under 512 KB", async () => {
  const photo = await solidJpeg(800, 1200, { r: 90, g: 70, b: 50 });
  const logo = await solidJpeg(400, 80, { r: 44, g: 44, b: 183 });
  const cases = [
    { blockWidth: 240, blockHeight: 400, family: "portrait", scale: 2 },
    { blockWidth: 300, blockHeight: 250, family: "card", scale: 2 },
    { blockWidth: 728, blockHeight: 90, family: "wide", scale: 2 },
    { blockWidth: 600, blockHeight: 600, family: "card", scale: 1 },
    { blockWidth: 1600, blockHeight: 900, family: "landscape", scale: 1 },
  ];
  for (const item of cases) {
    const result = await renderDirectCreative({
      ...item,
      photoBuffer: photo,
      logoBuffer: logo,
      name: "Альфа белый",
      price: 18900,
      compareAtPrice: 24900,
      isOnSale: true,
      siteName: "dvernayatochka.ru",
      ctaText: "Смотреть модель",
      showDiscountBadge: true,
    });
    assert.equal(result.width, item.blockWidth * item.scale);
    assert.equal(result.height, item.blockHeight * item.scale);
    assert.ok(result.bytes <= MAX_JPEG_BYTES);
    const meta = await sharp(result.buffer).metadata();
    assert.equal(meta.width, item.blockWidth * item.scale);
    assert.equal(meta.height, item.blockHeight * item.scale);
    assert.equal(meta.format, "jpeg");
  }
});

test("heaviest 970x250 at 3x stays under 512 KB and has a border overlay", async () => {
  const photo = await solidJpeg(1600, 2200, { r: 110, g: 90, b: 70 });
  const logo = await solidJpeg(900, 300, { r: 44, g: 44, b: 183 });
  const result = await renderDirectCreative({
    blockWidth: 970,
    blockHeight: 250,
    scale: 3,
    family: "wide",
    photoBuffer: photo,
    logoBuffer: logo,
    name: "Альфа белый эмаль",
    price: 18900,
    compareAtPrice: 24900,
    isOnSale: true,
    siteName: "dvernayatochka.ru",
  });
  assert.equal(result.width, 2910);
  assert.equal(result.height, 750);
  assert.ok(result.bytes <= MAX_JPEG_BYTES);
  assert.equal(result.slots.borderWidth, DESIGN_SCALE);
});

test("collage grid fits 1-4 photos without overlap", () => {
  const one = resolveCollageCells(400, 600, 1);
  assert.equal(one.length, 1);
  assert.deepEqual(one[0], { left: 0, top: 0, width: 400, height: 600 });

  const twoTall = resolveCollageCells(300, 800, 2);
  assert.equal(twoTall.length, 2);
  assert.equal(rectsOverlap(twoTall[0], twoTall[1]), false);

  const four = resolveCollageCells(800, 800, 4);
  assert.equal(four.length, 4);
  assert.equal(four[0].top, four[3].top);
  assert.equal(four[0].height, four[3].height);
  assert.ok(four[0].left < four[1].left);
  assert.ok(four[1].left < four[2].left);
  for (let i = 0; i < four.length; i += 1) {
    assert.equal(rectInside(four[i], { left: 0, top: 0, width: 800, height: 800 }, 0), true);
    for (let j = i + 1; j < four.length; j += 1) {
      assert.equal(rectsOverlap(four[i], four[j]), false);
    }
  }

  const three = resolveCollageCells(800, 800, 3);
  assert.equal(three.length, 3);
  assert.equal(three[0].top, three[2].top);
  assert.equal(rectsOverlap(three[0], three[2]), false);
});

test("renderDirectCreative composites four color photos on a card", async () => {
  const photos = await Promise.all([
    solidJpeg(400, 900, { r: 240, g: 240, b: 240 }),
    solidJpeg(400, 900, { r: 180, g: 180, b: 180 }),
    solidJpeg(400, 900, { r: 80, g: 80, b: 80 }),
    solidJpeg(400, 900, { r: 40, g: 40, b: 40 }),
  ]);
  const result = await renderDirectCreative({
    blockWidth: 600,
    blockHeight: 600,
    scale: 1,
    family: "card",
    photoBuffers: photos,
    photoLabels: ["White Silk", "Grey Silk", "Stormy Silk", "Cream Silk"],
    name: "Браво-22",
    price: 7524,
    siteName: "doorpoint29.ru",
  });
  assert.equal(result.width, 600);
  assert.equal(result.height, 600);
  assert.ok(result.bytes <= MAX_JPEG_BYTES);
});
