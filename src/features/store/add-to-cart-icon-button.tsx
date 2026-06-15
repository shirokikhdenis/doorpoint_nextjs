"use client";

import type { ButtonHTMLAttributes } from "react";

const CartIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);

type AddToCartIconButtonProps = {
  productName: string;
  variant?: "overlay" | "plain";
  /** В группе с количеством — без absolute, позиционирует родитель. */
  embedded?: boolean;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "className">;

const overlayBaseClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white/95 text-brand shadow-sm backdrop-blur-sm transition-colors hover:bg-brand hover:text-white";

const variantClass: Record<NonNullable<AddToCartIconButtonProps["variant"]>, string> = {
  overlay: overlayBaseClass,
  plain:
    "inline-flex h-9 w-9 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

export function AddToCartIconButton({
  productName,
  variant = "overlay",
  embedded = false,
  onClick,
  className,
}: AddToCartIconButtonProps) {
  const positionClass = variant === "overlay" && !embedded ? "absolute bottom-2 right-2" : "";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(event);
      }}
      aria-label={`Добавить «${productName}» в корзину`}
      title="Добавить в корзину"
      className={[positionClass, variantClass[variant], className].filter(Boolean).join(" ")}
    >
      <CartIcon className={variant === "overlay" ? "h-4 w-4" : "h-5 w-5"} />
    </button>
  );
}
