import Link from "next/link";

export default function Home() {
  const routes = [
    { href: "/catalog", label: "Catalog" },
    { href: "/cart", label: "Cart" },
    { href: "/admin", label: "Admin" },
    { href: "/database", label: "Database" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/structure", label: "Structure" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-3xl font-semibold">test_nextjs</h1>
      <p className="text-sm text-zinc-600">
        Mapped routes and API are now served by Next.js App Router with PostgreSQL via node-postgres.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-md border border-zinc-300 px-4 py-2 text-center text-sm hover:bg-zinc-100"
          >
            {route.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
