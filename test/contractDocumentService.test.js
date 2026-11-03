const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { renderContractDocx } = require("../src/lib/server/services/contractDocumentService");

test("renderContractDocx produces non-empty docx buffer", async () => {
  const templatePath = path.join(process.cwd(), "src", "templates", "contracts", "contract.docx");
  await fs.access(templatePath);

  const buffer = await renderContractDocx({
    id: 1,
    customerName: "Тестов Тест",
    phone: "+79001234567",
    address: "Санкт-Петербург",
    contractNumber: "Д-TEST",
    contractDate: "2026-06-15",
    totalPrice: 10000,
    createdAt: "2026-06-15T10:00:00.000Z",
    items: [{ name: "Дверь", sku: "SKU1", color: "Белый", price: 10000, quantity: 1 }],
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 2).toString("utf8"), "PK");
});

test("renderContractDocx embeds discounted total and skidka", async () => {
  const PizZip = require("pizzip");
  const buffer = await renderContractDocx({
    id: 2,
    customerName: "Тестов Тест",
    phone: "+79001234567",
    address: "Архангельск",
    contractNumber: "Д-DISC",
    contractDate: "2026-06-15",
    discountKind: "amount",
    discountValue: 1500,
    items: [{ name: "Дверь", sku: "SKU1", color: "Белый", price: 10000, quantity: 1 }],
  });

  const zip = new PizZip(buffer);
  const text = zip
    .file("word/document.xml")
    .asText()
    .replace(/<[^>]+>/g, " ");

  assert.match(text, /8[\s\u00a0]?500/);
  assert.match(text, /1[\s\u00a0]?500/);
  assert.match(text, /Скидка/);
  assert.match(text, /Сумма без скидки/);
  assert.doesNotMatch(text, /\{skidka\}/);
  assert.doesNotMatch(text, /\{itogo\}/);
});
