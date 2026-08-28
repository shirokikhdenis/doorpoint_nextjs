"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AppCatalogNav } from "@/features/navigation/app-catalog-nav";
import { CartAddedToast } from "@/features/store/cart-added-toast";
import { StoreFooter } from "@/features/store/store-footer";
import { useAdminSession } from "@/lib/client/use-admin-session";

const showCatalogVitrinesNav = (pathname: string | null) =>
  pathname === "/catalog" ||
  (pathname?.startsWith("/catalog/") ?? false) ||
  (pathname?.startsWith("/product/") ?? false);

/**
 * Навбар витрин каталога — на страницах каталога и карточки товара;
 * для залогиненного админа — на любой странице витрины.
 * Футер — на всех страницах витрины.
 */
export function PublicStorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin, loading: adminLoading } = useAdminSession();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const adminMode = !adminLoading && isAdmin;
  const showCatalogChrome = showCatalogVitrinesNav(pathname) || adminMode;

  if (isAdminRoute) {
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
