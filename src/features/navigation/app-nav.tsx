import Link from "next/link";

const links = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/cart", label: "Корзина" },
  { href: "/admin", label: "Админка" },
  { href: "/database", label: "База" },
  { href: "/structure", label: "Структура" },
  { href: "/about", label: "О проекте" },
  { href: "/contact", label: "Контакты" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 p-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
