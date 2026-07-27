const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveCategoryTypeFromSlug,
  applyFromProductOverrides,
  addFromCatalogProduct,
} = require("../src/lib/server/services/exhibitionDoorService");

test("resolveCategoryTypeFromSlug maps door category slugs", () => {
  assert.equal(resolveCategoryTypeFromSlug("entry-doors"), "entry");
  assert.equal(resolveCategoryTypeFromSlug("interior-doors"), "interior");
  assert.equal(resolveCategoryTypeFromSlug("fittings"), null);
  assert.equal(resolveCategoryTypeFromSlug(""), null);
});

test("applyFromProductOverrides merges snapshot with optional overrides", () => {
  const snapshot = {
    productId: 42,
    productName: "Экза 8М",
    productSku: "BASE-SKU",
    manufacturerName: "ЮККА",
    coatingColor: "Белый",
    coatingType: "ПВХ",
    price: 20000,
    kitPrice: 26000,
    accessories: [],
  };

  const payload = applyFromProductOverrides(snapshot, "interior", {
    coatingColor: "Белый софт",
    productSku: "VAR-SKU",
    price: 26775,
    kitPrice: 34189,
  });

  assert.equal(payload.categoryType, "interior");
  assert.equal(payload.sortOrder, 0);
  assert.equal(payload.coatingColor, "Белый софт");
  assert.equal(payload.productSku, "VAR-SKU");
  assert.equal(payload.price, 26775);
  assert.equal(payload.kitPrice, 34189);
  assert.equal(payload.productName, "Экза 8М");
});

test("applyFromProductOverrides clears kit price for entry doors", () => {
  const snapshot = {
    productId: 7,
    productName: "Сапфир",
    productSku: "ENTRY-1",
    manufacturerName: "Промет",
    coatingColor: "Чёрный",
    coatingType: "МДФ",
    price: 45000,
    kitPrice: 99999,
    accessories: [],
  };

  const payload = applyFromProductOverrides(snapshot, "entry", { price: 47000 });
  assert.equal(payload.categoryType, "entry");
  assert.equal(payload.kitPrice, null);
  assert.equal(payload.price, 47000);
});

test("addFromCatalogProduct returns 400 for invalid product id", async () => {
  const result = await addFromCatalogProduct({ productId: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("addFromCatalogProduct returns 404 when product is missing", async () => {
  const result = await addFromCatalogProduct({ productId: 999999999 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.match(result.message, /не найден/i);
});

test("addFromCatalogProduct returns 400 for non-door catalog product", async () => {
  const productRepository = require("../src/lib/server/repositories/productRepository");
  const originalGetById = productRepository.getProductById;

  productRepository.getProductById = async (id) => {
    if (Number(id) === 88001) {
      return {
        id: 88001,
        categorySlug: "fittings",
        name: "Ручка",
        sku: "FIT-1",
        price: 1200,
        attributes: [],
        accessories: [],
      };
    }
    return originalGetById(id);
  };

  try {
    const result = await addFromCatalogProduct({ productId: 88001 });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.match(result.message, /входные и межкомнатные/i);
  } finally {
    productRepository.getProductById = originalGetById;
  }
});
