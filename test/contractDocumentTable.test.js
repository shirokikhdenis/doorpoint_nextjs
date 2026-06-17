const test = require("node:test");
const assert = require("node:assert/strict");
const PizZip = require("pizzip");
const { renderContractDocx } = require("../src/lib/server/services/contractDocumentService");

const readDocumentXml = (buffer) => {
  const zip = new PizZip(buffer);
  return zip.file("word/document.xml").asText();
};

test("renderContractDocx duplicates table row per item", async () => {
  const buffer = await renderContractDocx({
    id: 1,
    customerName: "Тестов Тест",
    phone: "+79001234567",
    address: "Санкт-Петербург",
    contractNumber: "Д-TEST",
    contractDate: "2026-06-15",
    totalPrice: 25000,
    createdAt: "2026-06-15T10:00:00.000Z",
    items: [
      { name: "Сейф FRS-36.KL", sku: "S1", color: "", price: 23702, quantity: 1 },
      { name: "Коробка", sku: "K1", color: "", price: 500, quantity: 5 },
      { name: "дверь", sku: "D1", color: "Белый", price: 61, quantity: 2 },
    ],
  });

  const xml = readDocumentXml(buffer);
  const itemRowCount = (xml.match(/<w:tr[\s>]/g) || []).length;
  assert.ok(xml.includes("Сейф FRS-36.KL"));
  assert.ok(xml.includes("Коробка"));
  assert.ok(xml.includes("дверь"));
  // header + N item rows + total row
  assert.ok(itemRowCount >= 5);
});
