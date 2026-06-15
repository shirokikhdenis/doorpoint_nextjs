import type { Variant } from "@/lib/client/normalizers";

export const variantAxesLabel = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  const source = axes.length > 0 ? axes : variant.attributes;
  if (source.length === 0) return variant.sku;
  return source.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
};

export const variantCartSuffix = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  if (axes.length === 0) return variant.sku;
  return axes.map((attribute) => attribute.value).join(", ");
};

export const buildCatalogBackHref = (): string => {
  if (typeof window === "undefined") return "/catalog";
  const slug = window.sessionStorage.getItem("lastCatalogPage");
  return slug ? `/catalog?catalogPage=${encodeURIComponent(slug)}` : "/catalog";
};

export const serializeVariantAxes = (variant: Variant | null | undefined): string => {
  if (!variant) return "";
  return variant.attributes
    .filter((attribute) => attribute.isVariantAxis)
    .map((attribute) => `${attribute.code}=${attribute.value}`)
    .sort()
    .join("|");
};
