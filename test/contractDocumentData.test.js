const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatContractPrice,
  formatContractDate,
  resolveContractNumber,
  buildContractData,
  buildContractFilename,
} = require("../src/lib/server/domain/contractDocumentData");

test("formatContractPrice formats rubles without decimals", () => {
  assert.match(formatContractPrice(12000), /12\s?000/);
});

test("formatContractDate formats ISO date in Russian", () => {
  assert.match(formatContractDate("2026-06-15"), /2026/);
});

test("resolveContractNumber uses explicit number or lead id fallback", () => {
  assert.equal(resolveContractNumber({ contractNumber: "Д-100", id: 5 }), "Д-100");
  assert.equal(resolveContractNumber({ id: 42 }), "Д-42");
});

test("buildContractData maps lead fields and item lines", () => {
  const data = buildContractData({
    id: 7,
    customerName: "Иванов Иван",
    phone: "+79001234567",
    address: "Москва",
    contractNumber: "Д-007",
    contractDate: "2026-06-15",
    totalPrice: 24000,
    items: [
      { name: "Дверь", sku: "D1", color: "Белый", price: 12000, quantity: 2 },
    ],
  });

  assert.equal(data.customerName, "Иванов Иван");
  assert.equal(data.contractNumber, "Д-007");
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].index, 1);
  assert.equal(data.items[0].kolvo, 2);
  assert.equal(data.items[0].cena, data.items[0].priceFormatted);
  assert.equal(data.items[0].summa, data.items[0].lineTotalFormatted);
  assert.match(data.items[0].lineTotalFormatted, /24/);
  assert.match(data.totalPriceFormatted, /24/);
  assert.equal(data.itogo, data.totalPriceFormatted);
  assert.match(data.itogoPropisju, /рубл/);
  assert.match(data.itogoSlovami, /тысяч/i);
});

test("buildContractFilename sanitizes contract number", () => {
  assert.equal(buildContractFilename({ contractNumber: "Д/007", id: 1 }), "dogovor-Д-007.docx");
});
