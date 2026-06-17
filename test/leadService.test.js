const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePhone,
  parseContractDate,
  computeItemsTotal,
  validateAdminOrderPayload,
  validateCartLeadPayload,
  validateMeasureLeadPayload,
  validateLeadStatusUpdate,
  CART_LEAD_TYPE,
  MEASURE_LEAD_TYPE,
} = require("../src/lib/server/domain/leadValidation");

test("normalizePhone strips formatting characters", () => {
  assert.equal(normalizePhone("+7 (900) 123-45-67"), "+79001234567");
});

test("parseContractDate accepts ISO date", () => {
  assert.deepEqual(parseContractDate("2026-06-15"), { value: "2026-06-15" });
});

test("parseContractDate rejects invalid value", () => {
  assert.equal(parseContractDate("15.06.2026").error, "Некорректная дата договора");
});

test("computeItemsTotal sums line totals", () => {
  const total = computeItemsTotal([
    { price: 1000, quantity: 2 },
    { price: 500, quantity: 1 },
  ]);
  assert.equal(total, 2500);
});

test("validateAdminOrderPayload requires customer name and phone", () => {
  const result = validateAdminOrderPayload({
    customerName: "И",
    phone: "123",
    items: [{ name: "Дверь", price: 1000, quantity: 1 }],
  });
  assert.equal(result.ok, false);
});

test("validateAdminOrderPayload accepts valid admin order", () => {
  const result = validateAdminOrderPayload({
    customerName: "Иванов Иван",
    address: "Москва, ул. Примерная, 1",
    phone: "+7 900 123-45-67",
    contractNumber: "Д-001",
    contractDate: "2026-06-15",
    items: [
      { id: 10, name: "Дверь", sku: "D-1", color: "Белый", price: 12000, quantity: 2 },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.customerName, "Иванов Иван");
  assert.equal(result.data.phone, "+79001234567");
  assert.equal(result.data.totalPrice, 24000);
  assert.equal(result.data.items.length, 1);
});

test("validateAdminOrderPayload requires at least one item", () => {
  const result = validateAdminOrderPayload({
    customerName: "Иванов Иван",
    phone: "+79001234567",
    items: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /позици/i);
});

test("validateLeadStatusUpdate rejects unknown status", () => {
  const result = validateLeadStatusUpdate({ status: "archived" });
  assert.equal(result.ok, false);
});

test("validateLeadStatusUpdate accepts status and notes", () => {
  const result = validateLeadStatusUpdate({
    status: "in_progress",
    managerNotes: "Перезвонить завтра",
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "in_progress");
  assert.equal(result.data.managerNotes, "Перезвонить завтра");
});

test("validateCartLeadPayload accepts valid cart lead", () => {
  const result = validateCartLeadPayload(
    {
      name: "Иван",
      phone: "+7 900 123-45-67",
      comment: "Нужна доставка",
      items: [{ id: 1, name: "Дверь", sku: "D-1", color: "Белый", price: 10000, quantity: 1 }],
    },
    { sourcePage: "https://example.com/cart" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.type, CART_LEAD_TYPE);
  assert.equal(result.data.customerName, "Иван");
  assert.equal(result.data.clientComment, "Нужна доставка");
  assert.equal(result.data.sourcePage, "https://example.com/cart");
  assert.equal(result.data.totalPrice, 10000);
  assert.equal(result.data.items.length, 1);
});

test("validateCartLeadPayload rejects honeypot", () => {
  const result = validateCartLeadPayload({
    name: "Иван",
    phone: "+79001234567",
    website: "spam",
    items: [{ id: 1, name: "Дверь", price: 1000, quantity: 1 }],
  });
  assert.equal(result.ok, false);
});

test("validateCartLeadPayload rejects empty cart", () => {
  const result = validateCartLeadPayload({
    name: "Иван",
    phone: "+79001234567",
    items: [],
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /корзин/i);
});

test("validateMeasureLeadPayload accepts valid measure lead", () => {
  const result = validateMeasureLeadPayload(
    {
      name: "Пётр",
      phone: "89001234567",
      comment: "Замер в субботу",
    },
    { sourcePage: "https://example.com/" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.type, MEASURE_LEAD_TYPE);
  assert.equal(result.data.customerName, "Пётр");
  assert.equal(result.data.clientComment, "Замер в субботу");
  assert.equal(result.data.sourcePage, "https://example.com/");
  assert.equal(result.data.totalPrice, 0);
  assert.deepEqual(result.data.items, []);
});

test("validateMeasureLeadPayload rejects honeypot", () => {
  const result = validateMeasureLeadPayload({
    name: "Пётр",
    phone: "+79001234567",
    website: "bot",
  });
  assert.equal(result.ok, false);
});
