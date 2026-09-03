const fs = require("node:fs");
const path = require("node:path");
const { renderDirectCreative } = require("../src/lib/server/domain/directCreativeRender");

const outDir = path.join("tmp", "direct-creatives-qa");
fs.mkdirSync(outDir, { recursive: true });

const tallPhoto = fs.readFileSync(
  "public/uploads/products/006ac344e826430d938393c02939107607795016.jpg",
);
const squarePhoto = fs.readFileSync(
  "public/uploads/products/0034c9278cf7c77bf3bbd7e0ecf0cd09c3e47463.jpg",
);
const logo = fs.readFileSync("public/uploads/Logo-01.png");

const sizes = [
  { id: "240x400", blockWidth: 240, blockHeight: 400, family: "portrait" },
  { id: "300x250", blockWidth: 300, blockHeight: 250, family: "card" },
  { id: "728x90", blockWidth: 728, blockHeight: 90, family: "wide" },
  { id: "970x250", blockWidth: 970, blockHeight: 250, family: "wide" },
  { id: "320x50", blockWidth: 320, blockHeight: 50, family: "wide" },
  { id: "320x100", blockWidth: 320, blockHeight: 100, family: "wide" },
  { id: "1600x900", blockWidth: 1600, blockHeight: 900, family: "landscape" },
];

const renderOne = async (photo, photoTag, size, scale) => {
  const result = await renderDirectCreative({
    blockWidth: size.blockWidth,
    blockHeight: size.blockHeight,
    scale,
    family: size.family,
    photoBuffer: photo,
    logoBuffer: logo,
    name: "Альфа белый эмаль",
    price: 18900,
    compareAtPrice: 24900,
    isOnSale: true,
    siteName: "dvernayatochka.ru",
    ctaText: "Смотреть модель",
    showDiscountBadge: true,
  });
  const file = path.join(outDir, `${photoTag}-${size.id}-x${scale}.jpg`);
  fs.writeFileSync(file, result.buffer);
  console.log(file, result.width, result.height, result.bytes);
};

(async () => {
  for (const size of sizes) {
    await renderOne(tallPhoto, "tall", size, 1);
    await renderOne(tallPhoto, "tall", size, 2);
  }
  await renderOne(squarePhoto, "square", sizes[0], 2);
  await renderOne(squarePhoto, "square", sizes[1], 2);

  const collagePhotos = [tallPhoto, squarePhoto, tallPhoto, squarePhoto];
  const collageLabels = ["White Silk", "Grey Silk", "Stormy Silk", "Cream Silk"];
  const collageCard = await renderDirectCreative({
    blockWidth: 600,
    blockHeight: 600,
    scale: 1,
    family: "card",
    photoBuffers: collagePhotos,
    photoLabels: collageLabels,
    logoBuffer: logo,
    name: "Браво-22",
    price: 7524,
    siteName: "doorpoint29.ru",
    ctaText: "Смотреть модель",
  });
  fs.writeFileSync(path.join(outDir, "collage-600.jpg"), collageCard.buffer);
  console.log("collage-600.jpg", collageCard.bytes);

  const collageWide = await renderDirectCreative({
    blockWidth: 728,
    blockHeight: 90,
    scale: 2,
    family: "wide",
    photoBuffers: collagePhotos,
    photoLabels: collageLabels,
    logoBuffer: logo,
    name: "Браво-22",
    price: 7524,
    siteName: "doorpoint29.ru",
    ctaText: "Смотреть модель",
  });
  fs.writeFileSync(path.join(outDir, "collage-728x90.jpg"), collageWide.buffer);
  console.log("collage-728x90.jpg", collageWide.bytes, collageWide.rects.colorCount);
})();
