import { cartStore, type CartItem } from "@/lib/client/cart-store";
import type { DiscountKind } from "@/lib/client/lead-pricing";
import {
  createAdminCartCustomLine,
  writeAdminCartCustomLines,
  type AdminCartCustomLineState,
} from "@/features/store/admin-cart-custom-lines";
import {
  createInitialAdminCartServiceLines,
  matchAdminCartServiceKey,
  writeAdminCartServiceLines,
  type AdminCartServiceLineState,
} from "@/features/store/admin-cart-service-lines";
import { writeAdminCartDiscount } from "@/features/store/admin-cart-discount";

export type LeadCartSourceItem = {
  productId?: number | null;
  name: string;
  sku?: string;
  manufacturerId?: string;
  color?: string;
  image?: string;
  price: number;
  quantity: number;
};

export type LeadCartSource = {
  items: LeadCartSourceItem[];
  discountKind?: DiscountKind | string;
  discountValue?: number;
};

const isBlankPlaceholderName = (name: string) => {
  const trimmed = name.trim();
  return !trimmed || trimmed === "—" || trimmed === "-";
};

const normalizeDiscountKind = (value: unknown): DiscountKind => {
  const raw = String(value ?? "none").trim();
  if (raw === "percent" || raw === "amount" || raw === "none") return raw;
  return "none";
};

/**
 * Clears the storefront cart + admin cart extras, then loads lead line items.
 * Returns how many lines were loaded (products + custom + services).
 */
export const loadLeadIntoCart = (lead: LeadCartSource): number => {
  const productItems: Partial<CartItem>[] = [];
  const customLines: AdminCartCustomLineState[] = [];
  const serviceLines = createInitialAdminCartServiceLines();
  const serviceByKey = new Map<string, AdminCartServiceLineState>(
    serviceLines.map((line) => [line.key, line]),
  );

  for (const item of lead.items || []) {
    const name = String(item.name || "").trim();
    if (isBlankPlaceholderName(name)) continue;

    const price = Math.max(0, Math.floor(Number(item.price) || 0));
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const productId = Number(item.productId);
    const hasProduct = Number.isInteger(productId) && productId > 0;

    if (hasProduct) {
      const image = String(item.image || "").trim();
      const color = String(item.color || "").trim();
      const sku = String(item.sku || "").trim();
      const manufacturerId = String(item.manufacturerId || "").trim();
      const entry: Partial<CartItem> = {
        id: productId,
        name,
        image,
        price,
        quantity,
      };
      if (color) entry.color = color;
      if (sku) entry.sku = sku;
      if (manufacturerId) entry.manufacturerId = manufacturerId;
      productItems.push(entry);
      continue;
    }

    const serviceKey = matchAdminCartServiceKey(name);
    if (serviceKey) {
      const current = serviceByKey.get(serviceKey);
      if (current) {
        current.enabled = true;
        current.name = name;
        current.price = price;
        current.quantity = quantity;
      }
      continue;
    }

    customLines.push({
      ...createAdminCartCustomLine(),
      name,
      price,
      quantity,
    });
  }

  cartStore.replaceItems(productItems, {
    toast: "Состав заявки добавлен в корзину",
  });
  writeAdminCartCustomLines(customLines);
  writeAdminCartServiceLines(serviceLines);

  const discountKind = normalizeDiscountKind(lead.discountKind);
  const discountValue = Math.max(0, Math.floor(Number(lead.discountValue) || 0));
  writeAdminCartDiscount({
    kind: discountKind,
    value: discountKind === "none" ? 0 : discountValue,
  });

  const enabledServices = serviceLines.filter((line) => line.enabled).length;
  return productItems.length + customLines.length + enabledServices;
};
