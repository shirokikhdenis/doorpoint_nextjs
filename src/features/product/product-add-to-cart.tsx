"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CartQuantityStepper } from "@/features/store/cart-quantity-stepper";
import { CartLineRef, findCartLine } from "@/lib/client/cart-store";
import { useCart } from "@/lib/client/use-cart";
import { cn } from "@/lib/utils";

type ProductAddToCartProps = {
  productId: number;
  cartName: string;
  cartColorLabel: string;
  cartImage: string;
  price: number;
  sku?: string;
  className?: string;
};

export function ProductAddToCart({
  productId,
  cartName,
  cartColorLabel,
  cartImage,
  price,
  sku,
  className,
}: ProductAddToCartProps) {
  const { items, addItem, setQuantity: setCartQuantity } = useCart();
  const lineRef = useMemo<CartLineRef>(
    () => ({
      id: productId,
      name: cartName,
      color: cartColorLabel.trim(),
      hideCartImage: false,
    }),
    [productId, cartName, cartColorLabel],
  );
  const existing = findCartLine(items, lineRef);
  const quantity = existing?.quantity ?? 1;
  const showQuantity = Boolean(existing);

  const handleAdd = () => {
    if (showQuantity) return;
    addItem({
      id: productId,
      name: cartName,
      image: cartImage,
      price,
      quantity: 1,
      ...(sku ? { sku } : {}),
      ...(cartColorLabel.trim() ? { color: cartColorLabel.trim() } : {}),
    });
  };

  const handleQuantityChange = (next: number) => {
    if (!showQuantity) return;
    setCartQuantity(lineRef, next);
  };

  return (
    <div className={cn("!mt-6 flex flex-wrap items-center gap-3", className)}>
      <Button type="button" variant="brand" onClick={handleAdd}>
        Добавить в корзину
      </Button>
      {showQuantity ? (
        <CartQuantityStepper quantity={quantity} onQuantityChange={handleQuantityChange} />
      ) : null}
    </div>
  );
}
