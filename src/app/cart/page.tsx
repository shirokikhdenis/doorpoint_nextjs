"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartItem, cartStore } from "@/lib/client/cart-store";

const formatPrice = (price: number) =>
  `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

const formatToday = () => {
  try {
    return new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

/** Только неотрицательные целые без лишних символов; иначе в поле показываем NaN. Не больше двух цифр. */
const CART_QTY_MAX = 99;

function CartLineQuantity({
  item,
  setItems,
}: {
  item: CartItem;
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
}) {
  const lineRef = {
    id: item.id,
    name: item.name,
    color: item.color ?? "",
    hideCartImage: item.hideCartImage === true,
  };
  const [text, setText] = useState(() => String(item.quantity));

  useEffect(() => {
    setText(String(item.quantity));
  }, [item.quantity, item.id, item.name, item.color, item.hideCartImage]);

  const applyQuantity = (next: number) => {
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, Math.floor(next)));
    setItems(cartStore.setQuantity(lineRef, clamped));
  };

  const handleChange = (raw: string) => {
    if (raw === "") {
      setText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setText("NaN");
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    setText(String(clamped));
    setItems(cartStore.setQuantity(lineRef, clamped));
  };

  const handleBlur = () => {
    if (text === "" || text === "NaN" || !/^\d+$/.test(text)) {
      setText(String(item.quantity));
      return;
    }
    const n = parseInt(text, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    if (clamped !== n || text !== String(clamped)) {
      setText(String(clamped));
      setItems(cartStore.setQuantity(lineRef, clamped));
    }
  };

  return (
    <>
      <button
        type="button"
        className="rounded border px-2"
        onClick={() => applyQuantity(item.quantity - 1)}
      >
        -
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={text === "NaN"}
        className={`shrink-0 rounded border px-1 py-1 text-center text-sm tabular-nums ${
          text === "NaN" ? "w-12 border-amber-500 text-amber-700" : "w-9 border-zinc-300"
        }`}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
      <button
        type="button"
        className="rounded border px-2"
        onClick={() => applyQuantity(item.quantity + 1)}
      >
        +
      </button>
    </>
  );
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(() => cartStore.getItems());

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const handleClear = () => {
    if (items.length === 0) return;
    const ok = window.confirm("Очистить корзину? Действие нельзя отменить.");
    if (!ok) return;
    setItems(cartStore.clear());
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

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
      {/* Заголовок страницы и панель действий (на печати действия скрыты). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Корзина</h1>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 9V3h12v6" />
              <rect x="4" y="9" width="16" height="8" rx="2" />
              <path d="M6 17v4h12v-4" />
            </svg>
            Печать
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 transition hover:border-rose-500 hover:bg-rose-50"
          >
            Очистить корзину
          </button>
        </div>
      </div>

      {/* Шапка для печатной версии: видна только при печати. */}
      <div className="mt-4 hidden border-b border-zinc-300 pb-3 print:block">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Заказ</h2>
          <span className="text-sm">от {formatToday()}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3 print:mt-3 print:space-y-2">
        {items.map((item) => (
          <div
            key={`${item.id}-${item.name}-${item.color ?? ""}-${item.hideCartImage ? "1" : "0"}`}
            className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-3 rounded border bg-white p-3 print:break-inside-avoid print:rounded-none print:border-0 print:border-b print:border-zinc-300 print:p-0 print:py-2"
          >
            <div className="h-16 w-16 shrink-0 print:h-14 print:w-14">
              {!item.hideCartImage && item.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full rounded object-cover print:rounded-none"
                />
              ) : null}
            </div>
            <div>
              <p className="font-medium">{item.name}</p>
              {item.color ? (
                <p className="text-sm text-zinc-600 print:text-zinc-700">
                  Цвет: {item.color}
                </p>
              ) : null}
              <p className="text-sm text-zinc-600 print:text-zinc-700">
                {formatPrice(item.price)}
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <CartLineQuantity item={item} setItems={setItems} />
            </div>
            {/* Печатный вид количества: одной строкой, без кнопок. */}
            <div className="hidden whitespace-nowrap print:block">
              {item.quantity} шт.
            </div>
            {/* Сумма по строке — видна только на печати, иначе колонок было бы больше. */}
            <div className="hidden whitespace-nowrap text-right font-medium print:block">
              {formatPrice(item.price * item.quantity)}
            </div>
            <button
              className="text-sm underline print:hidden"
              onClick={() =>
                setItems(
                  cartStore.removeItem({
                    id: item.id,
                    name: item.name,
                    color: item.color ?? "",
                    hideCartImage: item.hideCartImage === true,
                  }),
                )
              }
            >
              Удалить
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 text-right">
        <span className="hidden text-sm text-zinc-700 print:block">
          Позиций: {items.length} · Всего предметов: {totalQuantity}
        </span>
        <span className="text-lg font-semibold">
          Итого: {formatPrice(total)}
        </span>
      </div>
    </main>
  );
}
