const test = require("node:test");
const assert = require("node:assert/strict");
const {
  listCartKpDoors,
  buildCartKpPayload,
  buildCartKpFilenameBase,
} = require("../src/lib/server/domain/cartCommercialProposalDocumentData");

test("listCartKpDoors keeps unique entry and interior doors with product links", () => {
  const doors = listCartKpDoors([
    { id: 1, categorySlug: "interior-doors", name: "A" },
    { id: 1, categorySlug: "interior-doors", name: "A" },
    { id: 2, categorySlug: "entry-doors", name: "B" },
    { id: 3, categorySlug: "fittings", name: "Handle" },
    { id: 4, categorySlug: "interior-doors", noProductLink: true, name: "Hidden" },
  ]);
  assert.deepEqual(
    doors.map((item) => item.id),
    [1, 2],
  );
});

test("buildCartKpPayload fails without a door", () => {
  const result = buildCartKpPayload({
    items: [{ id: 9, categorySlug: "fittings", name: "Ручка", price: 100, quantity: 1 }],
  });
  assert.equal(result.ok, false);
});

test("buildCartKpPayload builds invoice lines and door metadata", () => {
  const generatedAt = new Date("2026-09-03T12:00:00");
  const result = buildCartKpPayload({
    items: [
      {
        id: 100,
        categorySlug: "interior-doors",
        name: "Браво-0",
        sku: "5621",
        price: 10000,
        quantity: 1,
        color: "Stormy Silk",
        manufacturerName: "Браво",
        image: "/uploads/door.jpg",
      },
      {
        id: 200,
        categorySlug: "services",
        name: "Монтаж",
        price: 3000,
        quantity: 1,
        noProductLink: true,
        hideCartImage: true,
      },
    ],
    doorProduct: {
      id: 100,
      sku: "5621",
      slug: "bravo-0",
      name: "Браво-0",
      categorySlug: "interior-doors",
      color: "Stormy Silk",
      manufacturerName: "Браво",
      mergedImageUrl: "/uploads/merged.jpg",
    },
    generatedAt,
  });

  assert.equal(result.ok, true);
  assert.equal(result.filenameBase, "KP-cart-5621");
  assert.equal(result.door.sku, "5621");
  assert.equal(result.door.categoryLabel, "Межкомнатная дверь");
  assert.equal(result.door.showImageFrame, true);
  assert.match(result.door.productPageUrl, /\/product\/bravo-0$/);
  assert.equal(result.lines.length, 2);
  assert.equal(result.total, 13000);
  assert.match(result.totalFormatted, /₽/);
});

test("buildCartKpFilenameBase sanitizes name when sku missing", () => {
  assert.equal(
    buildCartKpFilenameBase(null, { name: 'Дверь / "А"', categorySlug: "entry-doors" }),
    "KP-cart-Дверь-А",
  );
});
