import type { Metadata } from "next";
import Link from "next/link";
import { buildPageTitle } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: buildPageTitle("Страница не найдена"),
  description: "Запрашиваемая страница не найдена. Перейдите в каталог дверей или на главную.",
};

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Страница не найдена</h1>
      <p className="mt-3 max-w-xl text-zinc-600">
        Такой страницы нет или она была перенесена. Вернитесь в каталог или на главную —
        там входные и межкомнатные двери, услуги и контакты салона.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/catalog"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          В каталог
        </Link>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-500"
        >
          На главную
        </Link>
        <Link
          href="/contact"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:border-zinc-500"
        >
          Контакты
        </Link>
      </div>
    </main>
  );
}
