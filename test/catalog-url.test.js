const test = require("node:test");
const assert = require("node:assert/strict");
const { slugifyPart } = require("../src/lib/slugify-part");

const catalogPagePath = (slug) => {
  const resolved = String(slug || "all").trim() || "all";
  if (resolved === "all") return "/catalog";
  return `/catalog/${encodeURIComponent(resolved)}`;
};

const manufacturerCatalogPath = (catalogPageSlug, manufacturerName) => {
  const resolved = String(catalogPageSlug || "all").trim() || "all";
  const base = catalogPagePath(resolved);
  if (resolved === "all") return base;
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

test("general catalog does not put factory in path (avoids /catalog/{factory} 404)", () => {
  assert.equal(manufacturerCatalogPath("all", "Аэлита"), "/catalog");
  assert.equal(manufacturerCatalogPath("all", "Браво"), "/catalog");
});

test("general catalog keeps factory as query, vitrine uses path segment", () => {
  const catalogHrefFromFilters = (catalogPage, manufacturer) => {
    const path = manufacturer
      ? manufacturerCatalogPath(catalogPage, manufacturer)
      : catalogPagePath(catalogPage);
    const params = new URLSearchParams();
    if (manufacturer) params.set("attr_manufacturer", manufacturer);
    const usesManufacturerPath = Boolean(manufacturer) && path !== catalogPagePath(catalogPage);
    if (usesManufacturerPath) params.delete("attr_manufacturer");
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  assert.equal(
    catalogHrefFromFilters("all", "Аэлита"),
    `/catalog?attr_manufacturer=${encodeURIComponent("Аэлита")}`,
  );
  assert.equal(catalogHrefFromFilters("dveri-mezhkomnatnyye", "Аэлита"), "/catalog/dveri-mezhkomnatnyye/aelita");
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

const catalogHrefsEquivalent = (left, right) => {
  const normalizePathname = (pathname) =>
    pathname
      .split("/")
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })
      .join("/");
  const parse = (href) => {
    const url = new URL(href, "http://catalog.local");
    const pairs = [...url.searchParams.entries()].sort(([aK, aV], [bK, bV]) =>
      aK === bK ? aV.localeCompare(bV) : aK.localeCompare(bK),
    );
    return { path: normalizePathname(url.pathname), pairs };
  };
  const a = parse(left);
  const b = parse(right);
  if (a.path !== b.path || a.pairs.length !== b.pairs.length) return false;
  return a.pairs.every(([key, value], index) => {
    const other = b.pairs[index];
    return other[0] === key && other[1] === value;
  });
};

test("catalogHrefsEquivalent ignores encoding and query order", () => {
  const encoded =
    "/catalog/dveri-mezhkomnatnyye/bravo?attr_color=%D0%91%D0%B5%D0%BB%D1%8B%D0%B9&attr_edge=%D0%94%D0%B0";
  const decoded = "/catalog/dveri-mezhkomnatnyye/bravo?attr_edge=Да&attr_color=Белый";
  assert.equal(catalogHrefsEquivalent(encoded, decoded), true);
  assert.equal(catalogHrefsEquivalent(decoded, `${decoded}&catalogLabel=3`), false);
});
