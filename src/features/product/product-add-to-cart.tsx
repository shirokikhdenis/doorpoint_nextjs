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
  cartGlassLabel?: string;
  cartImage: string;
  price: number;
  sku?: string;
  manufacturerId?: string;
  manufacturerName?: string;
  categorySlug?: string;
  finishId?: number;
  finishName?: string;
  glassOptionId?: number;
  glassOptionName?: string;
  hardwareServices?: Array<{ id: number; name: string; price: number }>;
  requiresFinish?: boolean;
  className?: string;
};

export function ProductAddToCart({
  productId,
  cartName,
  cartColorLabel,
  cartGlassLabel = "",
  cartImage,
  price,
  sku,
  manufacturerId,
  manufacturerName,
  categorySlug,
  finishId,
  finishName,
  glassOptionId,
  glassOptionName,
  hardwareServices = [],
  requiresFinish = false,
  className,
}: ProductAddToCartProps) {
  const { items, addItem, setQuantity: setCartQuantity } = useCart();
  const lineRef = useMemo<CartLineRef>(
    () => ({
      id: productId,
      name: cartName,
      color: cartColorLabel.trim(),
      finishId,
      glassOptionId,
      hardwareServiceKey: hardwareServices
        .map((service) => service.id)
        .sort((a, b) => a - b)
        .join(","),
      hideCartImage: false,
    }),
    [productId, cartName, cartColorLabel, finishId, glassOptionId, hardwareServices],
  );
  const existing = findCartLine(items, lineRef);
  const quantity = existing?.quantity ?? 1;
  const showQuantity = Boolean(existing);

  const handleAdd = () => {
    if (showQuantity || (requiresFinish && !finishId)) return;
    addItem({
      id: productId,
      name: cartName,
      image: cartImage,
      price,
      quantity: 1,
      ...(sku ? { sku } : {}),
      ...(manufacturerId?.trim() ? { manufacturerId: manufacturerId.trim() } : {}),
      ...(manufacturerName?.trim() ? { manufacturerName: manufacturerName.trim() } : {}),
      ...(categorySlug?.trim() ? { categorySlug: categorySlug.trim() } : {}),
      ...(cartColorLabel.trim() ? { color: cartColorLabel.trim() } : {}),
      ...(cartGlassLabel.trim() ? { glass: cartGlassLabel.trim() } : {}),
      ...(finishId ? { finishId, finishName: finishName?.trim() || "" } : {}),
      ...(glassOptionId
        ? { glassOptionId, glassOptionName: glassOptionName?.trim() || "" }
        : {}),
      ...(hardwareServices.length > 0 ? { hardwareServices } : {}),
    });
  };

  const handleQuantityChange = (next: number) => {
    if (!showQuantity) return;
    setCartQuantity(lineRef, next);
  };

  const addDisabled = requiresFinish && !finishId;

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button
        type="button"
        variant="brand"
        onClick={handleAdd}
        disabled={addDisabled}
        className="w-full sm:w-auto"
      >
        Добавить в корзину
      </Button>
      {showQuantity ? (
        <CartQuantityStepper quantity={quantity} onQuantityChange={handleQuantityChange} />
      ) : null}
    </div>
  );
}
