export type CatalogPageItem = { slug: string; name: string; isDefault?: boolean };
export type CatalogAttributeFilter = {
  code: string;
  name: string;
  type: "number" | "option" | "text" | "boolean";
  unit: string | null;
  values?: string[];
  min?: number;
  max?: number;
};
export type CatalogLabelFilter = { code: string; value: string };
export type CatalogLabel = {
  id: number;
  title: string;
  imageUrl: string | null;
  sortOrder: number;
  filters: CatalogLabelFilter[];
};
export type CatalogMeta = {
  categories: Array<{ slug: string; name: string }>;
  subcategories: Array<{ slug: string; name: string; categorySlug: string }>;
  attributeFilters: CatalogAttributeFilter[];
  price: { min: number; max: number };
  labels: CatalogLabel[];
};
export type ProductGlassOption = { id: number; label: string };
/** Корневая категория «Входные двери» в сиде и каталоге. */
export const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";

export type ProductCard = {
  id: number;
  name: string;
  color?: string;
  image?: string;
  /** Второе фото (hover) из product_images, sort_order второй. */
  hoverImage?: string;
  category?: string;
  categorySlug?: string;
  price: number;
  /** Варианты стекла той же модели (тот же model_key + name, тот же color); для чипов в выдаче. */
  glassOptions?: ProductGlassOption[];
};

/** Две картинки в ряд на витрине — только для группы «Входные двери». */
export const isEntryDoorCatalogItem = (item: Pick<ProductCard, "categorySlug" | "category">): boolean =>
  item.categorySlug === ENTRY_DOORS_CATEGORY_SLUG ||
  String(item.category || "")
    .toLowerCase()
    .includes("входн");
export type VariantAttribute = {
  code: string;
  name: string;
  value: string;
  rawValue?: string;
  isVariantAxis?: boolean;
};
export type Variant = {
  sku: string;
  price: number;
  image?: string;
  attributes: VariantAttribute[];
};
export type ColorVariant = {
  id: number;
  color: string;
  image: string;
  isCurrent: boolean;
};
export type GlassVariant = {
  id: number;
  glass: string;
  image: string;
  isCurrent: boolean;
};
export type AccessoryItem = {
  id: number;
  sku: string;
  name: string;
  price: number;
  image: string;
  category: string;
  attributes: Array<{ code: string; name: string; value: string }>;
};
export type ProductData = {
  id: number;
  name: string;
  price: number;
  image?: string;
  images: string[];
  category?: string;
  subcategory?: string;
  attributes: Array<{ code: string; name: string; value: string }>;
  variants: Variant[];
  colorVariants: ColorVariant[];
  glassVariants: GlassVariant[];
  accessories: AccessoryItem[];
};

export type AdminCatalogPage = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  categories: Array<{ id: number; name: string; slug: string }>;
  subcategories: Array<{ id: number; name: string; slug: string; categorySlug: string | null }>;
  filterAttributes: Array<{ id: number; code: string; name: string; type: string }>;
};

export type AdminBootstrap = {
  categories: Array<{ id: number; name: string; slug: string }>;
  subcategories: Array<{ id: number; name: string; slug?: string; categoryId: number }>;
  attributes: Array<{ id: number; name: string; code: string; isVariantAxis?: boolean }>;
  products: Array<{ id: number; sku: string; name: string }>;
  catalogPages: AdminCatalogPage[];
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const normalizeCatalogPages = (value: unknown): CatalogPageItem[] => asArray<CatalogPageItem>(value);

export const normalizeCatalogMeta = (value: unknown): CatalogMeta => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const price = (source.price && typeof source.price === "object" ? source.price : {}) as Record<
    string,
    unknown
  >;
  return {
    categories: asArray<CatalogMeta["categories"][number]>(source.categories),
    subcategories: asArray<CatalogMeta["subcategories"][number]>(source.subcategories),
    attributeFilters: asArray<Record<string, unknown>>(source.attributeFilters).map((entry) => {
      const type = String(entry.type || "text") as CatalogAttributeFilter["type"];
      return {
        code: String(entry.code || ""),
        name: String(entry.name || ""),
        type,
        unit: entry.unit ? String(entry.unit) : null,
        values: type !== "number" ? asArray<string>(entry.values).map(String) : undefined,
        min: type === "number" ? Number(entry.min) || 0 : undefined,
        max: type === "number" ? Number(entry.max) || 0 : undefined,
      };
    }),
    price: {
      min: Number(price.min) || 0,
      max: Number(price.max) || 0,
    },
    labels: asArray<Record<string, unknown>>(source.labels).map((entry) => ({
      id: Number(entry.id) || 0,
      title: String(entry.title || ""),
      imageUrl: entry.imageUrl != null && entry.imageUrl !== "" ? String(entry.imageUrl) : null,
      sortOrder: Number(entry.sortOrder) || 0,
      filters: asArray<Record<string, unknown>>(entry.filters)
        .map((f) => ({
          code: String(f.code || "").trim(),
          value: String(f.value || "").trim(),
        }))
        .filter((f) => f.code && f.value),
    })),
  };
};

