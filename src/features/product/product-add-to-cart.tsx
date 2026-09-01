"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CartQuantityStepper } from "@/features/store/cart-quantity-stepper";
import { CartLineRef, findCartLine } from "@/lib/client/cart-store";
import type { CartItem } from "@/lib/client/cart-types";
import { useCart } from "@/lib/client/use-cart";
import { cn } from "@/lib/utils";

export type ProductCartLineInput = {
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
};

type ProductAddToCartProps = ProductCartLineInput & {
  className?: string;
};

export const buildProductCartLineItem = ({
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
}: ProductCartLineInput): Partial<CartItem> => ({
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
  ...(glassOptionId ? { glassOptionId, glassOptionName: glassOptionName?.trim() || "" } : {}),
  ...(hardwareServices.length > 0 ? { hardwareServices } : {}),
});

export function useProductCartLine(input: ProductCartLineInput) {
  const { items, addItem, setQuantity: setCartQuantity } = useCart();
  const hardwareServices = input.hardwareServices ?? [];
  const lineRef = useMemo<CartLineRef>(
    () => ({
      id: input.productId,
      name: input.cartName,
      color: input.cartColorLabel.trim(),
      finishId: input.finishId,
      glassOptionId: input.glassOptionId,
      hardwareServiceKey: hardwareServices
        .map((service) => service.id)
        .sort((a, b) => a - b)
        .join(","),
      hideCartImage: false,
    }),
    [
      input.productId,
      input.cartName,
      input.cartColorLabel,
      input.finishId,
      input.glassOptionId,
      hardwareServices,
    ],
  );
  const existing = findCartLine(items, lineRef);
  const addDisabled = Boolean(input.requiresFinish && !input.finishId);

  const addToCart = () => {
    if (addDisabled) return false;
    if (existing) return true;
    addItem(buildProductCartLineItem(input));
    return true;
  };

  return {
    lineRef,
    existing,
    quantity: existing?.quantity ?? 1,
    addDisabled,
    addToCart,
    setCartQuantity,
  };
}

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
  const { existing, quantity, addDisabled, addToCart, lineRef, setCartQuantity } =
    useProductCartLine({
      productId,
      cartName,
      cartColorLabel,
      cartGlassLabel,
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
      hardwareServices,
      requiresFinish,
    });
  const showQuantity = Boolean(existing);

  const handleAdd = () => {
    if (showQuantity || addDisabled) return;
    addToCart();
  };

  const handleQuantityChange = (next: number) => {
    if (!showQuantity) return;
    setCartQuantity(lineRef, next);
  };

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

export function ProductCartRequestLink({
  className,
  ...input
}: ProductCartLineInput & { className?: string }) {
  const router = useRouter();
  const { addDisabled, addToCart } = useProductCartLine(input);

  const handleClick = () => {
    if (!addToCart()) return;
    router.push("/cart");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={addDisabled}
      className={cn(
        "font-semibold text-brand underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline",
        className,
      )}
    >
      оставьте заявку
    </button>
  );
}
