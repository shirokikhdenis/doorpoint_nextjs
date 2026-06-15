"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppCatalogNav } from "@/features/navigation/app-catalog-nav";
import { CartAddedToast } from "@/features/store/cart-added-toast";
import { StoreFooter } from "@/features/store/store-footer";
import { StoreHero } from "@/features/store/store-hero";

const isMainCatalogPage = (pathname: string | null, catalogPage: string | null) => {
  if (pathname !== "/catalog") return false;
  const slug = (catalogPage || "").trim();
  return slug === "" || slug === "all";
};

function StoreHeroGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catalogPage = searchParams.get("catalogPage");
  if (!isMainCatalogPage(pathname, catalogPage)) return null;
  return <StoreHero />;
}

/**
 * Герой и навбар витрин — витрина, не админка; герой только на главной витрине
 * (/catalog?catalogPage=all или /catalog без параметра — дефолт all).
 * Форма замера — на странице каталога и карточке товара под контентом. Футер — на всех страницах витрины.
 */
export function PublicStorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <StoreHeroGate />
      </Suspense>
      <div id="catalog-vitrines" className="scroll-mt-[88px]">
        <Suspense fallback={null}>
          <AppCatalogNav />
        </Suspense>
      </div>
      {children}
      <StoreFooter />
      <CartAddedToast />
    </>
  );
}
