const test = require("node:test");
const assert = require("node:assert/strict");

const stepGalleryImage = (urls, current, delta) => {
  if (urls.length < 2) return current;
  const index = urls.indexOf(current);
  const from = index >= 0 ? index : 0;
  return urls[(from + delta + urls.length) % urls.length];
};

test("stepGalleryImage wraps around the gallery", () => {
  const urls = ["/a.jpg", "/b.jpg", "/c.jpg"];
  assert.equal(stepGalleryImage(urls, "/a.jpg", 1), "/b.jpg");
  assert.equal(stepGalleryImage(urls, "/c.jpg", 1), "/a.jpg");
  assert.equal(stepGalleryImage(urls, "/a.jpg", -1), "/c.jpg");
});

test("stepGalleryImage stays on current when fewer than two photos", () => {
  assert.equal(stepGalleryImage(["/a.jpg"], "/a.jpg", 1), "/a.jpg");
  assert.equal(stepGalleryImage([], "/a.jpg", 1), "/a.jpg");
});
