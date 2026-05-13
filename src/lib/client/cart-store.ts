export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  /** Цвет полотна / комплектующих к выбранной открытой карточке (для отображения в корзине). */
  color?: string;
  /** Погонаж / комплектующие: в корзине не показываем превью фото. */
  hideCartImage?: boolean;
};

/** Строка корзины: id + подпись варианта + цвет (одинаковые SKU в разном цвете — разные строки). */
export type CartLineRef = Pick<CartItem, "id" | "name" | "color" | "hideCartImage">;

const trimLine = (value: string | undefined) => String(value ?? "").trim();

const sameLine = (a: CartLineRef, b: CartLineRef) =>
  Number(a.id) === Number(b.id) &&
  trimLine(a.name) === trimLine(b.name) &&
  trimLine(a.color) === trimLine(b.color) &&
  Boolean(a.hideCartImage) === Boolean(b.hideCartImage);

const CART_STORAGE_KEY = "door_catalog_cart_v1";

const sanitizeItem = (item: Partial<CartItem>): CartItem => {
  const base: CartItem = {
    id: Number(item.id) || 0,
    name: String(item.name || "").trim(),
    image: String(item.image || "").trim(),
    price: Number(item.price) || 0,
    quantity: Math.max(1, Number(item.quantity) || 1),
  };
  const c = trimLine(item.color);
  if (c) base.color = c;
  if (item.hideCartImage === true) base.hideCartImage = true;
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
    const existing = items.find((entry) => sameLine(entry, next));
    if (existing) {
      existing.quantity += next.quantity;
    } else {
      items.push(next);
    }
    writeRaw(items);
    return items;
  },

  setQuantity(ref: CartLineRef, quantity: number): CartItem[] {
    const nextQuantity = Math.max(0, Number(quantity) || 0);
    const items = readRaw()
      .map((item) => (sameLine(item, ref) ? { ...item, quantity: nextQuantity } : item))
      .filter((item) => item.quantity > 0);
    writeRaw(items);
    return items;
  },

  removeItem(ref: CartLineRef): CartItem[] {
    return this.setQuantity(ref, 0);
  },

  clear(): CartItem[] {
    writeRaw([]);
    return [];
  },
};
