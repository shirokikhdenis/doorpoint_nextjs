"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartItem, cartStore } from "@/lib/client/cart-store";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(() => cartStore.getItems());

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Корзина</h1>
        <p className="mt-4 text-zinc-600">Корзина пуста.</p>
        <Link href="/catalog" className="mt-3 inline-block underline">
          Перейти в каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Корзина</h1>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.id}-${item.name}`} className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-3 rounded border bg-white p-3">
            <img src={item.image} alt={item.name} className="h-16 w-16 rounded object-cover" />
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-zinc-600">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded border px-2"
                onClick={() => setItems(cartStore.setQuantity(item.id, item.quantity - 1))}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                className="rounded border px-2"
                onClick={() => setItems(cartStore.setQuantity(item.id, item.quantity + 1))}
              >
                +
              </button>
            </div>
            <button className="text-sm underline" onClick={() => setItems(cartStore.removeItem(item.id))}>
              Удалить
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 text-right text-lg font-semibold">Итого: {formatPrice(total)}</div>
    </main>
  );
}
