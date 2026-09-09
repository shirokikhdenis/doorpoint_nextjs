"use client";

import { useState } from "react";
import { CartQuantityStepper } from "@/features/store/cart-quantity-stepper";
import { formatPrice } from "@/lib/client/format";
import { useCart } from "@/lib/client/use-cart";
import type { AccessoryItem } from "@/lib/client/normalizers";

type AccessoryRowProps = {
  item: AccessoryItem;
  doorColor: string;
};

function useAccessoryCartAdd(item: AccessoryItem, doorColor: string) {
  const { addItem } = useCart();
  const [qty, setQty] = useState<number>(1);

  const handleAdd = () => {
    addItem(
      {
        id: item.id,
        name: item.name,
        image: "",
        price: item.price,
        quantity: qty,
        ...(item.sku?.trim() ? { sku: item.sku.trim() } : {}),
        ...(doorColor.trim() ? { color: doorColor.trim() } : {}),
        hideCartImage: true,
        noProductLink: true,
      },
      { toast: "Комплектующее добавлено в корзину" },
    );
  };

  return { qty, setQty, handleAdd };
}

function AccessoryAddButton({
  itemName,
  onClick,
  className,
}: {
  itemName: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Добавить «${itemName}» в корзину`}
      title="Добавить в корзину"
      className={className}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
    </button>
  );
}

function AccessoryRow({ item, doorColor }: AccessoryRowProps) {
  const { qty, setQty, handleAdd } = useAccessoryCartAdd(item, doorColor);

  return (
    <tr className="border-b border-zinc-200 last:border-b-0">
      <td className="min-w-0 py-2.5 pr-4 align-middle text-zinc-900">{item.name}</td>
      <td className="whitespace-nowrap px-2 py-2.5 text-center align-middle font-medium tabular-nums">
        {formatPrice(item.price)}
      </td>
      <td className="px-2 py-2.5 text-center align-middle">
        <CartQuantityStepper quantity={qty} onQuantityChange={setQty} max={999} />
      </td>
      <td className="w-10 py-2.5 pl-2 text-right align-middle">
        <AccessoryAddButton
          itemName={item.name}
          onClick={handleAdd}
          className="inline-flex h-8 w-8 items-center justify-center text-zinc-500 hover:text-zinc-900"
        />
      </td>
    </tr>
  );
}

function AccessoryCard({ item, doorColor }: AccessoryRowProps) {
  const { qty, setQty, handleAdd } = useAccessoryCartAdd(item, doorColor);

  return (
    <article className="border-b border-zinc-200 py-3 last:border-b-0">
      <p className="break-words text-sm text-zinc-900">{item.name}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="shrink-0 font-medium tabular-nums">{formatPrice(item.price)}</span>
        <div className="flex items-center gap-2">
          <CartQuantityStepper quantity={qty} onQuantityChange={setQty} max={999} />
          <AccessoryAddButton
            itemName={item.name}
            onClick={handleAdd}
            className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 hover:text-zinc-900"
          />
        </div>
      </div>
    </article>
  );
}

type ProductAccessoriesTableProps = {
  accessories: AccessoryItem[];
  doorColor: string;
};

export function ProductAccessoriesTable({ accessories, doorColor }: ProductAccessoriesTableProps) {
  if (accessories.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Погонаж</h2>
      <div className="mt-4 sm:hidden">
        {accessories.map((item) => (
          <AccessoryCard key={item.id} item={item} doorColor={doorColor} />
        ))}
      </div>
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col />
            <col className="w-[7rem]" />
            <col className="w-[9rem]" />
            <col className="w-11" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-4 text-left font-medium">Наименование</th>
              <th className="px-2 pb-2 text-center font-medium">Цена</th>
              <th className="px-2 pb-2 text-center font-medium">Кол-во</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {accessories.map((item) => (
              <AccessoryRow key={item.id} item={item} doorColor={doorColor} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
