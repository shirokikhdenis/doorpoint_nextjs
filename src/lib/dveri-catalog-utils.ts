import type {
  DveriCatalogFilters,
  DveriCatalogProduct,
  DveriSortKey,
} from "@/features/admin/dveri-catalog/types";

export function applyDiscount(price: number | null | undefined, discountPercent: number | null | undefined): number {
  const base = Number(price ?? 0);
  const discount = Number(discountPercent ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(discount) || discount <= 0) return Math.round(base);
  return Math.round(base * (1 - discount / 100));
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

function matchesSearch(product: DveriCatalogProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (product.title.toLowerCase().includes(q)) return true;
  if (product.vendorCode.toLowerCase().includes(q)) return true;
  if (product.options.some((opt) => opt.vendorCode.toLowerCase().includes(q))) return true;
  if (product.options.some((opt) => opt.title.toLowerCase().includes(q))) return true;

  return false;
}

export function sortProducts(products: DveriCatalogProduct[], sort: DveriSortKey): DveriCatalogProduct[] {
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const sign = dir === "asc" ? 1 : -1;

  return [...products].sort((a, b) => {
    if (field === "price") {
      const diff = a.priceFinal - b.priceFinal;
      if (diff !== 0) return diff * sign;
      return a.title.localeCompare(b.title, "ru");
    }

    if (field === "vendor") {
      const diff = a.vendorCode.localeCompare(b.vendorCode, "ru");
      if (diff !== 0) return diff * sign;
      return a.title.localeCompare(b.title, "ru");
    }

    return a.title.localeCompare(b.title, "ru", { sensitivity: "base" }) * sign;
  });
}

export function getFilteredProducts(
  products: DveriCatalogProduct[] | undefined,
  filters: DveriCatalogFilters,
): DveriCatalogProduct[] {
  if (!products) return [];

  const filtered = products.filter((product) => {
    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
    if (filters.trademarkId && product.trademarkId !== filters.trademarkId) return false;
    return matchesSearch(product, filters.search);
  });

  return sortProducts(filtered, filters.sort);
}

export function getProductById(
  products: DveriCatalogProduct[] | undefined,
  productId: number | string | null,
): DveriCatalogProduct | null {
  if (!products || productId == null) return null;
  return products.find((p) => String(p.id) === String(productId)) ?? null;
}
