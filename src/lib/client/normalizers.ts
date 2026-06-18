import { toPublicImageSrc } from "@/lib/client/image-src";
import { parseProductBadges, type ProductBadge } from "@/lib/client/product-badges";

export type { ProductBadge };

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

export type ProductCard = {
  id: number;
  sku?: string;
  slug?: string;
  name: string;
  color?: string;
  image?: string;
  /** Второе фото (hover) из product_images, sort_order второй. */
  hoverImage?: string;
  category?: string;
  categorySlug?: string;
  price: number;
  isOnSale?: boolean;
  compareAtPrice?: number | null;
  /** Варианты стекла той же модели (тот же model_key + name, тот же color); для чипов в выдаче. */
  glassOptions?: ProductGlassOption[];
  badges?: ProductBadge[];
};

export type PromotionBanner = {
  id: number;
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
  catalogPageSlug: string;
  filterManufacturer?: string;
  filterCollection?: string;
  sortOrder: number;
  isActive: boolean;
  href: string;
};

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
  slug?: string;
  color: string;
  image: string;
  isCurrent: boolean;
};
export type GlassVariant = {
  id: number;
  slug?: string;
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
export type RelatedFittingItem = {
  id: number;
  sku: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  subcategory: string;
  group: "fixators" | "latches" | "hinges";
};
export type RelatedFittings = {
  fixators: RelatedFittingItem[];
  latches: RelatedFittingItem[];
  hinges: RelatedFittingItem[];
};
export type KitPart = {
  id: number;
  sku: string;
  name: string;
  price: number;
};
export type KitPricing = {
  available: boolean;
  korobkaQty: number;
  nalichnikQty: number;
  korobka: KitPart | null;
  nalichnik: KitPart | null;
};
export type ProductData = {
  id: number;
  sku?: string;
  slug?: string;
  name: string;
  price: number;
  isOnSale?: boolean;
  compareAtPrice?: number | null;
  image?: string;
  images: string[];
  category?: string;
  categorySlug?: string;
  subcategory?: string;
  subcategorySlug?: string;
  attributes: Array<{ code: string; name: string; value: string }>;
  variants: Variant[];
  colorVariants: ColorVariant[];
  glassVariants: GlassVariant[];
  accessories: AccessoryItem[];
  relatedFittings: RelatedFittings;
  suggestedHandles?: ProductCard[];
  badges?: ProductBadge[];
  kitPricing?: KitPricing | null;
  kitPrice?: number | null;
};

export type AdminCatalogPage = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
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
      imageUrl:
        entry.imageUrl != null && entry.imageUrl !== ""
          ? toPublicImageSrc(String(entry.imageUrl))
          : null,
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

const normalizeOptionalImage = (value: unknown) => {
  const src = toPublicImageSrc(value != null ? String(value) : "");
  return src || undefined;
};

export const normalizeProductsResponse = (value: unknown): ProductCard[] => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return asArray<Record<string, unknown>>(source.items).map((item) => ({
    id: Number(item.id) || 0,
    sku: item.sku ? String(item.sku) : undefined,
    slug: item.slug ? String(item.slug) : undefined,
    name: String(item.name || ""),
    color: item.color ? String(item.color) : undefined,
    image: normalizeOptionalImage(item.image),
    hoverImage: normalizeOptionalImage(item.hoverImage),
    category: item.category ? String(item.category) : undefined,
    categorySlug: item.categorySlug ? String(item.categorySlug) : undefined,
    price: Number(item.price) || 0,
    isOnSale: item.isOnSale === true,
    compareAtPrice:
      item.compareAtPrice === null || item.compareAtPrice === undefined
        ? null
        : Number(item.compareAtPrice),
    glassOptions: parseGlassOptions(item.glassOptions),
    badges: parseProductBadges(item.badges),
  }));
};

const normalizeRelatedFittingItem = (
  entry: Record<string, unknown>,
  group: RelatedFittingItem["group"],
): RelatedFittingItem => ({
  id: Number(entry.id) || 0,
  sku: String(entry.sku || ""),
  name: String(entry.name || ""),
  price: Number(entry.price) || 0,
  image: toPublicImageSrc(String(entry.image || "")),
  slug: entry.slug ? String(entry.slug) : undefined,
  subcategory: String(entry.subcategory || ""),
  group,
});

const normalizeRelatedFittings = (value: unknown): RelatedFittings => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    fixators: asArray<Record<string, unknown>>(source.fixators).map((entry) =>
      normalizeRelatedFittingItem(entry, "fixators"),
    ),
    latches: asArray<Record<string, unknown>>(source.latches).map((entry) =>
      normalizeRelatedFittingItem(entry, "latches"),
    ),
    hinges: asArray<Record<string, unknown>>(source.hinges).map((entry) =>
      normalizeRelatedFittingItem(entry, "hinges"),
    ),
  };
};

