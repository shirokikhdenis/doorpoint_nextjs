const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDoorsSummary,
  parseInstallDate,
  parseBrigadeColor,
  parseCalendarEntryKind,
  resolveInstallEndDate,
} = require("../src/lib/server/domain/interiorInstall");

test("buildDoorsSummary skips montage and delivery lines without productId", () => {
  const summary = buildDoorsSummary([
    { productId: 1, name: "Порта", color: "Белый", quantity: 2 },
    { productId: null, name: "Монтаж (ориентировочно)", quantity: 1 },
    { productId: null, name: "Доставка", quantity: 1 },
    { productId: 2, name: "Ручка", color: "", quantity: 1 },
  ]);
  assert.equal(summary, "Порта Белый × 2\nРучка");
});

test("parseInstallDate accepts valid calendar dates only", () => {
  assert.equal(parseInstallDate("2026-08-27"), "2026-08-27");
  assert.equal(parseInstallDate("2026-02-30"), null);
  assert.equal(parseInstallDate("27.08.2026"), null);
});

test("resolveInstallEndDate keeps a consecutive range and rejects inverted dates", () => {
  assert.equal(resolveInstallEndDate("2026-08-27", ""), "2026-08-27");
  assert.equal(resolveInstallEndDate("2026-08-27", "2026-08-29"), "2026-08-29");
  assert.equal(resolveInstallEndDate("2026-08-29", "2026-08-27"), null);
  assert.equal(resolveInstallEndDate("2026-08-27", "27.08.2026"), null);
});

test("parseCalendarEntryKind accepts install and delivery", () => {
  assert.equal(parseCalendarEntryKind("delivery"), "delivery");
  assert.equal(parseCalendarEntryKind("install"), "install");
  assert.equal(parseCalendarEntryKind("other"), "install");
  assert.equal(parseCalendarEntryKind("", "delivery"), "delivery");
});

test("parseBrigadeColor keeps hex and falls back otherwise", () => {
  assert.equal(parseBrigadeColor("#AABBCC"), "#aabbcc");
  assert.equal(parseBrigadeColor("blue", "#2563eb"), "#2563eb");
});
