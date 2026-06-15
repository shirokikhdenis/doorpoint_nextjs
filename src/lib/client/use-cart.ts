"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  AddCartItemOptions,
  CartItem,
  CartLineRef,
  cartStore,
} from "@/lib/client/cart-store";

const emptyCart: CartItem[] = [];

export function useCart() {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    () => emptyCart,
  );

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const addItem = useCallback(
    (item: Partial<CartItem>, options?: AddCartItemOptions) =>
      cartStore.addItem(item, options),
    [],
  );

  const setQuantity = useCallback(
    (ref: CartLineRef, quantity: number) => cartStore.setQuantity(ref, quantity),
    [],
  );

  const removeItem = useCallback((ref: CartLineRef) => cartStore.removeItem(ref), []);

  const clear = useCallback(() => cartStore.clear(), []);

  return {
    items,
    totalQuantity,
    totalPrice,
    addItem,
    setQuantity,
    removeItem,
    clear,
  };
}
