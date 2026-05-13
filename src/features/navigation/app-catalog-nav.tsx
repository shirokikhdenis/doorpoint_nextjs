"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CatalogPageItem,
  normalizeCatalogPages,
} from "@/lib/client/normalizers";

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

  if (pages.length === 0) return null;

  const isOnCatalog = pathname === "/catalog";
  const urlSlug = searchParams?.get("catalogPage") || "";
  const fallbackSlug = (pages.find((page) => page.isDefault) || pages[0])?.slug || "";
  const activeSlug = isOnCatalog ? urlSlug || fallbackSlug : "";

  return (
    <div className="border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-2 p-3">
        {pages.map((page) => {
          const isActive = page.slug === activeSlug;
          return (
            <Link
              key={page.slug}
              href={`/catalog?catalogPage=${encodeURIComponent(page.slug)}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-base font-medium transition ${
                isActive
                  ? "border-[#2C2CB7] bg-[#2C2CB7] text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
              }`}
            >
              {page.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
