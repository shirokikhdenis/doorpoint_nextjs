const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeCsvCell, buildCsvContent } = require("../src/lib/server/domain/csvFormat");
const {
  formatCategoryForExport,
  buildImportRows,
  renderCsv,
} = require("../src/lib/server/services/csvExportService");

const attributeDefs = [
  { id: 1, code: "color", name: "Цвет", scope: "product", type: "option" },
  { id: 2, code: "size", name: "Размер", scope: "variant", type: "option" },
  { id: 3, code: "opening", name: "Открывание", scope: "variant", type: "option" },
];

test("formatCategoryForExport builds root>>>subcategory", () => {
  assert.equal(formatCategoryForExport("Входные двери", "Премиум"), "Входные двери>>>Премиум");
  assert.equal(formatCategoryForExport("Фурнитура", ""), "Фурнитура");
});

test("buildImportRows emits one row for product without variants", () => {
  const { headers, rows } = buildImportRows(
    [
      {
        id: 1,
        sku: "DEMO-1",
        name: "Тест",
        category: "Входные двери",
        subcategory: "Премиум",
        price: 10000,
        modelKey: "demo",
        imageUrls: ["https://example.com/a.jpg"],
        attributes: { color: "Белый" },
        variants: [],
      },
    ],
    attributeDefs,
    "import",
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].sku, "DEMO-1");
  assert.equal(rows[0].name, "Тест");
  assert.equal(rows[0].category, "Входные двери>>>Премиум");
  assert.equal(rows[0].price, "10000");
  assert.equal(rows[0].imageUrl, "https://example.com/a.jpg");
  assert.equal(rows[0]["attr:color"], "Белый");
  assert.ok(headers.includes("variant_attr:size"));
});

test("buildImportRows expands variants with empty base fields on follow-up rows", () => {
  const { rows } = buildImportRows(
    [
      {
        id: 2,
        sku: "ENTRY-01",
        name: "Браво",
        category: "Входные двери",
        subcategory: "Премиум",
        price: 79900,
        modelKey: null,
        imageUrls: ["https://example.com/door.jpg"],
        attributes: { color: "Чёрный" },
        variants: [
          { sku: "ENTRY-01", attributes: { size: "860x2050", opening: "Левое" } },
          { sku: "ENTRY-01", attributes: { size: "860x2050", opening: "Правое" } },
          { sku: "ENTRY-01", attributes: { size: "960x2050", opening: "Левое" } },
        ],
      },
    ],
    attributeDefs,
    "import",
  );

  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, "Браво");
  assert.equal(rows[0]["variant_attr:size"], "860x2050");
  assert.equal(rows[1].name, "");
  assert.equal(rows[1].category, "");
  assert.equal(rows[1].price, "");
  assert.equal(rows[1]["attr:color"], "");
  assert.equal(rows[1]["variant_attr:opening"], "Правое");
  assert.equal(rows[2].sku, "ENTRY-01");
});

test("buildImportRows full mode adds admin columns", () => {
  const { rows } = buildImportRows(
    [
      {
        id: 9,
        sku: "FULL-1",
        name: "Полный",
        slug: "full-1",
        category: "Межкомнатные двери",
        subcategory: "",
        price: 12000,
        isActive: true,
        isOnSale: true,
        compareAtPrice: 15000,
        badges: ["hit"],
        displayOrder: 42,
        modelKey: "mk",
        imageUrls: [],
        attributes: {},
        variants: [],
      },
    ],
    attributeDefs,
    "full",
  );

  assert.equal(rows[0].slug, "full-1");
  assert.equal(rows[0].is_active, "1");
  assert.equal(rows[0].is_on_sale, "1");
  assert.equal(rows[0].compare_at_price, "15000");
  assert.equal(rows[0].badges, "hit");
  assert.equal(rows[0].display_order, "42");
});

test("renderCsv escapes semicolons and quotes", () => {
  const csv = renderCsv(
    ["name", "notes"],
    [{ name: 'Дверь "Pro"', notes: "цена; со скидкой" }],
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Дверь ""Pro"""/);
  assert.match(csv, /"цена; со скидкой"/);
});

test("buildCsvContent joins with semicolon delimiter", () => {
  const csv = buildCsvContent(["a", "b"], [{ a: "1", b: "2" }], ";");
  assert.equal(csv, "\uFEFFa;b\r\n1;2");
});

test("escapeCsvCell leaves simple values unquoted", () => {
  assert.equal(escapeCsvCell("BRAVO-01"), "BRAVO-01");
});