const parseGlassOptions = (raw: unknown): ProductGlassOption[] => {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  }
  return arr
    .map((entry) => {
      const o = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const id = Number(o.id);
      const label = String(o.label || "");
      if (!Number.isInteger(id) || id <= 0 || !label.trim()) return null;
      return { id, label: label.trim() };
    })
    .filter(Boolean) as ProductGlassOption[];
};

export const normalizeProductsResponse = (value: unknown): ProductCard[] => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return asArray<Record<string, unknown>>(source.items).map((item) => ({
    id: Number(item.id) || 0,
    name: String(item.name || ""),
    color: item.color ? String(item.color) : undefined,
    image: item.image ? String(item.image) : undefined,
    hoverImage: item.hoverImage ? String(item.hoverImage) : undefined,
    category: item.category ? String(item.category) : undefined,
    categorySlug: item.categorySlug ? String(item.categorySlug) : undefined,
    price: Number(item.price) || 0,
    glassOptions: parseGlassOptions(item.glassOptions),
  }));
};

export const normalizeProductData = (value: unknown): ProductData => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: Number(source.id) || 0,
    name: String(source.name || ""),
    price: Number(source.price) || 0,
    image: source.image ? String(source.image) : undefined,
    images: asArray<string>(source.images),
    category: source.category ? String(source.category) : undefined,
    subcategory: source.subcategory ? String(source.subcategory) : undefined,
    attributes: asArray<ProductData["attributes"][number]>(source.attributes),
    variants: asArray<Record<string, unknown>>(source.variants).map((variant) => ({
      sku: String(variant.sku || ""),
      price: Number(variant.price) || 0,
      image: variant.image ? String(variant.image) : undefined,
      attributes: asArray<VariantAttribute>(variant.attributes),
    })),
    colorVariants: asArray<Record<string, unknown>>(source.colorVariants).map((entry) => ({
      id: Number(entry.id) || 0,
      color: String(entry.color || ""),
      image: String(entry.image || ""),
      isCurrent: Boolean(entry.isCurrent),
    })),
    glassVariants: asArray<Record<string, unknown>>(source.glassVariants || []).map((entry) => ({
      id: Number(entry.id) || 0,
      glass: String(entry.glass || ""),
      image: String(entry.image || ""),
      isCurrent: Boolean(entry.isCurrent),
    })),
    accessories: asArray<Record<string, unknown>>(source.accessories || []).map((entry) => ({
      id: Number(entry.id) || 0,
      sku: String(entry.sku || ""),
      name: String(entry.name || ""),
      price: Number(entry.price) || 0,
      image: String(entry.image || ""),
      category: String(entry.category || ""),
      attributes: asArray<AccessoryItem["attributes"][number]>(entry.attributes).map((a) => ({
        code: String(a.code || ""),
        name: String(a.name || ""),
        value: String(a.value || ""),
      })),
    })),
  };
};

export const normalizeAdminBootstrap = (value: unknown): AdminBootstrap => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    categories: asArray<AdminBootstrap["categories"][number]>(source.categories),
    subcategories: asArray<AdminBootstrap["subcategories"][number]>(source.subcategories),
    attributes: asArray<AdminBootstrap["attributes"][number]>(source.attributes),
    products: asArray<AdminBootstrap["products"][number]>(source.products),
    catalogPages: asArray<Record<string, unknown>>(source.catalogPages).map((entry) => ({
      id: Number(entry.id) || 0,
      name: String(entry.name || ""),
      slug: String(entry.slug || ""),
      sortOrder: Number(entry.sortOrder) || 0,
      isActive: entry.isActive !== false,
      isDefault: Boolean(entry.isDefault),
      categories: asArray<AdminCatalogPage["categories"][number]>(entry.categories),
      subcategories: asArray<Record<string, unknown>>(entry.subcategories).map((sub) => ({
        id: Number(sub.id) || 0,
        name: String(sub.name || ""),
        slug: String(sub.slug || ""),
        categorySlug: sub.categorySlug ? String(sub.categorySlug) : null,
      })),
      filterAttributes: asArray<AdminCatalogPage["filterAttributes"][number]>(entry.filterAttributes),
    })),
  };
};
