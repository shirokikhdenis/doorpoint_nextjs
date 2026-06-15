const test = require("node:test");
const assert = require("node:assert/strict");

const PLACEHOLDER_IMAGES = new Set(["x", "-", "n/a", "na", "null", "undefined", "none"]);

const toPublicImageSrc = (url) => {
  const raw = String(url ?? "").trim();
  if (!raw || PLACEHOLDER_IMAGES.has(raw.toLowerCase())) return "";
  if (raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
  } catch {
    /* not a URL */
  }
  return "";
};

test("toPublicImageSrc strips localhost origin from uploads path", () => {
  assert.equal(
    toPublicImageSrc("http://localhost:3000/uploads/merged/30301_merged.jpg"),
    "/uploads/merged/30301_merged.jpg",
  );
});

test("toPublicImageSrc keeps relative uploads path", () => {
  assert.equal(toPublicImageSrc("/uploads/merged/30301_merged.jpg"), "/uploads/merged/30301_merged.jpg");
});

test("toPublicImageSrc keeps external remote URLs", () => {
  assert.equal(
    toPublicImageSrc("https://images.unsplash.com/photo-1"),
    "https://images.unsplash.com/photo-1",
  );
});

test("toPublicImageSrc drops DB placeholder X", () => {
  assert.equal(toPublicImageSrc("X"), "");
  assert.equal(toPublicImageSrc(" x "), "");
});

test("toPublicImageSrc drops bare relative paths without leading slash", () => {
  assert.equal(toPublicImageSrc("uploads/foo.jpg"), "");
});
