const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  groupFinishes,
  isFinishCatalogManufacturer,
  FINISH_GROUP_LABELS,
  resolveGroupKey,
} = require("../src/lib/server/domain/doorFinishes");

test("isFinishCatalogManufacturer matches Aelita case-insensitively", () => {
  assert.equal(isFinishCatalogManufacturer("Аэлита"), true);
  assert.equal(isFinishCatalogManufacturer("аэлита"), true);
  assert.equal(isFinishCatalogManufacturer("VellDor"), false);
});

test("resolveGroupKey accepts codes and Russian labels", () => {
  assert.equal(resolveGroupKey("marble"), "marble");
  assert.equal(resolveGroupKey("Под мрамор"), "marble");
  assert.equal(resolveGroupKey("под мрамор"), "marble");
  assert.equal(resolveGroupKey("Однотонные"), "solid");
  assert.equal(resolveGroupKey("Под дерево"), "wood");
  assert.equal(resolveGroupKey("Другое"), "other");
  assert.equal(resolveGroupKey("неизвестно"), "other");
});

test("groupFinishes orders groups and maps fields", () => {
  const groups = groupFinishes([
    {
      id: 2,
      groupKey: "wood",
      name: "Дуб",
      imageUrl: "/img/dub.jpg",
      priceDelta: 1000,
    },
    {
      id: 1,
      groupKey: "solid",
      name: "Белый",
      imageUrl: "",
      priceDelta: 0,
    },
    {
      id: 3,
      groupKey: "unknown",
      name: "Прочее",
      imageUrl: "",
      priceDelta: 500,
    },
  ]);

  assert.deepEqual(
    groups.map((group) => group.key),
    ["solid", "wood", "other"],
  );
  assert.equal(groups[0].title, FINISH_GROUP_LABELS.solid);
  assert.deepEqual(groups[0].items[0], {
    id: 1,
    name: "Белый",
    image: "",
    priceDelta: 0,
  });
});
