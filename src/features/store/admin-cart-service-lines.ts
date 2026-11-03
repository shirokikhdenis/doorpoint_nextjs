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
      isService: true,
    }));

export const sumAdminServiceLines = (lines: AdminCartServiceLineState[]) =>
  toAdminServiceCartItems(lines).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

const ADMIN_CART_SERVICE_LINES_KEY = "admin_cart_service_lines_v1";
const CART_QTY_MAX = 99;

const sanitizeServiceLine = (
  line: Partial<AdminCartServiceLineState>,
): AdminCartServiceLineState | null => {
  const key = line.key === "montage" || line.key === "delivery" ? line.key : null;
  if (!key) return null;
  const def = ADMIN_CART_SERVICE_DEFS.find((entry) => entry.key === key);
  return {
    key,
    name: String(line.name ?? def?.name ?? "").trim() || def?.name || key,
    enabled: Boolean(line.enabled),
    quantity: Math.min(CART_QTY_MAX, Math.max(1, Math.floor(Number(line.quantity) || 1))),
    price: Math.max(0, Math.floor(Number(line.price) || 0)),
  };
};

export const readAdminCartServiceLines = (): AdminCartServiceLineState[] => {
  const defaults = createInitialAdminCartServiceLines();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = sessionStorage.getItem(ADMIN_CART_SERVICE_LINES_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults;
    const byKey = new Map(
      parsed
        .map((line) => sanitizeServiceLine(line))
        .filter((line): line is AdminCartServiceLineState => line != null)
        .map((line) => [line.key, line]),
    );
    return defaults.map((line) => byKey.get(line.key) ?? line);
  } catch {
    return defaults;
  }
};

export const writeAdminCartServiceLines = (lines: AdminCartServiceLineState[]) => {
  if (typeof window === "undefined") return;
  const sanitized = lines
    .map((line) => sanitizeServiceLine(line))
    .filter((line): line is AdminCartServiceLineState => line != null);
  sessionStorage.setItem(ADMIN_CART_SERVICE_LINES_KEY, JSON.stringify(sanitized));
};

export const clearAdminCartServiceLines = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_CART_SERVICE_LINES_KEY);
};

/** Match lead/custom line name to a fixed admin cart service key. */
export const matchAdminCartServiceKey = (name: string): AdminCartServiceKey | null => {
  const normalized = String(name || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("монтаж")) return "montage";
  if (normalized.includes("доставка")) return "delivery";
  return null;
};
