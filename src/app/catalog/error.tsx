"use client";

type CatalogErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CatalogError({ error, reset }: CatalogErrorProps) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold text-zinc-900">Не удалось загрузить каталог</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {error.message || "Произошла ошибка при загрузке данных."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Попробовать снова
      </button>
    </main>
  );
}
