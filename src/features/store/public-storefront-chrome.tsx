"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AppCatalogNav } from "@/features/navigation/app-catalog-nav";
import { CartAddedToast } from "@/features/store/cart-added-toast";
import { StoreFooter } from "@/features/store/store-footer";

const showCatalogVitrinesNav = (pathname: string | null) =>
  pathname === "/catalog" ||
  (pathname?.startsWith("/catalog/") ?? false) ||
  (pathname?.startsWith("/product/") ?? false);

/**
 * Навбар витрин каталога — на страницах каталога и карточки товара.
 * Форма замера — на странице каталога и карточке товара.
 * Футер — на всех страницах витрины.
 */
export function PublicStorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const showCatalogChrome = showCatalogVitrinesNav(pathname);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {showCatalogChrome ? (
        <div id="catalog-vitrines" className="scroll-mt-[88px]">
          <Suspense fallback={null}>
            <AppCatalogNav />
          </Suspense>
        </div>
      ) : null}
      {children}
      <StoreFooter />
      <CartAddedToast />
    </>
  );
}
