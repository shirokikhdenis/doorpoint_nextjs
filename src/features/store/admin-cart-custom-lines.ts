import type { CartItem } from "@/lib/client/cart-types";

export type AdminCartCustomLineState = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export const createAdminCartCustomLine = (): AdminCartCustomLineState => ({
  id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: "",
  quantity: 1,
  price: 0,
});

/** Synthetic cart lines for invoice / admin lead (productId will be null on server). */
export const toAdminCustomCartItems = (lines: AdminCartCustomLineState[]): CartItem[] =>
  lines
    .filter((line) => line.name.trim())
    .map((line) => ({
      id: 0,
      name: line.name.trim(),
      image: "",
      price: Math.max(0, Math.floor(Number(line.price) || 0)),
      quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
      noProductLink: true,
      hideCartImage: true,
    }));

export const sumAdminCustomLines = (lines: AdminCartCustomLineState[]) =>
  toAdminCustomCartItems(lines).reduce((sum, item) => sum + item.price * item.quantity, 0);

const ADMIN_CART_CUSTOM_LINES_KEY = "admin_cart_custom_lines_v1";
const CART_QTY_MAX = 99;

const sanitizeCustomLine = (line: Partial<AdminCartCustomLineState>): AdminCartCustomLineState | null => {
  const id = String(line.id || "").trim();
  if (!id) return null;
  return {
    id,
    name: String(line.name ?? ""),
    quantity: Math.min(CART_QTY_MAX, Math.max(1, Math.floor(Number(line.quantity) || 1))),
    price: Math.max(0, Math.floor(Number(line.price) || 0)),
  };
};

export const readAdminCartCustomLines = (): AdminCartCustomLineState[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ADMIN_CART_CUSTOM_LINES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((line) => sanitizeCustomLine(line))
      .filter((line): line is AdminCartCustomLineState => line != null);
  } catch {
    return [];
  }
};

export const writeAdminCartCustomLines = (lines: AdminCartCustomLineState[]) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_CART_CUSTOM_LINES_KEY, JSON.stringify(lines));
};

export const clearAdminCartCustomLines = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_CART_CUSTOM_LINES_KEY);
};
