"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminBootstrap,
  AdminCatalogPage,
  normalizeAdminBootstrap,
} from "@/lib/client/normalizers";

type EditorState = {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  categoryIds: number[];
  subcategoryIds: number[];
  filterAttributeIds: number[];
  seoTitle: string;
  seoDescription: string;
};

const initEditorFromPage = (
  page: AdminCatalogPage,
  bootstrap: AdminBootstrap,
): EditorState => {
  const categoryIdBySlug = new Map(
    bootstrap.categories.map((category) => [category.slug, category.id]),
  );
  const subcategoryIdBySlug = new Map(
    bootstrap.subcategories
      .map((sub) => (sub.slug ? [sub.slug, sub.id] as const : null))
      .filter((entry): entry is readonly [string, number] => entry !== null),
  );

  return {
    name: page.name,
    slug: page.slug,
    sortOrder: page.sortOrder,
    isActive: page.isActive,
    categoryIds: page.categories
      .map((category) => categoryIdBySlug.get(category.slug) ?? 0)
      .filter((id) => id > 0),
    subcategoryIds: page.subcategories
      .map((sub) => subcategoryIdBySlug.get(sub.slug) ?? 0)
      .filter((id) => id > 0),
    filterAttributeIds: page.filterAttributes.map((attr) => attr.id),
    seoTitle: page.seoTitle || "",
    seoDescription: page.seoDescription || "",
  };
};

const toggleId = (list: number[], id: number): number[] =>
  list.includes(id) ? list.filter((current) => current !== id) : [...list, id];

const moveId = (list: number[], id: number, direction: -1 | 1): number[] => {
  const index = list.indexOf(id);
  if (index < 0) return list;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return list;
  const next = [...list];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
};

export default function AdminCatalogPagesPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/bootstrap");
        if (!response.ok) throw new Error("Не удалось загрузить bootstrap");
        const data = normalizeAdminBootstrap(await response.json());
        if (!cancelled) setBootstrap(data);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const submitNew = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    if (!newName.trim()) {
      setError("Введите название витрины");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/catalog-pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim() || undefined,
          categoryIds: [],
          subcategoryIds: [],
          filterAttributeIds: [],
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setNewName("");
      setNewSlug("");
      setNotice("Витрина добавлена. Настройте её ниже.");
      triggerReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать витрину");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminPage
      title="Витрины каталога"
      description="Кнопки наверху страницы /catalog — это витрины из таблицы catalog_pages. Здесь можно задать, какие категории/подкатегории попадают в витрину и какие фильтры доступны пользователю."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/catalog-labels">Ярлыки витрин →</Link>
        </Button>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard className="p-4">
      <form onSubmit={submitNew} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Название
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Например, «Уличные двери»"
            className="w-64 rounded border border-zinc-200 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Slug (необязательно)
          <input
            value={newSlug}
            onChange={(event) => setNewSlug(event.target.value)}
            placeholder="например, outdoor-doors"
            className="w-64 rounded border border-zinc-200 px-3 py-1.5 text-sm font-mono"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {creating ? "Создаём…" : "Добавить витрину"}
        </button>
        <p className="ml-auto max-w-md text-xs text-zinc-500">
          После создания у витрины ещё нет категорий — карточка появится ниже, и там можно будет
          выбрать, какие категории и подкатегории она показывает.
        </p>
      </form>
      </AdminCard>

      {loading ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : (
        <section className="space-y-4">
          {bootstrap.catalogPages.length === 0 ? (
            <AdminCard className="p-6">
              <p className="text-sm text-zinc-500">Витрин пока нет.</p>
            </AdminCard>
          ) : (
            bootstrap.catalogPages.map((page) => (
              <CatalogPageEditor
                key={`${page.id}:${reloadToken}`}
                page={page}
                bootstrap={bootstrap}
                onSaved={(message) => {
                  setNotice(message);
                  setError("");
                  triggerReload();
                }}
                onDeleted={(message) => {
                  setNotice(message);
                  setError("");
                  triggerReload();
                }}
                onError={(message) => {
                  setError(message);
                  setNotice("");
                }}
              />
            ))
          )}
        </section>
      )}
    </AdminPage>
  );
}

type EditorProps = {
  page: AdminCatalogPage;
  bootstrap: AdminBootstrap;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
};

