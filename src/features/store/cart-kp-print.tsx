"use client";

import type { CartItem } from "@/lib/client/cart-types";
import { cartItemHasProductLink } from "@/lib/client/cart-store";

const CART_KP_DOOR_SLUGS = new Set(["entry-doors", "interior-doors"]);

export function listCartKpDoors(items: CartItem[]): CartItem[] {
  const seen = new Set<number>();
  const out: CartItem[] = [];
  for (const item of items) {
    if (!CART_KP_DOOR_SLUGS.has(String(item.categorySlug || "").trim())) continue;
    if (!cartItemHasProductLink(item)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function startCartInvoicePrint() {
  window.print();
}
