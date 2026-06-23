"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AddToCartIconButton } from "@/features/store/add-to-cart-icon-button";
import { CartQuantityStepper } from "@/features/store/cart-quantity-stepper";
import { CartLineRef, findCartLine } from "@/lib/client/cart-store";
import { formatPrice } from "@/lib/client/format";
import { useCart } from "@/lib/client/use-cart";
import type { RelatedFittingItem, RelatedFittings } from "@/lib/client/normalizers";
import { productHref } from "@/lib/client/product-url";

function RelatedFittingCard({ item }: { item: RelatedFittingItem }) {
  const { items, addItem, setQuantity: setCartQuantity } = useCart();
  const lineRef = useMemo<CartLineRef>(
    () => ({
      id: item.id,
      name: item.name,
      color: "",
      hideCartImage: false,
    }),
    [item.id, item.name],
  );
  const existing = findCartLine(items, lineRef);
  const quantity = existing?.quantity ?? 1;
  const showQuantity = Boolean(existing);

  const handleAddToCart = () => {
    if (showQuantity) return;
    addItem({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: 1,
      ...(item.sku?.trim() ? { sku: item.sku.trim() } : {}),
    });
  };

  const handleQuantityChange = (next: number) => {
    if (!showQuantity) return;
    setCartQuantity(lineRef, next);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md">
      <div className="relative">
        <Link href={productHref(item)} className="group block">
          <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-white p-3">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.02]"
              />
            ) : (
              <span className="text-xs text-zinc-400">Нет фото</span>
            )}
          </div>
        </Link>
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
          {showQuantity ? (
            <CartQuantityStepper quantity={quantity} onQuantityChange={handleQuantityChange} />
          ) : null}
          <AddToCartIconButton embedded productName={item.name} onClick={handleAddToCart} />
        </div>
      </div>
      <Link href={productHref(item)} className="group mt-3 block">
        <p className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:text-brand">
          {item.name}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{item.subcategory || item.sku}</p>
      </Link>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{formatPrice(item.price)}</p>
    </article>
  );
}

type ProductRelatedFittingsProps = {
  relatedFittings: RelatedFittings;
};

export function ProductRelatedFittings({ relatedFittings }: ProductRelatedFittingsProps) {
  const items = relatedFittings.items;
  if (items.length === 0) return null;

  const mentionsRosette = items.some((item) => item.group === "fixator");

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Сопутствующая фурнитура</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Подобрано по производителю и артикулу цвета фурнитуры
        {mentionsRosette ? " (для фиксатора — также по розетке)" : ""}
        , с учётом типа замка и петель.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RelatedFittingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
