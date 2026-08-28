"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteNavLinkClass } from "@/features/store/storefront-ui";
import { useCart } from "@/lib/client/use-cart";
import { cn } from "@/lib/utils";

type CartNavLinkProps = {
  className?: string;
};

export function CartNavLink({ className }: CartNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === "/cart";
  const { totalQuantity } = useCart();

  const label = totalQuantity > 0 ? `Корзина (${totalQuantity})` : "Корзина";
  const ariaLabel =
    totalQuantity > 0
      ? `Корзина, ${totalQuantity} ${totalQuantity === 1 ? "товар" : totalQuantity < 5 ? "товара" : "товаров"}`
      : "Корзина";

  return (
    <Link
      href="/cart"
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      aria-label={ariaLabel}
      className={cn(siteNavLinkClass(isActive), "px-0 md:px-0 lg:px-2.5", className)}
    >
      <span className="relative inline-flex h-10 w-10 items-center justify-center lg:hidden">
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
        {totalQuantity > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white">
            {totalQuantity > 99 ? "99+" : totalQuantity}
          </span>
        ) : null}
      </span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
