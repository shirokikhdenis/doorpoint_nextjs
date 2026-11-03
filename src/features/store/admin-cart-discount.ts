import type { DiscountKind } from "@/lib/client/lead-pricing";

export type AdminCartDiscountState = {
  kind: DiscountKind;
  value: number;
};

const ADMIN_CART_DISCOUNT_KEY = "admin_cart_discount_v1";

export const DEFAULT_ADMIN_CART_DISCOUNT: AdminCartDiscountState = {
  kind: "none",
  value: 0,
};

const normalizeKind = (value: unknown): DiscountKind => {
  const raw = String(value ?? "none").trim();
  if (raw === "percent" || raw === "amount" || raw === "none") return raw;
  return "none";
};

export const readAdminCartDiscount = (): AdminCartDiscountState => {
  if (typeof window === "undefined") return { ...DEFAULT_ADMIN_CART_DISCOUNT };
  try {
    const raw = sessionStorage.getItem(ADMIN_CART_DISCOUNT_KEY);
    if (!raw) return { ...DEFAULT_ADMIN_CART_DISCOUNT };
    const parsed = JSON.parse(raw) as Partial<AdminCartDiscountState>;
    const kind = normalizeKind(parsed.kind);
    const value = Math.max(0, Math.floor(Number(parsed.value) || 0));
    return {
      kind,
      value: kind === "none" ? 0 : value,
    };
  } catch {
    return { ...DEFAULT_ADMIN_CART_DISCOUNT };
  }
};

export const writeAdminCartDiscount = (state: AdminCartDiscountState) => {
  if (typeof window === "undefined") return;
  const kind = normalizeKind(state.kind);
  const value = Math.max(0, Math.floor(Number(state.value) || 0));
  sessionStorage.setItem(
    ADMIN_CART_DISCOUNT_KEY,
    JSON.stringify({
      kind,
      value: kind === "none" ? 0 : value,
    }),
  );
};

export const clearAdminCartDiscount = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_CART_DISCOUNT_KEY);
};
