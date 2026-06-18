/** Slug витрин каталога (`catalog_pages.slug`, query `catalogPage`). */
export const CATALOG_PAGE_SLUG = {
  all: "all",
  entryDoors: "vhodnye-dveri",
  thermalBreakDoors: "termo-dveri",
  interiorDoors: "dveri-mezhkomnatnyye",
  fittings: "furnitura",
} as const;

/** Старые slug → актуальные (301 с /catalog). */
export const LEGACY_CATALOG_PAGE_SLUG_ALIASES: Record<string, string> = {
  "entry-doors": CATALOG_PAGE_SLUG.entryDoors,
  "thermal-break-doors": CATALOG_PAGE_SLUG.thermalBreakDoors,
  "interior-doors": CATALOG_PAGE_SLUG.interiorDoors,
  fittings: CATALOG_PAGE_SLUG.fittings,
};

export const resolveCatalogPageSlug = (slug: string): string => {
  const trimmed = String(slug ?? "").trim() || CATALOG_PAGE_SLUG.all;
  return LEGACY_CATALOG_PAGE_SLUG_ALIASES[trimmed] ?? trimmed;
};

export const isLegacyCatalogPageSlug = (slug: string): boolean =>
  Object.prototype.hasOwnProperty.call(LEGACY_CATALOG_PAGE_SLUG_ALIASES, String(slug ?? "").trim());
