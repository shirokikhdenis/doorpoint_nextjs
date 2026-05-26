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
      <nav className="mx-auto flex w-full max-w-7xl items-center p-3">
        <div className="flex-1" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-base font-medium transition ${
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
        <div className="flex flex-1 justify-end">
          <Link
            href={cartLink.href}
            aria-current={pathname === cartLink.href ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-base font-medium transition ${
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
