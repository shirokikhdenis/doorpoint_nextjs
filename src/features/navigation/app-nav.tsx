"use client";

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

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur print:hidden">
      <nav className="mx-auto flex w-full max-w-7xl items-center px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    </header>
  );
}
