const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  RELATED_FITTING_SLOTS,
  MAGNETIC_LATCH_LOCK_TYPE,
  FLUSH_HINGE_TYPE,
  BUTTERFLY_HINGE_TYPE,
  LIMITER_MAX_PRICE,
  isFittingsHandle,
  buildSlotMatchFields,
  resolveAttrCodes,
} = require("../src/lib/server/domain/fittingsRelated");

test("RELATED_FITTING_SLOTS keeps fixed display order", () => {
  assert.deepEqual(
    RELATED_FITTING_SLOTS.map((slot) => slot.group),
    [
      "magnetic_latch",
      "fixator",
      "flush_hinge",
      "butterfly_hinge",
      "limiter",
      "shootbolt",
    ],
  );
});

test("RELATED_FITTING_SLOTS uses expected subcategories and type filters", () => {
  const [magneticLatch, fixator, flushHinge, butterflyHinge, limiter, shootbolt] =
    RELATED_FITTING_SLOTS;

  assert.equal(magneticLatch.subcategorySlug, "защелки");
  assert.equal(magneticLatch.typeMatch?.value, MAGNETIC_LATCH_LOCK_TYPE);

  assert.equal(fixator.subcategorySlug, "фиксаторы");
  assert.equal(fixator.requiresRosette, true);

  assert.equal(flushHinge.subcategorySlug, "петли");
  assert.equal(flushHinge.typeMatch?.value, FLUSH_HINGE_TYPE);

  assert.equal(butterflyHinge.subcategorySlug, "петли");
  assert.equal(butterflyHinge.typeMatch?.value, BUTTERFLY_HINGE_TYPE);

  assert.equal(limiter.subcategorySlug, "ограничители");
  assert.equal(limiter.maxPrice, LIMITER_MAX_PRICE);
  assert.equal(shootbolt.subcategorySlug, "шпингалеты");
});

test("isFittingsHandle matches fittings root and handles subcategory only", () => {
  assert.equal(
    isFittingsHandle({ categorySlug: "fittings", subcategorySlug: "ручки" }),
    true,
  );
  assert.equal(
    isFittingsHandle({ categorySlug: "fittings", subcategorySlug: "защелки" }),
    false,
  );
});

test("buildSlotMatchFields uses shade for latch and color article + rosette for fixator", () => {
  const codes = resolveAttrCodes([
    { name: "Производитель", code: "manufacturer" },
    { name: "Артикул цвета фурнитуры", code: "color_article" },
    { name: "Оттенок", code: "ottenok" },
    { name: "Розетка", code: "rosette" },
    { name: "LOCK_TYPE", code: "LOCK_TYPE" },
    { name: "HINGE_TYPE", code: "HINGE_TYPE" },
  ]);

  const fixatorFields = buildSlotMatchFields(
    RELATED_FITTING_SLOTS[1],
    codes,
    "Morelli",
    "MB-01",
    "Хром",
    "Квадрат",
  );
  assert.deepEqual(fixatorFields, [
    { code: "manufacturer", value: "Morelli" },
    { code: "color_article", value: "MB-01" },
    { code: "rosette", value: "Квадрат" },
  ]);

  const latchFields = buildSlotMatchFields(
    RELATED_FITTING_SLOTS[0],
    codes,
    "Morelli",
    "MB-01",
    "Хром",
    "Квадрат",
  );
  assert.deepEqual(latchFields, [
    { code: "manufacturer", value: "Morelli" },
    { code: "ottenok", value: "Хром" },
    { code: "LOCK_TYPE", value: MAGNETIC_LATCH_LOCK_TYPE },
  ]);

  const hingeFields = buildSlotMatchFields(
    RELATED_FITTING_SLOTS[2],
    codes,
    "Morelli",
    "MB-01",
    "Хром",
    "Квадрат",
  );
  assert.deepEqual(hingeFields, [
    { code: "manufacturer", value: "Morelli" },
    { code: "ottenok", value: "Хром" },
    { code: "HINGE_TYPE", value: FLUSH_HINGE_TYPE },
  ]);
});
