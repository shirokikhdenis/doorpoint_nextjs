export default function StructurePage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">Structure</h1>
      <div className="mt-4 rounded-lg border bg-white p-6 text-sm leading-7 text-zinc-700">
        <p>
          Проект разделен на 3 слоя: <strong>App Router</strong> (страницы и API),{" "}
          <strong>server layer</strong> (services/repositories/db) и <strong>client layer</strong>{" "}
          (React UI + local storage cart).
        </p>
        <p className="mt-3">
          Основные API: <code>/api/products</code>, <code>/api/products/meta</code>,{" "}
          <code>/api/products/catalog-pages</code>, <code>/api/admin/*</code>.
        </p>
        <p className="mt-3">
          Текущий UI полностью обслуживается React-страницами, без встраивания legacy HTML.
        </p>
      </div>
    </main>
  );
}
