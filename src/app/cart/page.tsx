"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCartItemName } from "@/lib/client/cart-item-name";
import { downloadCartCsv } from "@/lib/client/cart-csv-export";
import { CartItem, cartItemHasProductLink } from "@/lib/client/cart-store";
import { formatPrice } from "@/lib/client/format";
import { productHref } from "@/lib/client/product-url";
import { useCart } from "@/lib/client/use-cart";
import { CartLeadForm } from "@/features/store/cart-lead-form";
import { AdminCartLeadForm } from "@/features/store/admin-cart-lead-form";
import { useAdminSession } from "@/lib/client/use-admin-session";
import { SITE_EMAIL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from "@/lib/site-contact";

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
  setQuantity,
}: {
  item: CartItem;
  setQuantity: (ref: {
    id: number;
    name: string;
    color: string;
    hideCartImage: boolean;
  }, quantity: number) => void;
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
    setQuantity(lineRef, clamped);
  };

  const handleChange = (raw: string) => {
    if (raw === "") {
      setText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setText(String(item.quantity));
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    setText(String(clamped));
    setQuantity(lineRef, clamped);
  };

  const handleBlur = () => {
    if (text === "" || !/^\d+$/.test(text)) {
      setText(String(item.quantity));
      return;
    }
    const n = parseInt(text, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    if (clamped !== n || text !== String(clamped)) {
      setText(String(clamped));
      setQuantity(lineRef, clamped);
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
        className="w-9 shrink-0 rounded border border-zinc-300 px-1 py-1 text-center text-sm tabular-nums"
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
  const { items, totalPrice, totalQuantity, setQuantity, removeItem, clear } = useCart();
  const { isAdmin, loading: adminLoading } = useAdminSession();
  const [isExporting, setIsExporting] = useState(false);

  const handleClear = () => {
    if (items.length === 0) return;
    const ok = window.confirm("Очистить корзину? Действие нельзя отменить.");
    if (!ok) return;
    clear();
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleExportCsv = async () => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await downloadCartCsv(items);
    } finally {
      setIsExporting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold">Корзина</h1>
        <p className="mt-4 text-zinc-600">Корзина пуста.</p>
        <Link href="/catalog" className="mt-3 inline-block underline">
          Перейти в каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Заголовок страницы и панель действий (на печати действия скрыты). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Корзина</h1>
          {!adminLoading && isAdmin ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 print:hidden">
              Режим администратора
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
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
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 19h14" />
            </svg>
            {isExporting ? "Экспорт…" : "Экспорт CSV"}
          </button>
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
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">Заказ</h2>
          <span className="text-sm">от {formatToday()}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-700">
          Телефон:{" "}
          <a href={`tel:${SITE_PHONE_TEL}`} className="font-medium text-zinc-900">
            {SITE_PHONE_DISPLAY}
          </a>
          <span className="mx-2 text-zinc-400">·</span>
          E-mail:{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="font-medium text-zinc-900">
            {SITE_EMAIL}
          </a>
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white print:mt-3 print:rounded-none print:border-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Наименование</th>
              <th className="px-4 py-2 font-medium">Цена</th>
              <th className="px-4 py-2 font-medium">Кол-во</th>
              <th className="px-4 py-2 text-right font-medium">Сумма</th>
              <th className="w-10 px-2 py-2 print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => (
              <tr
                key={`${item.id}-${item.name}-${item.color ?? ""}-${item.hideCartImage ? "1" : "0"}`}
                className="hover:bg-zinc-50/60 print:break-inside-avoid"
              >
                <td className="px-4 py-3 align-middle">
                  {cartItemHasProductLink(item) ? (
                    <Link
                      href={productHref(item)}
                      className="font-medium leading-snug text-zinc-900 underline-offset-2 hover:text-brand hover:underline"
                    >
                      {formatCartItemName(item.name, item.color)}
                    </Link>
                  ) : (
                    <p className="font-medium leading-snug text-zinc-900">
                      {formatCartItemName(item.name, item.color)}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-middle font-medium">
                  {formatPrice(item.price)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2 print:hidden">
                    <CartLineQuantity item={item} setQuantity={setQuantity} />
                  </div>
                  <span className="hidden whitespace-nowrap print:inline">
                    {item.quantity} шт.
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-medium">
                  {formatPrice(item.price * item.quantity)}
                </td>
                <td className="px-2 py-3 text-right align-middle print:hidden">
                  <button
                    type="button"
                    aria-label={`Удалить «${item.name}» из корзины`}
                    title="Удалить"
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    onClick={() =>
                      removeItem({
                        id: item.id,
                        name: item.name,
                        color: item.color ?? "",
                        hideCartImage: item.hideCartImage === true,
                      })
                    }
                  >
                    <span className="text-lg leading-none" aria-hidden="true">
                      ✕
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 text-right">
        <span className="hidden text-sm text-zinc-700 print:block">
          Позиций: {items.length} · Всего предметов: {totalQuantity}
        </span>
        <span className="text-lg font-semibold">
          Итого: {formatPrice(totalPrice)}
        </span>
      </div>

      {!adminLoading && isAdmin ? (
        <AdminCartLeadForm items={items} totalPrice={totalPrice} />
      ) : (
        <CartLeadForm items={items} totalPrice={totalPrice} onSubmitted={clear} />
      )}
    </main>
  );
}
