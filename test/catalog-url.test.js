const test = require("node:test");
const assert = require("node:assert/strict");
const { slugifyPart } = require("../src/lib/slugify-part");

const catalogPagePath = (slug) => {
  const resolved = String(slug || "all").trim() || "all";
  if (resolved === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(resolved)}`;
};

const manufacturerCatalogPath = (catalogPageSlug, manufacturerName) => {
  const base = catalogPagePath(catalogPageSlug);
  const slug = slugifyPart(manufacturerName) || "factory";
  return `${base}/${encodeURIComponent(slug)}`;
};

const manufacturerSlugFromPathname = (pathname) => {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  const prefix = "/catalog/";
  if (!normalized.startsWith(prefix)) return "";
  const parts = normalized.slice(prefix.length).split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return decodeURIComponent(parts[1] || "");
};

test("manufacturer landing path is /catalog/{vitrine}/{factory}", () => {
  assert.equal(
    manufacturerCatalogPath("dveri-mezhkomnatnyye", "Браво"),
    "/catalog/dveri-mezhkomnatnyye/bravo",
  );
});

test("slugifyPart transliterates factory names", () => {
  assert.equal(slugifyPart("Браво"), "bravo");
  assert.equal(slugifyPart("Промет"), "promet");
});

test("manufacturerSlugFromPathname reads the factory segment", () => {
  assert.equal(manufacturerSlugFromPathname("/catalog/dveri-mezhkomnatnyye/bravo"), "bravo");
  assert.equal(manufacturerSlugFromPathname("/catalog/dveri-mezhkomnatnyye"), "");
  assert.equal(manufacturerSlugFromPathname("/catalog"), "");
});
