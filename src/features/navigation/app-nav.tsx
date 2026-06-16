"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CartNavLink } from "@/features/navigation/cart-nav-link";
import { siteNavLinkClass, storefrontHeaderTripleGridClass } from "@/features/store/storefront-ui";

const links = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/contact", label: "Контакты" },
  { href: "/uslugi", label: "Доставка и монтаж" },
  { href: "/portfolio", label: "Наши работы" },
];

export function AppNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden">
      <nav
        className="mx-auto w-full max-w-[1920px] px-4 py-2 sm:px-6 lg:px-8"
        aria-label="Основная навигация"
      >
        <div className="flex items-center gap-3 md:hidden">
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

          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-zinc-700">
            Салон дверей
          </p>

          <CartNavLink />
        </div>

        <div className="hidden items-center gap-3 md:flex lg:hidden">
          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={siteNavLinkClass(isActive)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <CartNavLink />
        </div>

        <div className={`hidden items-center gap-8 lg:grid ${storefrontHeaderTripleGridClass}`}>
          <div aria-hidden="true" />
          <div className="flex items-center justify-center gap-0.5">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={siteNavLinkClass(isActive)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex justify-end">
            <CartNavLink className="pr-0" />
          </div>
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div id="mobile-primary-nav" className="border-t border-zinc-200 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-[1920px] flex-col px-4 py-2 sm:px-6 lg:px-8">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-zinc-50 font-semibold text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
