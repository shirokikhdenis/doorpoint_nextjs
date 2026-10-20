const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseTrailingContractNumber,
  suggestNextContractNumber,
  DEFAULT_NEXT_CONTRACT_NUMBER,
} = require("../src/lib/server/domain/contractNumber");

test("parseTrailingContractNumber reads Д-000123 and plain digits", () => {
  assert.deepEqual(parseTrailingContractNumber("Д-000123"), {
    prefix: "Д-",
    digits: "000123",
  });
  assert.deepEqual(parseTrailingContractNumber("42"), { prefix: "", digits: "42" });
  assert.equal(parseTrailingContractNumber("б/н"), null);
  assert.equal(parseTrailingContractNumber(""), null);
});

test("suggestNextContractNumber increments first numeric contract", () => {
  assert.equal(suggestNextContractNumber(["Д-000123"]), "Д-000124");
  assert.equal(suggestNextContractNumber(["б/н", "договор", "Д-000099"]), "Д-000100");
  assert.equal(suggestNextContractNumber(["15", "14"]), "16");
});

test("suggestNextContractNumber falls back when nothing numeric", () => {
  assert.equal(suggestNextContractNumber([]), DEFAULT_NEXT_CONTRACT_NUMBER);
  assert.equal(suggestNextContractNumber(["б/н", "—"]), DEFAULT_NEXT_CONTRACT_NUMBER);
});