function CatalogPageEditor({ page, bootstrap, onSaved, onDeleted, onError }: EditorProps) {
  const initial = useMemo(() => initEditorFromPage(page, bootstrap), [page, bootstrap]);
  const [state, setState] = useState<EditorState>(() => initial);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(initial), [state, initial]);

  const onCheckbox =
    (key: "categoryIds" | "subcategoryIds" | "filterAttributeIds", id: number) =>
    () =>
      setState((prev) => ({ ...prev, [key]: toggleId(prev[key], id) }));

  const onText = (key: "name" | "slug") => (event: ChangeEvent<HTMLInputElement>) =>
    setState((prev) => ({ ...prev, [key]: event.target.value }));

  const onSortOrder = (event: ChangeEvent<HTMLInputElement>) =>
    setState((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }));

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<number, AdminBootstrap["subcategories"]>();
    for (const subcategory of bootstrap.subcategories) {
      const list = map.get(subcategory.categoryId) || [];
      list.push(subcategory);
      map.set(subcategory.categoryId, list);
    }
    return map;
  }, [bootstrap.subcategories]);

  const attributeById = useMemo(
    () => new Map(bootstrap.attributes.map((attribute) => [attribute.id, attribute])),
    [bootstrap.attributes],
  );

  const selectedFilterAttributes = useMemo(
    () =>
      state.filterAttributeIds
        .map((id) => attributeById.get(id))
        .filter((attribute): attribute is NonNullable<typeof attribute> => Boolean(attribute)),
    [state.filterAttributeIds, attributeById],
  );

  const availableFilterAttributes = useMemo(
    () => bootstrap.attributes.filter((attribute) => !state.filterAttributeIds.includes(attribute.id)),
    [bootstrap.attributes, state.filterAttributeIds],
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!state.name.trim()) {
      onError("Название витрины не может быть пустым");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/catalog-pages/${page.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim(),
          slug: state.slug.trim() || undefined,
          sortOrder: state.sortOrder,
          isActive: state.isActive,
          isDefault: page.isDefault,
          categoryIds: state.categoryIds,
          subcategoryIds: state.subcategoryIds,
          filterAttributeIds: state.filterAttributeIds,
          seoTitle: state.seoTitle.trim() || null,
          seoDescription: state.seoDescription.trim() || null,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      onSaved(`Витрина «${state.name.trim()}» сохранена.`);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (removing || page.isDefault) return;
    const ok = window.confirm(
      `Удалить витрину «${page.name}»? Эта кнопка пропадёт из каталога.`,
    );
    if (!ok) return;
    setRemoving(true);
    try {
      const response = await fetch(`/api/admin/catalog-pages/${page.id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text());
      }
      onDeleted(`Витрина «${page.name}» удалена.`);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AdminCard className="p-4">
    <form onSubmit={save} className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Название
            <input
              value={state.name}
              onChange={onText("name")}
              className="w-64 rounded border border-zinc-200 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Slug
            <input
              value={state.slug}
              onChange={onText("slug")}
              disabled={page.isDefault}
              className="w-56 rounded border border-zinc-200 px-3 py-1.5 text-sm font-mono disabled:bg-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Порядок
            <input
              type="number"
              value={state.sortOrder}
              onChange={onSortOrder}
              className="w-20 rounded border border-zinc-200 px-3 py-1.5 text-sm"
            />
          </label>
          {page.isDefault ? (
            <span className="ml-1 rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
              Дефолтная — slug не меняется и не удаляется
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            SEO title
            <input
              value={state.seoTitle}
              onChange={(event) => setState((prev) => ({ ...prev, seoTitle: event.target.value }))}
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
              placeholder="Заголовок в поиске (опционально)"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            SEO description
            <textarea
              value={state.seoDescription}
              onChange={(event) =>
                setState((prev) => ({ ...prev, seoDescription: event.target.value }))
              }
              className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
              rows={3}
              placeholder="Описание в сниппете Google/Яндекс (опционально)"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {saving ? "Сохраняем…" : dirty ? "Сохранить" : "Без изменений"}
          </button>
          <button
            type="button"
            onClick={() => setState(initial)}
            disabled={saving || !dirty}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Сбросить
          </button>
          {page.isDefault ? null : (
            <button
              type="button"
              onClick={remove}
              disabled={removing || saving}
              className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removing ? "Удаляем…" : "Удалить"}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <fieldset className="space-y-2 rounded border border-zinc-200 p-3">
          <legend className="px-1 text-xs uppercase text-zinc-500">Корневые категории</legend>
          {bootstrap.categories.length === 0 ? (
            <p className="text-xs text-zinc-500">Категорий пока нет. Создайте их в админке.</p>
          ) : (
            bootstrap.categories.map((category) => (
              <label key={category.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={state.categoryIds.includes(category.id)}
                  onChange={onCheckbox("categoryIds", category.id)}
                />
                <span>
                  {category.name}{" "}
                  <code className="text-xs text-zinc-500">({category.slug})</code>
                </span>
              </label>
            ))
          )}
          <p className="text-[11px] text-zinc-500">
            Если отмечена корневая категория — витрина выводит все товары из неё и её подкатегорий.
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded border border-zinc-200 p-3">
          <legend className="px-1 text-xs uppercase text-zinc-500">Подкатегории</legend>
          {bootstrap.categories.length === 0 ? (
            <p className="text-xs text-zinc-500">Сначала создайте категории и подкатегории.</p>
          ) : (
            bootstrap.categories.map((category) => {
              const subs = subcategoriesByCategory.get(category.id) || [];
              if (subs.length === 0) return null;
              return (
                <div key={category.id} className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-700">{category.name}</p>
                  {subs.map((sub) => (
                    <label key={sub.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={state.subcategoryIds.includes(sub.id)}
                        onChange={onCheckbox("subcategoryIds", sub.id)}
                      />
                      <span>
                        {sub.name}
                        {sub.slug ? (
                          <code className="ml-1 text-xs text-zinc-500">({sub.slug})</code>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })
          )}
          <p className="text-[11px] text-zinc-500">
            Если выбрать только подкатегории — витрина покажет именно их (без сестринских).
            Если выбраны и корни, и подкатегории — товары собираются по OR.
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded border border-zinc-200 p-3">
          <legend className="px-1 text-xs uppercase text-zinc-500">Фильтры на витрине</legend>
          {bootstrap.attributes.length === 0 ? (
            <p className="text-xs text-zinc-500">Атрибутов пока нет.</p>
          ) : (
            <>
              {selectedFilterAttributes.length > 0 ? (
                <ol className="space-y-1">
                  {selectedFilterAttributes.map((attribute, index) => (
                    <li
                      key={attribute.id}
                      className="flex items-center gap-2 rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-sm"
                    >
                      <span className="w-5 shrink-0 text-center text-xs text-zinc-400">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        {attribute.name}{" "}
                        <code className="text-xs text-zinc-500">({attribute.code})</code>
                        {attribute.isVariantAxis ? (
                          <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] text-violet-700">
                            ось варианта
                          </span>
                        ) : null}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              filterAttributeIds: moveId(prev.filterAttributeIds, attribute.id, -1),
                            }))
                          }
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Выше"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === selectedFilterAttributes.length - 1}
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              filterAttributeIds: moveId(prev.filterAttributeIds, attribute.id, 1),
                            }))
                          }
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Ниже"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={onCheckbox("filterAttributeIds", attribute.id)}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100"
                          title="Убрать"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-zinc-500">
                  Фильтры не выбраны — на каталоге показываются все доступные, в порядке из
                  раздела «Атрибуты».
                </p>
              )}
              {availableFilterAttributes.length > 0 ? (
                <div className="space-y-1 border-t border-zinc-100 pt-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Добавить фильтр
                  </p>
                  {availableFilterAttributes.map((attribute) => (
                    <label key={attribute.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={false}
                        onChange={onCheckbox("filterAttributeIds", attribute.id)}
                      />
                      <span>
                        {attribute.name}{" "}
                        <code className="text-xs text-zinc-500">({attribute.code})</code>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          )}
          <p className="text-[11px] text-zinc-500">
            Порядок в списке — порядок блоков фильтров в каталоге. Если выбрано хотя бы одно
            поле — на витрине видны только они.
          </p>
        </fieldset>
      </div>

      {page.isDefault ? (
        <p className="text-xs text-zinc-500">
          У дефолтной витрины (<code>{page.slug}</code>) принято оставлять все категории
          пустыми — она выводит весь каталог. Slug менять не нужно.
        </p>
      ) : null}
    </form>
    </AdminCard>
  );
}
