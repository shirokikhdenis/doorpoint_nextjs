"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CatalogPageItem,
  normalizeCatalogPages,
} from "@/lib/client/normalizers";
import { catalogTabClass } from "@/features/store/storefront-ui";
import { catalogPageFromPathname, catalogPagePath } from "@/lib/catalog-url";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";

const tabButtonBase =
  "max-w-[14rem] snap-start truncate md:max-w-none";

/**
 * Глобальный навбар витрин: «Общий каталог», «Входные двери», ...
 * Ссылки ведут на `/catalog` или `/catalog/<slug>`.
 */
export function AppCatalogNav() {
  const [pages, setPages] = useState<CatalogPageItem[]>([]);
  const [lastSelectedSlug, setLastSelectedSlug] = useState("");
  const pathname = usePathname();

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
  }, [pathname]);

  if (pages.length === 0) return null;

  const isOnCatalog = pathname === "/catalog" || pathname.startsWith("/catalog/");
  const pathSlug = catalogPageFromPathname(pathname);
  const fallbackSlug = (pages.find((page) => page.isDefault) || pages[0])?.slug || CATALOG_PAGE_SLUG.all;
  const activeSlug = isOnCatalog
    ? pathSlug !== CATALOG_PAGE_SLUG.all
      ? pathSlug
      : fallbackSlug
    : lastSelectedSlug;

  return (
    <div className="relative border-b border-zinc-200 bg-white print:hidden">
      <nav className="mx-auto flex w-full max-w-[1920px] snap-x snap-mandatory items-end gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center">
        {pages.map((page) => {
          const isActive = page.slug === activeSlug;
          return (
            <Link
              key={page.slug}
              href={catalogPagePath(page.slug)}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setLastSelectedSlug(page.slug)}
              className={`${tabButtonBase} ${catalogTabClass(isActive)}`}
            >
              {page.name}
            </Link>
          );
        })}
      </nav>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent md:hidden" />
    </div>
  );
}
