const catalogPageFromQuery = (flat) => {
  const page = Math.floor(Number(flat?.page) || 1);
  return Number.isFinite(page) && page > 1 ? page : 1;
};

/** Filters and search must not compete in the index. Pagination is indexable. */
const catalogHasSeoNoise = (flat = {}) => {
  if (String(flat.search || "").trim()) return true;
  if (String(flat.categories || "").trim()) return true;
  if (String(flat.subcategories || "").trim()) return true;
  if (String(flat.minPrice || "").trim() || String(flat.maxPrice || "").trim()) return true;
  if (flat.onSale === "1") return true;
  if (String(flat.catalogLabel || "").trim()) return true;

  return Object.keys(flat).some((key) => {
    if (key === "page") return false;
    return key.startsWith("attr_");
  });
};

module.exports = {
  catalogPageFromQuery,
  catalogHasSeoNoise,
};
