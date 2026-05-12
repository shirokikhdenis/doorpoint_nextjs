export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

const CART_STORAGE_KEY = "door_catalog_cart_v1";

const sanitizeItem = (item: Partial<CartItem>): CartItem => ({
  id: Number(item.id) || 0,
  name: String(item.name || "").trim(),
  image: String(item.image || "").trim(),
  price: Number(item.price) || 0,
  quantity: Math.max(1, Number(item.quantity) || 1),
});

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

const writeRaw = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

export const cartStore = {
  getItems(): CartItem[] {
    return readRaw();
  },

  addItem(item: Partial<CartItem>): CartItem[] {
    const next = sanitizeItem(item);
    const items = readRaw();
    const existing = items.find((entry) => entry.id === next.id && entry.name === next.name);
    if (existing) {
      existing.quantity += next.quantity;
    } else {
      items.push(next);
    }
    writeRaw(items);
    return items;
  },

  setQuantity(id: number, quantity: number): CartItem[] {
    const numericId = Number(id);
    const nextQuantity = Math.max(0, Number(quantity) || 0);
    const items = readRaw()
      .map((item) => (item.id === numericId ? { ...item, quantity: nextQuantity } : item))
      .filter((item) => item.quantity > 0);
    writeRaw(items);
    return items;
  },

  removeItem(id: number): CartItem[] {
    return this.setQuantity(id, 0);
  },
};
