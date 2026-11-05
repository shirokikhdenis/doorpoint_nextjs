const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeDecorKey,
  applyBravoDecorSwatches,
} = require("../src/lib/bravo-decor-swatch");
const {
  mergeExportColorPictures,
  isCatalogColorPictogram,
  decorKeyToFileStem,
} = require("../src/lib/server/services/bravoDecorSwatches");

test("normalizeDecorKey collapses separators", () => {
  assert.equal(normalizeDecorKey("Cappuccino Melinga"), "cappuccino melinga");
  assert.equal(normalizeDecorKey("cappuccino-melinga"), "cappuccino melinga");
  assert.equal(normalizeDecorKey("  White_Silk  "), "white silk");
});

test("applyBravoDecorSwatches replaces matching chip images", () => {
  const result = applyBravoDecorSwatches(
    [
      { id: 1, color: "White Silk", image: "/uploads/door.jpg" },
      { id: 2, color: "Unknown Color", image: "/uploads/other.jpg" },
    ],
    new Map([
      [
        "white silk",
        "https://dveri.com/storage/colors/small/dver-mezhkomnatnaya-pet-bravo-0-p-white-silk-1711346907.jpg",
      ],
    ]),
  );
  assert.match(result[0].image, /dver-mezhkomnatnaya-pet-bravo-0-p-white-silk/);
  assert.equal(result[1].image, "/uploads/other.jpg");
});

test("mergeExportColorPictures keeps catalog color pictograms including door-named files", () => {
  const map = new Map();
  mergeExportColorPictures(map, [
    {
      title: "White Silk",
      picture:
        "https://dveri.com/storage/colors/small/dver-mezhkomnatnaya-pet-bravo-0-p-white-silk-1711346907.jpg",
    },
    {
      title: "Snow Melinga",
      picture: "https://dveri.com/storage/colors/small/snow-melinga-1650554978.jpg",
    },
    {
      title: "Texture Only",
      picture: "https://dveri.com/storage/colors/decors/small/white-silk.jpg",
    },
  ]);
  assert.match(map.get("white silk"), /dver-mezhkomnatnaya-pet-bravo-0-p-white-silk/);
  assert.match(map.get("snow melinga"), /snow-melinga/);
  assert.equal(map.has("texture only"), false);
});

test("isCatalogColorPictogram accepts colors/small and rejects decors", () => {
  assert.equal(
    isCatalogColorPictogram(
      "https://dveri.com/storage/colors/small/dver-mezhkomnatnaya-pet-bravo-0-p-white-silk-1711346907.jpg",
    ),
    true,
  );
  assert.equal(
    isCatalogColorPictogram("https://dveri.com/storage/colors/decors/small/white-silk.jpg"),
    false,
  );
});

test("decorKeyToFileStem builds stable filenames", () => {
  assert.equal(decorKeyToFileStem("Nordic Oak"), "nordic-oak");
  assert.equal(decorKeyToFileStem("Cappuccino Melinga"), "cappuccino-melinga");
});
