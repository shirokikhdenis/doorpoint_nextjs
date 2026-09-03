const test = require("node:test");
const assert = require("node:assert/strict");

const CART_KP_DOOR_SLUGS = new Set(["entry-doors", "interior-doors"]);

const listCartKpDoors = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!CART_KP_DOOR_SLUGS.has(String(item.categorySlug || "").trim())) continue;
    if (item.noProductLink === true || item.hideCartImage === true) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
};

test("listCartKpDoors keeps unique entry and interior doors", () => {
  const doors = listCartKpDoors([
    { id: 1, categorySlug: "interior-doors", name: "A" },
    { id: 1, categorySlug: "interior-doors", name: "A" },
    { id: 2, categorySlug: "entry-doors", name: "B" },
    { id: 3, categorySlug: "fittings", name: "Handle" },
    { id: 4, categorySlug: "interior-doors", noProductLink: true, name: "Hidden" },
  ]);
  assert.deepEqual(
    doors.map((item) => item.id),
    [1, 2],
  );
});
