const test = require("node:test");
const assert = require("node:assert/strict");
const { numberToWordsRu, numberToGenitiveRu, formatDaysWithGenitive, formatRublesInWords } = require("../src/lib/server/domain/rublesInWords");

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

test("numberToGenitiveRu uses genitive case", () => {
  assert.equal(numberToGenitiveRu(3), "трех");
  assert.equal(numberToGenitiveRu(15), "пятнадцати");
});

test("formatDaysWithGenitive builds number with genitive in parentheses", () => {
  assert.equal(formatDaysWithGenitive(3).formatted, "3 (трех)");
  assert.equal(formatDaysWithGenitive(15).formatted, "15 (пятнадцати)");
  assert.equal(formatDaysWithGenitive("").formatted, "");
});
