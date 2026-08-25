import type { CartItem } from "@/lib/client/cart-types";

export type AdminCartServiceKey = "montage" | "delivery";

export type AdminCartServiceLineState = {
  key: AdminCartServiceKey;
  name: string;
  enabled: boolean;
  quantity: number;
  price: number;
};

export const ADMIN_CART_SERVICE_DEFS: Array<{
  key: AdminCartServiceKey;
  name: string;
  defaultQuantity: number;
  defaultPrice: number;
}> = [
  {
    key: "montage",
    name: "Монтаж (ориентировочно)",
    defaultQuantity: 1,
    defaultPrice: 5000,
  },
  {
    key: "delivery",
    name: "Доставка",
    defaultQuantity: 1,
    defaultPrice: 1300,
  },
];

export const createInitialAdminCartServiceLines = (): AdminCartServiceLineState[] =>
  ADMIN_CART_SERVICE_DEFS.map((def) => ({
    key: def.key,
    name: def.name,
    enabled: false,
    quantity: def.defaultQuantity,
    price: def.defaultPrice,
  }));

/** Synthetic cart lines for invoice / admin lead (productId will be null on server). */
export const toAdminServiceCartItems = (
  lines: AdminCartServiceLineState[],
): CartItem[] =>
  lines
    .filter((line) => line.enabled && line.quantity > 0 && line.name.trim())
    .map((line) => ({
      id: 0,
      name: line.name.trim(),
      image: "",
      price: Math.max(0, Math.floor(Number(line.price) || 0)),
      quantity: Math.max(1, Math.floor(Number(line.quantity) || 1)),
      noProductLink: true,
      hideCartImage: true,
    }));

export const sumAdminServiceLines = (lines: AdminCartServiceLineState[]) =>
  toAdminServiceCartItems(lines).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
