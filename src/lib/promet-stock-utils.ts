import type { PrometStockFilters, PrometStockRow, SortKey, WarehouseBreakdownItem } from "@/features/admin/promet-stock/types";

export function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export function stockToneClass(v: number, mutedClass = "text-zinc-500"): string {
  if (v < 0) return "text-red-600";
  if (v === 0) return mutedClass;
  return "text-emerald-600";
}

export function warehouseLabel(col: string): string {
  return col.replace(/^Факт_/, "");
}

export function getWarehouses(columns: string[] | undefined): string[] {
  return (columns ?? []).filter((c) => c.startsWith("Факт_"));
}

export function getStockValue(row: PrometStockRow, warehouseCol: string): number {
  return warehouseCol ? Number(row[warehouseCol] ?? 0) : Number(row["Факт"] ?? 0);
}

export function sortRows(
  rows: PrometStockRow[],
  sort: SortKey,
  warehouseCol: string,
): PrometStockRow[] {
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const sign = dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (field === "stock") {
      const diff = getStockValue(a, warehouseCol) - getStockValue(b, warehouseCol);
      if (diff !== 0) return diff * sign;
      return String(a["Наименование"] ?? "").localeCompare(String(b["Наименование"] ?? ""), "ru");
    }

    if (field === "price") {
      const diff = Number(a["Цена"] ?? 0) - Number(b["Цена"] ?? 0);
      if (diff !== 0) return diff * sign;
      return String(a["Наименование"] ?? "").localeCompare(String(b["Наименование"] ?? ""), "ru");
    }

    return (
      String(a["Наименование"] ?? "").localeCompare(String(b["Наименование"] ?? ""), "ru", {
        sensitivity: "base",
      }) * sign
    );
  });
}

export function getFilteredRows(
  data: PrometStockRow[] | undefined,
  filters: PrometStockFilters,
): PrometStockRow[] {
  if (!data) return [];

  const q = filters.search.trim().toLowerCase();
  const wh = filters.warehouseCol;

  const filtered = data.filter((row) => {
    if (filters.group && row["Группа"] !== filters.group) return false;

    const stockVal = wh ? Number(row[wh] ?? 0) : Number(row["Факт"] ?? 0);
    if (filters.onlyInStock && stockVal <= 0) return false;

    if (!q) return true;
    const art = String(row["Артикул"] ?? "").toLowerCase();
    const name = String(row["Наименование"] ?? "").toLowerCase();
    return art.includes(q) || name.includes(q);
  });

  return sortRows(filtered, filters.sort, filters.warehouseCol);
}

export function getRowByProductId(
  data: PrometStockRow[] | undefined,
  id: string | number | null,
): PrometStockRow | undefined {
  if (id == null || !data) return undefined;
  return data.find((row) => String(row["ID товара"]) === String(id));
}

export function getWarehouseBreakdown(
  row: PrometStockRow,
  warehouses: string[],
): WarehouseBreakdownItem[] {
  const items = warehouses.map((col) => ({
    name: warehouseLabel(col),
    col,
    stock: Number(row[col] ?? 0),
  }));

  items.sort((a, b) => {
    if (a.stock !== b.stock) return b.stock - a.stock;
    return a.name.localeCompare(b.name, "ru");
  });

  return items;
}

export function extractGroups(data: PrometStockRow[] | undefined): string[] {
  return [
    ...new Set(
      (data ?? [])
        .map((row) => row["Группа"])
        .filter((g) => g != null && String(g).trim() !== "")
        .map((g) => String(g)),
    ),
  ].sort((a, b) => a.localeCompare(b, "ru"));
}

export function resolveDefaultGroup(groups: string[], preferred: string): string {
  return groups.includes(preferred) ? preferred : "";
}

export function resolveDefaultWarehouse(warehouses: string[], preferred: string): string {
  return warehouses.includes(preferred) ? preferred : "";
}
