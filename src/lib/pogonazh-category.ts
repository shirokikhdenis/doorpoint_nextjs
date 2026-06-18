/** Категория комплектующего / погонажа — не индексируем как отдельные landing-страницы. */
export const isPogonazhCategoryLabel = (
  category?: string | null,
  categorySlug?: string | null,
): boolean => {
  const name = String(category ?? "").trim().toLowerCase();
  const slug = String(categorySlug ?? "").trim().toLowerCase();
  if (name.includes("погонаж")) return true;
  if (slug.includes("погонаж")) return true;
  if (slug.includes("pogonazh") || slug.includes("molding") || slug.includes("trim")) {
    return true;
  }
  return false;
};

export const isPogonazhCatalogPageSlug = (slug?: string | null): boolean => {
  const value = String(slug ?? "").trim().toLowerCase();
  if (!value) return false;
  return (
    value.includes("pogonazh") ||
    value.includes("погонаж") ||
    value.includes("molding") ||
    value.includes("trim")
  );
};
