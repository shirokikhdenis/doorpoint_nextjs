"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/catalog", label: "Каталог" },
  { href: "/contact", label: "Контакты" },
  { href: "/uslugi", label: "Доставка и монтаж" },
  { href: "/portfolio", label: "Наши работы" },
];

const cartLink = { href: "/cart", label: "Корзина" };

export function AppNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur print:hidden">
      <nav className="mx-auto flex w-full max-w-[1630px] items-center px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center md:hidden">
          <button
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-primary-nav"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50"
          >
            <span className="sr-only">Открыть меню</span>
            <span className="text-lg leading-none">{isMobileMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        <div className="hidden w-[108px] shrink-0 md:block" aria-hidden />

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-sm font-medium transition md:px-3 md:text-base ${
                  isActive
                    ? "border-[#2C2CB7] bg-[#2C2CB7] text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-2 flex shrink-0 justify-end">
          <Link
            href={cartLink.href}
            aria-current={pathname === cartLink.href ? "page" : undefined}
            className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-sm font-medium transition md:px-3 md:text-base ${
              pathname === cartLink.href
                ? "border-[#2C2CB7] bg-[#2C2CB7] text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            {cartLink.label}
          </Link>
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div id="mobile-primary-nav" className="border-t border-zinc-200 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-[1630px] flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-[#2C2CB7] bg-[#2C2CB7] text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
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
