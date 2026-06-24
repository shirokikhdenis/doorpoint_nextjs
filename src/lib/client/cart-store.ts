import { cartToast } from "@/lib/client/cart-toast";
import { isSameCartLine } from "@/lib/client/cart-line";
import { isPogonazhCategoryLabel } from "@/lib/pogonazh-category";

export type {
  AddCartItemOptions,
  CartItem,
  CartLineRef,
} from "@/lib/client/cart-types";

export { findCartLine, isSameCartLine } from "@/lib/client/cart-line";
export { isPogonazhCategoryLabel };

import type { AddCartItemOptions, CartItem, CartLineRef } from "@/lib/client/cart-types";

export const cartItemHasProductLink = (item: CartItem) =>
  !(item.noProductLink === true || item.hideCartImage === true);

const CART_STORAGE_KEY = "door_catalog_cart_v1";

const sanitizeItem = (item: Partial<CartItem>): CartItem => {
  const base: CartItem = {
    id: Number(item.id) || 0,
    name: String(item.name || "").trim(),
    image: String(item.image || "").trim(),
    price: Number(item.price) || 0,
    quantity: Math.max(1, Number(item.quantity) || 1),
  };
  const c = String(item.color ?? "").trim();
  if (c) base.color = c;
  const sku = String(item.sku ?? "").trim();
  if (sku) base.sku = sku;
  const finishId = Number(item.finishId);
  if (Number.isInteger(finishId) && finishId > 0) base.finishId = finishId;
  const finishName = String(item.finishName ?? "").trim();
  if (finishName) base.finishName = finishName;
  if (item.hideCartImage === true) base.hideCartImage = true;
  if (item.noProductLink === true) base.noProductLink = true;
  return base;
};

const readRaw = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => sanitizeItem(item)).filter((item) => item.id > 0 && item.name);
  } catch {
    return [];
  }
};

let memorySnapshot: CartItem[] = [];

const getSnapshot = (): CartItem[] => memorySnapshot;

const syncSnapshotFromStorage = () => {
  memorySnapshot = readRaw();
};

if (typeof window !== "undefined") {
  syncSnapshotFromStorage();
}

const writeRaw = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  memorySnapshot = items;
};

type CartListener = () => void;
const listeners = new Set<CartListener>();

const notify = () => {
  for (const listener of listeners) listener();
};

const persistAndNotify = (items: CartItem[]) => {
  writeRaw(items);
  notify();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    syncSnapshotFromStorage();
    notify();
  });
}

export const cartStore = {
  getItems(): CartItem[] {
    if (typeof window === "undefined") return [];
    return getSnapshot();
  },

  getSnapshot,

  subscribe(listener: CartListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addItem(item: Partial<CartItem>, options?: AddCartItemOptions): CartItem[] {
    const next = sanitizeItem(item);
    const items = [...getSnapshot()];
    const existing = items.find((entry) => isSameCartLine(entry, next));
    if (existing) {
      existing.quantity += next.quantity;
      if (next.sku && !existing.sku) existing.sku = next.sku;
      if (next.finishId && !existing.finishId) existing.finishId = next.finishId;
      if (next.finishName && !existing.finishName) existing.finishName = next.finishName;
      if (next.noProductLink && !existing.noProductLink) existing.noProductLink = true;
    } else {
      items.push(next);
    }
    persistAndNotify(items);
    if (options?.toast !== false) {
      cartToast.show(options?.toast ?? "Товар добавлен в корзину");
    }
    return items;
  },

  setQuantity(ref: CartLineRef, quantity: number): CartItem[] {
    const nextQuantity = Math.max(0, Number(quantity) || 0);
    const items = getSnapshot()
      .map((item) => (isSameCartLine(item, ref) ? { ...item, quantity: nextQuantity } : item))
      .filter((item) => item.quantity > 0);
    persistAndNotify(items);
    return items;
  },

  removeItem(ref: CartLineRef): CartItem[] {
    return this.setQuantity(ref, 0);
  },

  clear(): CartItem[] {
    persistAndNotify([]);
    return [];
  },
};
