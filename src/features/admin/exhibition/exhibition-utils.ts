import { formatProductDisplayName } from "@/lib/client/product-display-name";
import { CATEGORY_LABELS } from "./constants";
import type {
  ExhibitionDoorRow,
  ExhibitionFilters,
  ExhibitionMeta,
  ExhibitionTableSection,
  GroupByKey,
  ProductSearchRow,
  SortKey,
} from "./types";

const trimAttrValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value).trim();
};

export function formatProductSearchLabel(
  row: Pick<ProductSearchRow, "name" | "color" | "glass">,
): string {
  return formatProductDisplayName({
    name: row.name,
    color: row.color,
    glass: row.glass,
  });
}

export function mapApiRowToProductSearch(row: {
  id: unknown;
  name: unknown;
  sku: unknown;
  primaryImageUrl?: unknown;
  attributes?: Record<string, unknown>;
}): ProductSearchRow {
  const attributes = row.attributes ?? {};

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    sku: String(row.sku ?? ""),
    primaryImageUrl: row.primaryImageUrl ? String(row.primaryImageUrl) : undefined,
    color: trimAttrValue(attributes.color) || null,
    glass: trimAttrValue(attributes.glass) || null,
  };
}

const EMPTY_MANUFACTURER_LABEL = "Без фабрики";

export function getCategoryLabel(
  categoryType: ExhibitionDoorRow["categoryType"],
  meta?: ExhibitionMeta,
): string {
  if (categoryType === "entry") {
    return meta?.categoryLabels.entry || CATEGORY_LABELS.entry;
  }
  return meta?.categoryLabels.interior || CATEGORY_LABELS.interior;
}

export function getGroupKey(
  row: ExhibitionDoorRow,
  groupBy: GroupByKey,
  meta?: ExhibitionMeta,
): string {
  if (groupBy === "category") return row.categoryType;
  if (groupBy === "manufacturer") {
    return row.manufacturerName.trim() || EMPTY_MANUFACTURER_LABEL;
  }
  return "";
}

export function getGroupLabel(
  key: string,
  groupBy: GroupByKey,
  meta?: ExhibitionMeta,
): string {
  if (groupBy === "category") {
    if (key === "entry") return getCategoryLabel("entry", meta);
    if (key === "interior") return getCategoryLabel("interior", meta);
    return key;
  }
  if (groupBy === "manufacturer") {
    return key || EMPTY_MANUFACTURER_LABEL;
  }
  return key;
}

export function sortRows(rows: ExhibitionDoorRow[], sort: SortKey): ExhibitionDoorRow[] {
  const [field, dir] = sort.split("-") as [string, "asc" | "desc"];
  const sign = dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (field === "price") {
      const diff = (a.price ?? 0) - (b.price ?? 0);
      if (diff !== 0) return diff * sign;
      return a.productName.localeCompare(b.productName, "ru");
    }

    if (field === "kitPrice") {
      const diff = (a.kitPrice ?? 0) - (b.kitPrice ?? 0);
      if (diff !== 0) return diff * sign;
      return a.productName.localeCompare(b.productName, "ru");
    }

    if (field === "manufacturer") {
      const diff = a.manufacturerName.localeCompare(b.manufacturerName, "ru", {
        sensitivity: "base",
      });
      if (diff !== 0) return diff * sign;
      return a.productName.localeCompare(b.productName, "ru");
    }

    return a.productName.localeCompare(b.productName, "ru", { sensitivity: "base" }) * sign;
  });
}

export function compareGroupKeys(
  a: string,
  b: string,
  groupBy: GroupByKey,
): number {
  if (groupBy === "category") {
    const order = { entry: 0, interior: 1 };
    const aRank = order[a as keyof typeof order] ?? 99;
    const bRank = order[b as keyof typeof order] ?? 99;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b, "ru");
  }
  if (a === EMPTY_MANUFACTURER_LABEL && b !== EMPTY_MANUFACTURER_LABEL) return 1;
  if (b === EMPTY_MANUFACTURER_LABEL && a !== EMPTY_MANUFACTURER_LABEL) return -1;
  return a.localeCompare(b, "ru", { sensitivity: "base" });
}

export function filterRows(
  rows: ExhibitionDoorRow[],
  filters: ExhibitionFilters,
  meta?: ExhibitionMeta,
): ExhibitionDoorRow[] {
  const q = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.categoryType && row.categoryType !== filters.categoryType) return false;

    if (filters.manufacturer && row.manufacturerName !== filters.manufacturer) return false;

    if (filters.groupFilter && filters.groupBy !== "none") {
      const groupKey = getGroupKey(row, filters.groupBy, meta);
      if (groupKey !== filters.groupFilter) return false;
    }

    if (!q) return true;

    const haystack = [
      row.productName,
      row.productSku,
      row.coatingColor,
      row.coatingType,
      row.manufacturerName,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function buildGroupedSections(
  rows: ExhibitionDoorRow[],
  filters: ExhibitionFilters,
  meta?: ExhibitionMeta,
): ExhibitionTableSection[] {
  const filtered = filterRows(rows, filters, meta);
  const sorted = sortRows(filtered, filters.sort);

  if (filters.groupBy === "none") {
    return sorted.length > 0 ? [{ key: "all", label: "", rows: sorted }] : [];
  }

  const groups = new Map<string, ExhibitionDoorRow[]>();
  for (const row of sorted) {
    const key = getGroupKey(row, filters.groupBy, meta);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => compareGroupKeys(a, b, filters.groupBy))
    .map(([key, groupRows]) => ({
      key,
      label: getGroupLabel(key, filters.groupBy, meta),
      rows: groupRows,
    }));
}

export function extractGroupFilterOptions(
  rows: ExhibitionDoorRow[],
  groupBy: GroupByKey,
  meta?: ExhibitionMeta,
): string[] {
  if (groupBy === "none") return [];
  const keys = new Set(rows.map((row) => getGroupKey(row, groupBy, meta)));
  return [...keys].sort((a, b) => compareGroupKeys(a, b, groupBy));
}

export function flattenSections(sections: ExhibitionTableSection[]): ExhibitionDoorRow[] {
  return sections.flatMap((section) => section.rows);
}

export function countRows(sections: ExhibitionTableSection[]): number {
  return sections.reduce((sum, section) => sum + section.rows.length, 0);
}

export function paginateSections(
  sections: ExhibitionTableSection[],
  page: number,
  pageSize: number,
): ExhibitionTableSection[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  let index = 0;
  const result: ExhibitionTableSection[] = [];

  for (const section of sections) {
    const rows: ExhibitionDoorRow[] = [];
    for (const row of section.rows) {
      if (index >= start && index < end) {
        rows.push(row);
      }
      index += 1;
    }
    if (rows.length > 0) {
      result.push({
        key: section.key,
        label: section.label,
        rows,
      });
    }
  }

  return result;
}
