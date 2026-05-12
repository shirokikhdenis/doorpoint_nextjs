"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminBootstrap, normalizeAdminBootstrap } from "@/lib/client/normalizers";

export default function AdminPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [notice, setNotice] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState<number>(0);
  const [attributeName, setAttributeName] = useState("");
  const [attributeCode, setAttributeCode] = useState("");

  const reload = async () => {
    const response = await fetch("/api/admin/bootstrap");
    if (!response.ok) throw new Error("Не удалось загрузить bootstrap");
    setBootstrap(normalizeAdminBootstrap(await response.json()));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/bootstrap");
        if (!response.ok) throw new Error("Не удалось загрузить bootstrap");
        if (!cancelled) {
          setBootstrap(normalizeAdminBootstrap(await response.json()));
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : "Ошибка");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await response.text());
  };

  /**
   * Удаление без тела — используем для DELETE категорий и подкатегорий.
   * Возвращает понятное сообщение из 409/404 (см. /api/admin/[...path]).
   */
  const sendDelete = async (url: string) => {
    const response = await fetch(url, { method: "DELETE" });
    if (response.status === 204) return;
    let payload: { message?: string } = {};
    try {
      payload = await response.json();
    } catch {
      payload = { message: await response.text() };
    }
    throw new Error(payload.message || `Ошибка ${response.status}`);
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Удалить категорию «${name}» и все её подкатегории?`)) return;
    try {
      await sendDelete(`/api/admin/categories/${id}`);
      await reload();
      setNotice(`Категория «${name}» удалена`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка");
    }
  };

  const handleDeleteSubcategory = async (id: number, name: string) => {
    if (!window.confirm(`Удалить подкатегорию «${name}»?`)) return;
    try {
      await sendDelete(`/api/admin/subcategories/${id}`);
      await reload();
      setNotice(`Подкатегория «${name}» удалена`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка");
    }
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/categories", "POST", { name: categoryName });
      setCategoryName("");
      await reload();
      setNotice("Категория добавлена");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка");
    }
  };

  const submitSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/subcategories", "POST", {
        categoryId: subcategoryCategoryId,
        name: subcategoryName,
      });
      setSubcategoryName("");
      await reload();
      setNotice("Подкатегория добавлена");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка");
    }
  };

  const submitAttribute = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/attributes", "POST", {
        name: attributeName,
        code: attributeCode,
        type: "text",
      });
      setAttributeName("");
      setAttributeCode("");
      await reload();
      setNotice("Атрибут добавлен");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ошибка");
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/catalog-pages"
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Витрины каталога →
          </Link>
          <Link
            href="/admin/products"
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Товары →
          </Link>
          <Link
            href="/admin/import"
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Импорт CSV →
          </Link>
        </div>
      </div>
      {notice ? <p className="mt-2 text-sm text-zinc-600">{notice}</p> : null}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <form onSubmit={submitCategory} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-medium">Новая категория</h2>
          <input
            className="w-full rounded border px-3 py-2"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Название категории"
          />
          <button className="rounded bg-black px-3 py-2 text-white">Добавить</button>
        </form>

        <form onSubmit={submitSubcategory} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-medium">Новая подкатегория</h2>
          <select
            className="w-full rounded border px-3 py-2"
            value={subcategoryCategoryId}
            onChange={(event) => setSubcategoryCategoryId(Number(event.target.value))}
          >
            <option value={0}>Выберите категорию</option>
            {bootstrap.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            value={subcategoryName}
            onChange={(event) => setSubcategoryName(event.target.value)}
            placeholder="Название подкатегории"
          />
          <button className="rounded bg-black px-3 py-2 text-white">Добавить</button>
        </form>

        <form onSubmit={submitAttribute} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-medium">Новый атрибут</h2>
          <input
            className="w-full rounded border px-3 py-2"
            value={attributeName}
            onChange={(event) => setAttributeName(event.target.value)}
            placeholder="Название"
          />
          <input
            className="w-full rounded border px-3 py-2"
            value={attributeCode}
            onChange={(event) => setAttributeCode(event.target.value)}
            placeholder="Код (например width)"
          />
          <button className="rounded bg-black px-3 py-2 text-white">Добавить</button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded border bg-white p-4">
          <h3 className="mb-3 font-medium">Категории и подкатегории</h3>
          {bootstrap.categories.length === 0 ? (
            <p className="text-sm text-zinc-500">Категорий пока нет.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {bootstrap.categories.map((category) => {
                const children = bootstrap.subcategories.filter(
                  (sub) => sub.categoryId === category.id,
                );
                return (
                  <li key={category.id} className="rounded border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {category.name}{" "}
                        <span className="font-normal text-zinc-500">({category.slug})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Удалить
                      </button>
                    </div>
                    {children.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2 pl-2">
                        {children.map((sub) => (
                          <li
                            key={sub.id}
                            className="flex flex-wrap items-center justify-between gap-2"
                          >
                            <span>
                              {sub.name}{" "}
                              <span className="text-zinc-500">({sub.slug || "—"})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                              className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                            >
                              Удалить
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 pl-2 text-xs text-zinc-400">
                        Подкатегорий нет
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded border bg-white p-4">
          <h3 className="mb-2 font-medium">Товары</h3>
          <ul className="space-y-1 text-sm">
            {bootstrap.products.map((product) => (
              <li key={product.id}>
                {product.sku} - {product.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
