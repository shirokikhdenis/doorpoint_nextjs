type ProductLinkSource = {
  id: number;
  slug?: string | null;
};

/** Публичный URL карточки товара: `/product/bravo-22-snow-art`. */
export function productHref(product: ProductLinkSource): string {
  const slug = String(product.slug ?? "").trim();
  if (slug) return `/product/${slug}`;
  return `/product/${product.id}`;
}
