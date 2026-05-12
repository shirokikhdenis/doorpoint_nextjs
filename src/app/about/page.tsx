export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">О проекте</h1>
      <div className="mt-4 rounded-lg border bg-white p-6 text-sm leading-7 text-zinc-700">
        <p>
          Это мигрированная версия проекта на стеке Next.js + React + Tailwind + PostgreSQL.
        </p>
        <p className="mt-3">
          Каталог, карточка товара, корзина и админка работают через единый набор Next API route
          handlers.
        </p>
      </div>
    </main>
  );
}
