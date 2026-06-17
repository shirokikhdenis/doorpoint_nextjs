const test = require("node:test");
const assert = require("node:assert/strict");
const { numberToWordsRu, formatRublesInWords } = require("../src/lib/server/domain/rublesInWords");

test("numberToWordsRu formats thousands", () => {
  assert.equal(numberToWordsRu(23702), "двадцать три тысячи семьсот два");
});

test("formatRublesInWords returns full legal phrase", () => {
  const result = formatRublesInWords(23702);
  assert.equal(result.wordsCap, "Двадцать три тысячи семьсот два");
  assert.equal(result.rublesLabel, "рубля");
  assert.match(result.full, /Двадцать три тысячи семьсот два рубля 00 копеек/);
});

test("formatRublesInWords handles zero", () => {
  const result = formatRublesInWords(0);
  assert.match(result.full, /Ноль рублей 00 копеек/);
});
