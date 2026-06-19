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

const shouldBypassImageOptimizer = (url) => {
  const normalized = toPublicImageSrc(url) || String(url ?? "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return false;
  return normalized.startsWith("/");
};

test("shouldBypassImageOptimizer for uploads and public paths", () => {
  assert.equal(shouldBypassImageOptimizer("/uploads/merged/a.jpg"), true);
  assert.equal(shouldBypassImageOptimizer("http://localhost:3000/uploads/a.jpg"), true);
  assert.equal(shouldBypassImageOptimizer("https://images.unsplash.com/x"), false);
});
