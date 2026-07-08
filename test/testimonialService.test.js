const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validatePayload } = require("../src/lib/server/services/testimonialService");

test("validatePayload rejects short author name", () => {
  const result = validatePayload({ authorName: "A", body: "Достаточно длинный текст отзыва" });
  assert.equal(result.ok, false);
});

test("validatePayload rejects short body", () => {
  const result = validatePayload({ authorName: "Иван", body: "коротко" });
  assert.equal(result.ok, false);
});

test("validatePayload accepts valid payload without rating", () => {
  const result = validatePayload({
    authorName: "Иван Петров",
    body: "Отличный салон, помогли с выбором дверей.",
    sortOrder: 10,
    isActive: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.authorName, "Иван Петров");
  assert.equal(result.value.rating, null);
});

test("validatePayload rejects invalid rating", () => {
  const result = validatePayload({
    authorName: "Иван Петров",
    body: "Отличный салон, помогли с выбором дверей.",
    rating: 6,
  });
  assert.equal(result.ok, false);
});

test("validatePayload accepts rating 1-5", () => {
  const result = validatePayload({
    authorName: "Иван Петров",
    body: "Отличный салон, помогли с выбором дверей.",
    rating: 5,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.rating, 5);
});
