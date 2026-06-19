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

  const label =
    totalQuantity > 0 ? `Корзина (${totalQuantity})` : "Корзина";

  return (
    <Link
      href="/cart"
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      aria-label={
        totalQuantity > 0
          ? `Корзина, ${totalQuantity} ${totalQuantity === 1 ? "товар" : totalQuantity < 5 ? "товара" : "товаров"}`
          : "Корзина"
      }
      className={cn(siteNavLinkClass(isActive), className)}
    >
      {label}
    </Link>
  );
}
