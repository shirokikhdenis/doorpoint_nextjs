import type { CartItem, CartLineRef } from "@/lib/client/cart-types";

const trimLine = (value: string | undefined) => String(value ?? "").trim();

export const isSameCartLine = (a: CartLineRef, b: CartLineRef) =>
  Number(a.id) === Number(b.id) &&
  trimLine(a.name) === trimLine(b.name) &&
  trimLine(a.color) === trimLine(b.color) &&
  Number(a.finishId || 0) === Number(b.finishId || 0) &&
  Boolean(a.hideCartImage) === Boolean(b.hideCartImage);

export const findCartLine = (items: CartItem[], ref: CartLineRef) =>
  items.find((item) => isSameCartLine(item, ref));
