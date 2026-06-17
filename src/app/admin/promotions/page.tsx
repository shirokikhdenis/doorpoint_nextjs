"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminBootstrap, normalizeAdminBootstrap } from "@/lib/client/normalizers";

type PromotionRow = {
  id: number;
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
  catalogPageSlug: string;
  filterManufacturer: string;
  filterCollection: string;
  sortOrder: number;
  isActive: boolean;
  href: string;
};

type ProductSearchRow = {
  id: number;
  name: string;
  sku: string;
  primaryImageUrl: string;
};

function ProductImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({ search: q, limit: "8", page: "1" });
          const response = await fetch(`/api/admin/products-table?${params.toString()}`);
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as { rows?: ProductSearchRow[] };
          setResults(
            Array.isArray(json.rows)
              ? json.rows.filter((row) => row.primaryImageUrl)
              : [],
          );
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      void run();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск товара по названию или артикулу…"
        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
      />
      {searching ? <p className="text-xs text-zinc-500">Поиск…</p> : null}
      {results.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-zinc-100 bg-zinc-50 p-1">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white"
                onClick={() => {
                  onChange(row.primaryImageUrl);
                  setSearch("");
                  setResults([]);
                }}
              >
                {row.primaryImageUrl ? (
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-zinc-200 bg-white">
                    <Image src={row.primaryImageUrl} alt="" fill className="object-cover" sizes="40px" />
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900">{row.name}</span>
                  <span className="text-xs text-zinc-500">{row.sku}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value ? (
        <div className="flex items-start gap-3">
          <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
            <Image src={value} alt="" fill className="object-cover" sizes="112px" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-xs text-zinc-500">{value}</p>
            <button
              type="button"
              className="text-xs text-red-700 hover:underline"
              onClick={() => onChange("")}
            >
              Убрать фото
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AttributeFilterSelect({
  label,
  attrCode,
  value,
  onChange,
}: {
  label: string;
  attrCode: string | null;
  value: string;
  onChange: (value: string) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attrCode) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/admin/product-attribute-values?code=${encodeURIComponent(attrCode)}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((values) => {
        if (!cancelled) {
          setOptions(Array.isArray(values) ? values.map((item) => String(item)).filter(Boolean) : []);
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attrCode]);

  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!attrCode || loading}
        className="rounded border border-zinc-200 px-2 py-1.5 text-sm disabled:bg-zinc-50"
      >
        <option value="">{attrCode ? "Любой" : "Атрибут не найден"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminPromotionsPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [banners, setBanners] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newCatalogPageSlug, setNewCatalogPageSlug] = useState("all");
  const [newFilterManufacturer, setNewFilterManufacturer] = useState("");
  const [newFilterCollection, setNewFilterCollection] = useState("");
  const [newBackgroundImageUrl, setNewBackgroundImageUrl] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    subtitle: string;
    catalogPageSlug: string;
    filterManufacturer: string;
    filterCollection: string;
    backgroundImageUrl: string;
    isActive: boolean;
  } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const catalogPageOptions = useMemo(() => {
    const pages = bootstrap.catalogPages
      .filter((page) => page.slug !== "all")
      .map((page) => ({
        slug: page.slug,
        name: page.name,
      }));
    return [{ slug: "all", name: "Весь каталог" }, ...pages];
  }, [bootstrap.catalogPages]);

  const collectionAttribute = useMemo(
    () =>
      bootstrap.attributes.find(
        (attribute) =>
          attribute.code === "collection" || attribute.name.toLowerCase().includes("коллекц"),
      ) || null,
    [bootstrap.attributes],
  );

  const reloadBanners = async () => {
    const response = await fetch("/api/admin/promotions");
    if (!response.ok) throw new Error("Не удалось загрузить акции");
    const json = (await response.json()) as PromotionRow[];
    setBanners(Array.isArray(json) ? json : []);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [br, promo] = await Promise.all([
          fetch("/api/admin/bootstrap"),
          fetch("/api/admin/promotions"),
        ]);
        if (!br.ok) throw new Error("Не удалось загрузить bootstrap");
        if (!promo.ok) throw new Error("Не удалось загрузить акции");
        if (!cancelled) {
          setBootstrap(normalizeAdminBootstrap(await br.json()));
          const json = (await promo.json()) as PromotionRow[];
          setBanners(Array.isArray(json) ? json : []);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Ошибка");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    if (!newTitle.trim()) {
      setError("Введите заголовок");
      return;
    }
    if (!newBackgroundImageUrl.trim()) {
      setError("Выберите фото для фона");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          subtitle: newSubtitle.trim(),
          catalogPageSlug: newCatalogPageSlug,
          filterManufacturer: newFilterManufacturer.trim() || undefined,
          filterCollection: newFilterCollection.trim() || undefined,
          backgroundImageUrl: newBackgroundImageUrl.trim(),
          isActive: newIsActive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка создания");
      setNewTitle("");
      setNewSubtitle("");
      setNewFilterManufacturer("");
      setNewFilterCollection("");
      setNewBackgroundImageUrl("");
      setNewIsActive(true);
      setNotice("Акция создана");
      await reloadBanners();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row: PromotionRow) => {
    setEditingId(row.id);
    setEditDraft({
      title: row.title,
      subtitle: row.subtitle,
      catalogPageSlug: row.catalogPageSlug,
      filterManufacturer: row.filterManufacturer || "",
      filterCollection: row.filterCollection || "",
      backgroundImageUrl: row.backgroundImageUrl,
      isActive: row.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: number) => {
    if (!editDraft || savingId) return;
    if (!editDraft.title.trim()) {
      setError("Заголовок не может быть пустым");
      return;
    }
    if (!editDraft.backgroundImageUrl.trim()) {
      setError("Укажите фото для фона");
      return;
    }
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/promotions/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title.trim(),
          subtitle: editDraft.subtitle.trim(),
          catalogPageSlug: editDraft.catalogPageSlug,
          filterManufacturer: editDraft.filterManufacturer.trim() || null,
          filterCollection: editDraft.filterCollection.trim() || null,
          backgroundImageUrl: editDraft.backgroundImageUrl.trim(),
          isActive: editDraft.isActive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      setNotice("Акция сохранена");
      cancelEdit();
      await reloadBanners();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  };

  const removeBanner = async (row: PromotionRow) => {
    if (!window.confirm(`Удалить акцию «${row.title}»?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/promotions/${row.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice("Акция удалена");
      if (editingId === row.id) cancelEdit();
      await reloadBanners();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length || reordering) return;
    const next = [...banners];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setReordering(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promotions/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((b) => b.id) }),
      });
      if (!response.ok) throw new Error("Не удалось изменить порядок");
      const json = (await response.json()) as PromotionRow[];
      setBanners(Array.isArray(json) ? json : next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setReordering(false);
    }
  };

  return (
    <AdminPage
      className="max-w-[var(--admin-content-max-width-narrow)]"
      title="Акции на главной"
      description="Баннеры в слайдере на главной. Ссылка ведёт в каталог с фильтром акционных товаров и, при необходимости, по производителю и коллекции."
      actions={
        <Link
          href="/"
          className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          На главную →
        </Link>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      {loading ? (
        <AdminCard>
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : (
        <>
          <AdminCard title="Новая акция">
            <form onSubmit={submitCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Заголовок
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                  placeholder="Скидки на межкомнатные двери"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Подзаголовок
                <input
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                  placeholder="До конца месяца"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Витрина каталога
                <select
                  value={newCatalogPageSlug}
                  onChange={(e) => setNewCatalogPageSlug(e.target.value)}
                  className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                >
                  {catalogPageOptions.map((page) => (
                    <option key={page.slug} value={page.slug}>
                      {page.name} ({page.slug})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-5 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                Показывать на главной
              </label>
              <AttributeFilterSelect
                label="Производитель"
                attrCode="manufacturer"
                value={newFilterManufacturer}
                onChange={setNewFilterManufacturer}
              />
              <AttributeFilterSelect
                label="Коллекция"
                attrCode={collectionAttribute?.code || null}
                value={newFilterCollection}
                onChange={setNewFilterCollection}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-zinc-600">Фото на фоне (из каталога товаров)</p>
              <ProductImagePicker value={newBackgroundImageUrl} onChange={setNewBackgroundImageUrl} />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {creating ? "Создание…" : "Добавить акцию"}
            </button>
            </form>
          </AdminCard>

          <AdminCard title={`Список акций (${banners.length})`}>
            {banners.length === 0 ? (
              <p className="text-sm text-zinc-500">Пока нет баннеров — на главной показывается заглушка.</p>
            ) : (
              <ul className="space-y-3">
                {banners.map((row, index) => {
                  const isEditing = editingId === row.id && editDraft;
                  return (
                    <li key={row.id} className="rounded border border-zinc-200 p-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs text-zinc-600">
                              Заголовок
                              <input
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                                }
                                className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-zinc-600">
                              Подзаголовок
                              <input
                                value={editDraft.subtitle}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, subtitle: e.target.value } : d))
                                }
                                className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-zinc-600">
                              Витрина
                              <select
                                value={editDraft.catalogPageSlug}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, catalogPageSlug: e.target.value } : d,
                                  )
                                }
                                className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                              >
                                {catalogPageOptions.map((page) => (
                                  <option key={page.slug} value={page.slug}>
                                    {page.name} ({page.slug})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex items-center gap-2 pt-5 text-sm">
                              <input
                                type="checkbox"
                                checked={editDraft.isActive}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, isActive: e.target.checked } : d))
                                }
                                className="h-4 w-4"
                              />
                              Активна
                            </label>
                            <AttributeFilterSelect
                              label="Производитель"
                              attrCode="manufacturer"
                              value={editDraft.filterManufacturer}
                              onChange={(value) =>
                                setEditDraft((d) => (d ? { ...d, filterManufacturer: value } : d))
                              }
                            />
                            <AttributeFilterSelect
                              label="Коллекция"
                              attrCode={collectionAttribute?.code || null}
                              value={editDraft.filterCollection}
                              onChange={(value) =>
                                setEditDraft((d) => (d ? { ...d, filterCollection: value } : d))
                              }
                            />
                          </div>
                          <ProductImagePicker
                            value={editDraft.backgroundImageUrl}
                            onChange={(url) =>
                              setEditDraft((d) => (d ? { ...d, backgroundImageUrl: url } : d))
                            }
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit(row.id)}
                              disabled={savingId === row.id}
                              className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start gap-3">
                          {row.backgroundImageUrl ? (
                            <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-zinc-200">
                              <Image
                                src={row.backgroundImageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            </span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-zinc-900">{row.title}</p>
                              {!row.isActive ? (
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                                  скрыта
                                </span>
                              ) : null}
                            </div>
                            {row.subtitle ? (
                              <p className="text-sm text-zinc-600">{row.subtitle}</p>
                            ) : null}
                            <p className="mt-1 text-xs text-zinc-500">
                              Витрина: {row.catalogPageSlug}
                              {row.filterManufacturer ? ` · Производитель: ${row.filterManufacturer}` : ""}
                              {row.filterCollection ? ` · Коллекция: ${row.filterCollection}` : ""}
                              {" · "}
                              <a href={row.href} className="text-brand hover:underline">
                                {row.href}
                              </a>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0 || reordering}
                              onClick={() => void moveBanner(index, -1)}
                              className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
                              aria-label="Выше"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === banners.length - 1 || reordering}
                              onClick={() => void moveBanner(index, 1)}
                              className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
                              aria-label="Ниже"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeBanner(row)}
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </>
      )}
    </AdminPage>
  );
}
