"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AppCatalogNav } from "@/features/navigation/app-catalog-nav";
import { StoreFooter } from "@/features/store/store-footer";
import { StoreHero } from "@/features/store/store-hero";

/**
 * Герой и навбар витрин — витрина, не админка; герой скрыт на карточке товара (/product/...) и в корзине.
 * Форма замера — на странице каталога и карточке товара под контентом. Футер — на всех страницах витрины.
 */
export function PublicStorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const hideHero =
    (pathname?.startsWith("/product/") ?? false) || pathname === "/cart";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {!hideHero ? <StoreHero /> : null}
      <div id="catalog-vitrines" className="scroll-mt-[88px]">
        <Suspense fallback={null}>
          <AppCatalogNav />
        </Suspense>
      </div>
      {children}
      <StoreFooter />
    </>
  );
}
