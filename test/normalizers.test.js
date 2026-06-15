const test = require("node:test");
const assert = require("node:assert/strict");

// Inline minimal normalizers under test (Node test runner cannot resolve @/ aliases in TS).
const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCatalogMeta = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const price = source.price && typeof source.price === "object" ? source.price : {};
  return {
    categories: asArray(source.categories),
    subcategories: asArray(source.subcategories),
    attributeFilters: asArray(source.attributeFilters).map((entry) => ({
      code: String(entry.code || ""),
      name: String(entry.name || ""),
      type: String(entry.type || "text"),
      unit: entry.unit ? String(entry.unit) : null,
      values: entry.type !== "number" ? asArray(entry.values).map(String) : undefined,
      min: entry.type === "number" ? Number(entry.min) || 0 : undefined,
      max: entry.type === "number" ? Number(entry.max) || 0 : undefined,
    })),
    price: {
      min: Number(price.min) || 0,
      max: Number(price.max) || 0,
    },
    labels: asArray(source.labels).map((entry) => ({
      id: Number(entry.id) || 0,
      title: String(entry.title || ""),
      imageUrl: entry.imageUrl != null && entry.imageUrl !== "" ? String(entry.imageUrl) : null,
      sortOrder: Number(entry.sortOrder) || 0,
      filters: asArray(entry.filters)
        .map((f) => ({
          code: String(f.code || "").trim(),
          value: String(f.value || "").trim(),
        }))
        .filter((f) => f.code && f.value),
    })),
  };
};

const normalizeProductsResponse = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.items)) {
    return value.items;
  }
  return [];
};

test("normalizeCatalogMeta handles empty payload", () => {
  const meta = normalizeCatalogMeta(null);
  assert.deepEqual(meta.categories, []);
  assert.deepEqual(meta.labels, []);
  assert.equal(meta.price.min, 0);
  assert.equal(meta.price.max, 0);
});

test("normalizeCatalogMeta maps attribute filters", () => {
  const meta = normalizeCatalogMeta({
    categories: [{ slug: "doors", name: "Двери" }],
    attributeFilters: [
      { code: "thickness", name: "Толщина", type: "number", min: 40, max: 50 },
    ],
    price: { min: 1000, max: 50000 },
    labels: [],
  });
  assert.equal(meta.categories[0].slug, "doors");
  assert.equal(meta.attributeFilters[0].code, "thickness");
  assert.equal(meta.attributeFilters[0].min, 40);
  assert.equal(meta.price.max, 50000);
});

test("normalizeProductsResponse reads items array", () => {
  const items = normalizeProductsResponse({
    items: [{ id: 5, name: "Товар", price: 12000 }],
    total: 1,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 5);
  assert.equal(items[0].price, 12000);
});

test("normalizeProductsResponse accepts bare array", () => {
  const items = normalizeProductsResponse([{ id: 2, name: "X", price: 100 }]);
  assert.equal(items.length, 1);
});
