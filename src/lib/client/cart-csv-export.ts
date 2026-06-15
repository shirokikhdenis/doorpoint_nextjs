import type { CartItem } from "@/lib/client/cart-store";

const CSV_DELIMITER = ";";

const escapeCsvCell = (value: string) => {
  const text = String(value ?? "");
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const formatCartLineName = (item: CartItem) => {
  const name = item.name.trim();
  const color = item.color?.trim();
  return color ? `${name} (${color})` : name;
};

const resolveSku = (item: CartItem, skuById: Map<number, string>) =>
  item.sku?.trim() || skuById.get(item.id)?.trim() || "";

export const buildCartCsv = (items: CartItem[], skuById: Map<number, string> = new Map()) => {
  const header = ["наименование", "артикул", "количество", "цена"];
  const rows = items.map((item) =>
    [
      escapeCsvCell(formatCartLineName(item)),
      escapeCsvCell(resolveSku(item, skuById)),
      String(item.quantity),
      String(Number(item.price) || 0),
    ].join(CSV_DELIMITER),
  );
  return `\uFEFF${[header.join(CSV_DELIMITER), ...rows].join("\r\n")}`;
};

const fetchSkuById = async (id: number) => {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) return "";
    const data = (await response.json()) as { sku?: string };
    return String(data.sku || "").trim();
  } catch {
    return "";
  }
};

export const downloadCartCsv = async (items: CartItem[]) => {
  if (items.length === 0 || typeof window === "undefined") return;

  const missingIds = [
    ...new Set(items.filter((item) => !item.sku?.trim()).map((item) => item.id)),
  ];
  const skuById = new Map<number, string>();
  await Promise.all(
    missingIds.map(async (id) => {
      const sku = await fetchSkuById(id);
      if (sku) skuById.set(id, sku);
    }),
  );

  const csv = buildCartCsv(items, skuById);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `korzina-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
