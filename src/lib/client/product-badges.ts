export type ProductBadge = {
  code: string;
  label: string;
};

export const PRODUCT_BADGE_HIT = "hit";

export const parseProductBadges = (value: unknown): ProductBadge[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const code = String((entry as { code?: unknown }).code || "").trim();
      const label = String((entry as { label?: unknown }).label || "").trim();
      if (!code || !label) return null;
      return { code, label };
    })
    .filter(Boolean) as ProductBadge[];
};
