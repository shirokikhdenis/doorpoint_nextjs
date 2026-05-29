"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CatalogPageItem,
  normalizeCatalogPages,
} from "@/lib/client/normalizers";
import { navToneClass } from "@/features/store/storefront-ui";

const navButtonBase =
  "max-w-[14rem] shrink-0 snap-start truncate whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium md:max-w-none md:px-3 md:text-base";

/**
 * Глобальный навбар витрин: «Общий каталог», «Входные двери», ... Расположен
 * под основным `AppNav`, центрирован. Ссылки ведут на `/catalog?catalogPage=<slug>` —
 * сам каталог синхронизирует свой стейт с этим query-параметром (см. `useSearchParams`
 * в `src/app/catalog/page.tsx`).
 *
 * Когда мы НЕ на странице `/catalog`, активная подсветка не показывается — навбар
 * просто служит быстрым переходом в нужный раздел каталога.
 */
export function AppCatalogNav() {
  const [pages, setPages] = useState<CatalogPageItem[]>([]);
  const [lastSelectedSlug, setLastSelectedSlug] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products/catalog-pages")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) setPages(normalizeCatalogPages(data));
      })
      .catch(() => {
        /* ignore — навбар скроется (pages пустые) */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("lastCatalogPage") || "";
    if (saved) setLastSelectedSlug(saved);
  }, [pathname, searchParams]);

  if (pages.length === 0) return null;

  const isOnCatalog = pathname === "/catalog";
  const urlSlug = searchParams?.get("catalogPage") || "";
  const fallbackSlug = (pages.find((page) => page.isDefault) || pages[0])?.slug || "";
  const activeSlug = isOnCatalog
    ? urlSlug || lastSelectedSlug || fallbackSlug
    : lastSelectedSlug;

  return (
    <div className="relative border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden">
      <nav className="mx-auto flex w-full max-w-[1630px] snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center">
        {pages.map((page) => {
          const isActive = page.slug === activeSlug;
          return (
            <Link
              key={page.slug}
              href={`/catalog?catalogPage=${encodeURIComponent(page.slug)}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setLastSelectedSlug(page.slug)}
              className={`${navButtonBase} ${navToneClass(isActive)}`}
            >
              {page.name}
            </Link>
          );
        })}
      </nav>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white/95 to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/95 to-transparent md:hidden" />
    </div>
  );
}
