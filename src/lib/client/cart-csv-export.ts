import type { CartItem } from "@/lib/client/cart-store";
import {
  buildCartCsv,
  resolveManufacturerIdFromProduct,
} from "@/lib/cart-csv-export.js";

export { buildCartCsv };

type ProductArticleLookup = {
  manufacturerId?: string;
  sku?: string;
};

const fetchProductArticleById = async (id: number, variantSku?: string) => {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) return { manufacturerId: "" };
    const data = (await response.json()) as {
      manufacturerId?: unknown;
      sku?: unknown;
      variants?: Array<{ sku?: unknown; manufacturerId?: unknown }>;
    };
    return {
      manufacturerId: resolveManufacturerIdFromProduct(data, variantSku),
      sku: String(data.sku || "").trim(),
    };
  } catch {
    return { manufacturerId: "" };
  }
};

export const resolveCartManufacturerArticle = (
  item: CartItem,
  lookup: Map<number, string> = new Map(),
) => {
  const fromItem = item.manufacturerId?.trim();
  if (fromItem) return fromItem;
  return lookup.get(item.id)?.trim() || "";
};

export const fetchCartManufacturerArticles = async (items: CartItem[]) => {
  const lookup = new Map<number, string>();

  for (const item of items) {
    if (item.id > 0 && item.manufacturerId?.trim()) {
      lookup.set(item.id, item.manufacturerId.trim());
    }
  }

  const missingIds = [
    ...new Set(
      items.filter((item) => item.id > 0 && !lookup.has(item.id)).map((item) => item.id),
    ),
  ];

  await Promise.all(
    missingIds.map(async (id) => {
      const item = items.find((entry) => entry.id === id);
      const { manufacturerId } = await fetchProductArticleById(id, item?.sku);
      if (manufacturerId) lookup.set(id, manufacturerId);
    }),
  );

  return lookup;
};

export const downloadCartCsv = async (items: CartItem[]) => {
  if (items.length === 0 || typeof window === "undefined") return;

  const articleLookup = await fetchCartManufacturerArticles(items);
  const articleById = new Map<number, ProductArticleLookup>();
  for (const [id, manufacturerId] of articleLookup) {
    articleById.set(id, { manufacturerId });
  }

  const csv = buildCartCsv(items, articleById);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `korzina-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
