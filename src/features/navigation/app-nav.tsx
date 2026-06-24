"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CatalogHeaderSearch } from "@/features/catalog/catalog-header-search";
import { CartNavLink } from "@/features/navigation/cart-nav-link";
import { isCatalogPathname } from "@/lib/catalog-page-paths";
import { siteNavLinkClass, storefrontHeaderTripleGridClass } from "@/features/store/storefront-ui";

const links = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/contact", label: "Контакты" },
  { href: "/uslugi", label: "Доставка и монтаж" },
  { href: "/portfolio", label: "Наши работы" },
  { href: "/fabriki", label: "Фабрики" },
];

function NavItem({
  href,
  label,
  isActive,
  className,
}: {
  href: string;
  label: string;
  isActive: boolean;
  className: string;
}) {
  if (href === "/catalog") {
    return (
      <a href={href} aria-current={isActive ? "page" : undefined} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const showCatalogSearch = isCatalogPathname(pathname);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isLinkActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname?.startsWith(`${href}/`);

  const headerActions = (
    <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
      {showCatalogSearch ? (
        <CatalogHeaderSearch className="min-w-0 flex-1 sm:flex-none sm:w-44 md:w-56" />
      ) : null}
      <CartNavLink className="shrink-0" />
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden">
      <nav
        className="mx-auto w-full max-w-[1920px] px-4 py-2 sm:px-6 lg:px-8"
        aria-label="Основная навигация"
      >
        <div className="flex items-center justify-between gap-2 md:hidden">
          <button
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-primary-nav"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            <span className="sr-only">{isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}</span>
            <span className="text-lg leading-none">{isMobileMenuOpen ? "✕" : "☰"}</span>
          </button>

          <div className="min-w-0 flex-1">{headerActions}</div>
        </div>

        <div className="hidden items-center gap-3 md:flex lg:hidden">
          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
            {links.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={isLinkActive(link.href)}
                className={siteNavLinkClass(isLinkActive(link.href))}
              />
            ))}
          </div>
          {headerActions}
        </div>

        <div className={`hidden items-center gap-8 lg:grid ${storefrontHeaderTripleGridClass}`}>
          <div aria-hidden="true" />
          <div className="flex items-center justify-center gap-0.5">
            {links.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={isLinkActive(link.href)}
                className={siteNavLinkClass(isLinkActive(link.href))}
              />
            ))}
          </div>
          {headerActions}
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div id="mobile-primary-nav" className="border-t border-zinc-200 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-[1920px] flex-col px-4 py-2 sm:px-6 lg:px-8">
            {links.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                isActive={isLinkActive(link.href)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  isLinkActive(link.href)
                    ? "bg-zinc-50 font-semibold text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
