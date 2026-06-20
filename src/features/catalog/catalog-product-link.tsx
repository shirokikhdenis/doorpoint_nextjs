"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type CatalogProductLinkProps = {
  href: string;
  className?: string;
  onBeforeNavigate?: () => void;
  children: ReactNode;
};

/** Ссылка на карточку. Скролл сбрасывается уже на странице товара, не до клика. */
export function CatalogProductLink({
  href,
  className,
  onBeforeNavigate,
  children,
}: CatalogProductLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={() => onBeforeNavigate?.()}
    >
      {children}
    </Link>
  );
}
