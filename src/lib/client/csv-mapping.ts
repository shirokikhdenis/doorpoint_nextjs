import type { CsvRow } from "@/lib/client/csv-parse";

export const SKIP_TARGET = "__skip__";

export type AttributeDef = {
  id: number;
  code: string;
  name: string;
  scope?: "product" | "variant";
  isVariantAxis?: boolean;
};

export type ColumnMapping = Record<string, string>;

export type TargetOption = {
  value: string;
  label: string;
};

export type TargetGroup = {
  label: string;
  options: TargetOption[];
};

const BASE_OPTIONS: TargetOption[] = [
  { value: "sku", label: "sku — SKU карточки (обязательно)" },
  { value: "name", label: "name — название" },
  { value: "category", label: "category — категория (поддерживает «Корень>>>Подкатегория»)" },
  { value: "subcategory", label: "subcategory — подкатегория" },
  { value: "price", label: "price — цена" },
  { value: "imageUrl", label: "imageUrl — ссылки на картинки (через пробел)" },
  { value: "model_key", label: "model_key — одна модель: цвет, стекло, размеры в вариантах" },
];

const VARIANT_OPTIONS: TargetOption[] = [
  { value: "variantSku", label: "variantSku — переопределение SKU варианта" },
  { value: "variantPrice", label: "variantPrice — цена варианта" },
  { value: "variantImageUrl", label: "variantImageUrl — картинка варианта" },
  { value: "variantAttributes", label: "variantAttributes — формат «code:value;code:value»" },
];

const isVariantScope = (attr: AttributeDef) =>
  attr.scope === "variant" || attr.isVariantAxis === true;

export const buildTargetGroups = (attributes: AttributeDef[]): TargetGroup[] => {
  const productAttrs = attributes.filter((a) => !isVariantScope(a));
  const variantAttrs = attributes.filter((a) => isVariantScope(a));

  const groups: TargetGroup[] = [
    { label: "Базовые поля", options: BASE_OPTIONS },
    { label: "Поля варианта", options: VARIANT_OPTIONS },
  ];

  if (productAttrs.length > 0) {
    groups.push({
      label: "Характеристики товара (attr:*)",
      options: productAttrs.map((attr) => ({
        value: `attr:${attr.code}`,
        label: `attr:${attr.code} — ${attr.name}`,
      })),
    });
  }
  if (variantAttrs.length > 0) {
    groups.push({
      label: "Оси вариантов (variant_attr:*)",
      options: variantAttrs.map((attr) => ({
        value: `variant_attr:${attr.code}`,
        label: `variant_attr:${attr.code} — ${attr.name}`,
      })),
    });
  }

  groups.push({
    label: "Прочее",
    options: [{ value: SKIP_TARGET, label: "— пропустить колонку —" }],
  });

  return groups;
};

const allKnownTargets = (groups: TargetGroup[]): Set<string> => {
  const set = new Set<string>();
  groups.forEach((g) => g.options.forEach((o) => set.add(o.value)));
  return set;
};

const normalize = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\s_\-]+/g, "");

const ALIASES: Record<string, string> = {
  sku: "sku",
  article: "sku",
  артикул: "sku",
  name: "name",
  title: "name",
  название: "name",
  наименование: "name",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  price: "price",
  цена: "price",
  imageurl: "imageUrl",
  image: "imageUrl",
  images: "imageUrl",
  photo: "imageUrl",
  картинка: "imageUrl",
  фото: "imageUrl",
  glass: "attr:glass",
  стекло: "attr:glass",
  modelkey: "model_key",
  модель: "model_key",
  variantsku: "variantSku",
  variantprice: "variantPrice",
  variantimage: "variantImageUrl",
  variantimageurl: "variantImageUrl",
  variantattributes: "variantAttributes",
};

export const autoDetectMapping = (
  headers: string[],
  attributes: AttributeDef[],
): ColumnMapping => {
  const groups = buildTargetGroups(attributes);
  const known = allKnownTargets(groups);
  const attrByCode = new Map(attributes.map((a) => [a.code.toLowerCase(), a]));
  const attrByName = new Map(attributes.map((a) => [normalize(a.name), a]));

  const result: ColumnMapping = {};
  for (const header of headers) {
    if (!header) continue;
    const trimmed = header.trim();
    if (known.has(trimmed)) {
      result[header] = trimmed;
      continue;
    }

    if (/^attr:/i.test(trimmed)) {
      const code = trimmed.slice("attr:".length).toLowerCase();
      const attr = attrByCode.get(code);
      result[header] = attr && !isVariantScope(attr) ? `attr:${attr.code}` : `attr:${code}`;
      continue;
    }
    if (/^variant_attr:/i.test(trimmed)) {
      const code = trimmed.slice("variant_attr:".length).toLowerCase();
      const attr = attrByCode.get(code);
      result[header] = attr && isVariantScope(attr) ? `variant_attr:${attr.code}` : `variant_attr:${code}`;
      continue;
    }
    if (/^attr_name:/i.test(trimmed)) {
      result[header] = trimmed;
      continue;
    }

    const lc = trimmed.toLowerCase();
    const norm = normalize(trimmed);
    if (ALIASES[lc]) {
      result[header] = ALIASES[lc];
      continue;
    }
    if (ALIASES[norm]) {
      result[header] = ALIASES[norm];
      continue;
    }

    const byCode = attrByCode.get(lc);
    if (byCode) {
      result[header] = isVariantScope(byCode)
        ? `variant_attr:${byCode.code}`
        : `attr:${byCode.code}`;
      continue;
    }
    const byName = attrByName.get(norm);
    if (byName) {
      result[header] = isVariantScope(byName)
        ? `variant_attr:${byName.code}`
        : `attr:${byName.code}`;
      continue;
    }

    result[header] = SKIP_TARGET;
  }
  return result;
};

export const applyMapping = (rows: CsvRow[], mapping: ColumnMapping): CsvRow[] => {
  if (rows.length === 0) return [];
  return rows.map((row) => {
    const out: CsvRow = {};
    for (const [csvHeader, target] of Object.entries(mapping)) {
      if (!target || target === SKIP_TARGET) continue;
      const raw = row[csvHeader];
      if (raw === undefined) continue;
      const value = String(raw);
      if (value === "" && out[target] !== undefined) continue;
      out[target] = value;
    }
    return out;
  });
};

export const fingerprintHeaders = (headers: string[]): string =>
  headers
    .map((h) => h.trim())
    .filter(Boolean)
    .sort()
    .join("|");

const STORAGE_PREFIX = "csv-import.mapping.";

export const loadStoredMapping = (headers: string[]): ColumnMapping | null => {
  if (typeof window === "undefined") return null;
  try {
    const fp = fingerprintHeaders(headers);
    if (!fp) return null;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + fp);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ColumnMapping;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const saveStoredMapping = (headers: string[], mapping: ColumnMapping): void => {
  if (typeof window === "undefined") return;
  try {
    const fp = fingerprintHeaders(headers);
    if (!fp) return;
    window.localStorage.setItem(STORAGE_PREFIX + fp, JSON.stringify(mapping));
  } catch {
    // ignore quota / private mode errors
  }
};