const normalizeKitPart = (value: unknown): KitPart | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = Number(source.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    sku: String(source.sku || ""),
    name: String(source.name || ""),
    price: Number(source.price) || 0,
  };
};

const normalizeKitPricing = (value: unknown): KitPricing | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  return {
    available: source.available === true,
    korobkaQty: Number(source.korobkaQty) || 2.5,
    nalichnikQty: Number(source.nalichnikQty) || 5,
    korobka: normalizeKitPart(source.korobka),
    nalichnik: normalizeKitPart(source.nalichnik),
  };
};

export const normalizeProductData = (value: unknown): ProductData => {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    id: Number(source.id) || 0,
    sku: source.sku ? String(source.sku) : undefined,
    slug: source.slug ? String(source.slug) : undefined,
    name: String(source.name || ""),
    price: Number(source.price) || 0,
    isOnSale: source.isOnSale === true,
    compareAtPrice:
      source.compareAtPrice === null || source.compareAtPrice === undefined
        ? null
        : Number(source.compareAtPrice),
    image: source.image ? toPublicImageSrc(String(source.image)) : undefined,
    images: asArray<string>(source.images)
      .map((url) => toPublicImageSrc(String(url)))
      .filter(Boolean),
    category: source.category ? String(source.category) : undefined,
    categorySlug: source.categorySlug ? String(source.categorySlug) : undefined,
    subcategory: source.subcategory ? String(source.subcategory) : undefined,
    subcategorySlug: source.subcategorySlug ? String(source.subcategorySlug) : undefined,
    attributes: asArray<ProductData["attributes"][number]>(source.attributes),
    variants: asArray<Record<string, unknown>>(source.variants).map((variant) => ({
      sku: String(variant.sku || ""),
      price: Number(variant.price) || 0,
      image: variant.image ? toPublicImageSrc(String(variant.image)) : undefined,
      attributes: asArray<VariantAttribute>(variant.attributes),
    })),
    colorVariants: asArray<Record<string, unknown>>(source.colorVariants).map((entry) => ({
      id: Number(entry.id) || 0,
      slug: entry.slug ? String(entry.slug) : undefined,
      color: String(entry.color || ""),
      image: toPublicImageSrc(String(entry.image || "")),
      isCurrent: Boolean(entry.isCurrent),
    })),
    glassVariants: asArray<Record<string, unknown>>(source.glassVariants || []).map((entry) => ({
      id: Number(entry.id) || 0,
      slug: entry.slug ? String(entry.slug) : undefined,
      glass: String(entry.glass || ""),
      image: toPublicImageSrc(String(entry.image || "")),
      isCurrent: Boolean(entry.isCurrent),
    })),
    accessories: asArray<Record<string, unknown>>(source.accessories || []).map((entry) => ({
      id: Number(entry.id) || 0,
      sku: String(entry.sku || ""),
      name: String(entry.name || ""),
      price: Number(entry.price) || 0,
      image: toPublicImageSrc(String(entry.image || "")),
      category: String(entry.category || ""),
      attributes: asArray<AccessoryItem["attributes"][number]>(entry.attributes).map((a) => ({
        code: String(a.code || ""),
        name: String(a.name || ""),
        value: String(a.value || ""),
      })),
    })),
    relatedFittings: normalizeRelatedFittings(source.relatedFittings),
    suggestedHandles: normalizeProductsResponse({ items: source.suggestedHandles }),
    badges: parseProductBadges(source.badges),
    kitPricing: normalizeKitPricing(source.kitPricing),
    kitPrice:
      source.kitPrice === null || source.kitPrice === undefined
        ? null
        : Number(source.kitPrice) || null,
  };
};

export const normalizePromotionBanners = (value: unknown): PromotionBanner[] =>
  asArray<Record<string, unknown>>(value).map((entry) => ({
    id: Number(entry.id) || 0,
    title: String(entry.title || ""),
    subtitle: String(entry.subtitle || ""),
    backgroundImageUrl: toPublicImageSrc(String(entry.backgroundImageUrl || "")),
    catalogPageSlug: String(entry.catalogPageSlug || "all"),
    filterManufacturer: entry.filterManufacturer ? String(entry.filterManufacturer) : "",
    filterCollection: entry.filterCollection ? String(entry.filterCollection) : "",
    sortOrder: Number(entry.sortOrder) || 0,
    isActive: entry.isActive !== false,
    href: String(entry.href || ""),
  }));

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
      seoTitle: entry.seoTitle ? String(entry.seoTitle) : null,
      seoDescription: entry.seoDescription ? String(entry.seoDescription) : null,
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
