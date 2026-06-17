"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminBootstrap, AdminCatalogPage, normalizeAdminBootstrap } from "@/lib/client/normalizers";

type AttributeDef = {
  id: number;
  code: string;
  name: string;
  type: string;
  options?: unknown[];
};

type LabelRow = {
  id: number;
  catalogPageId: number;
  title: string;
  imageUrl: string | null;
  sortOrder: number;
  filters: Array<{ code: string; value: string }>;
};

const emptyFilterRow = (): { code: string; value: string } => ({ code: "", value: "" });

export default function AdminCatalogLabelsPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [selectedPageId, setSelectedPageId] = useState<number>(0);

  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [newFilters, setNewFilters] = useState<Array<{ code: string; value: string }>>([emptyFilterRow()]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    imageUrl: string;
    sortOrder: number;
    filters: Array<{ code: string; value: string }>;
  } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const selectedPage: AdminCatalogPage | undefined = useMemo(
    () => bootstrap.catalogPages.find((p) => p.id === selectedPageId),
    [bootstrap.catalogPages, selectedPageId],
  );

  const attrByCode = useMemo(() => {
    const map = new Map<string, AttributeDef>();
    attributeDefs.forEach((a) => map.set(a.code, a));
    return map;
  }, [attributeDefs]);

  const reloadAttributes = async () => {
    const response = await fetch("/api/admin/attributes");
    if (!response.ok) throw new Error("Не удалось загрузить атрибуты");
    const json = (await response.json()) as AttributeDef[];
    setAttributeDefs(Array.isArray(json) ? json : []);
  };

  const reloadLabels = async (pageId: number) => {
    if (!pageId) {
      setLabels([]);
      return;
    }
    setLabelsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/catalog-page-labels?catalogPageId=${pageId}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as LabelRow[];
      setLabels(Array.isArray(json) ? json : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки ярлыков");
      setLabels([]);
    } finally {
      setLabelsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const br = await fetch("/api/admin/bootstrap");
        if (!br.ok) throw new Error("Не удалось загрузить bootstrap");
        setBootstrap(normalizeAdminBootstrap(await br.json()));
        await reloadAttributes();
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

  useEffect(() => {
    if (bootstrap.catalogPages.length && !selectedPageId) {
      const first = bootstrap.catalogPages[0];
      if (first) setSelectedPageId(first.id);
    }
  }, [bootstrap.catalogPages, selectedPageId]);

  useEffect(() => {
    void reloadLabels(selectedPageId);
  }, [selectedPageId]);

  const allowedFilterAttrs = selectedPage?.filterAttributes || [];

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating || !selectedPageId) return;
    const filters = newFilters
      .map((row) => ({ code: row.code.trim(), value: row.value.trim() }))
      .filter((row) => row.code && row.value);
    if (!newTitle.trim()) {
      setError("Введите название ярлыка");
      return;
    }
    if (filters.length === 0) {
      setError("Добавьте хотя бы одну пару атрибут — значение");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/catalog-page-labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogPageId: selectedPageId,
          title: newTitle.trim(),
          imageUrl: newImageUrl.trim() || undefined,
          sortOrder: newSortOrder,
          filters,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка создания");
      setNewTitle("");
      setNewImageUrl("");
      setNewSortOrder(0);
      setNewFilters([emptyFilterRow()]);
      setNotice("Ярлык создан");
      await reloadLabels(selectedPageId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row: LabelRow) => {
    setEditingId(row.id);
    setEditDraft({
      title: row.title,
      imageUrl: row.imageUrl || "",
      sortOrder: row.sortOrder,
      filters: row.filters.length ? row.filters.map((f) => ({ ...f })) : [emptyFilterRow()],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: number) => {
    if (!editDraft || savingId) return;
    const filters = editDraft.filters
      .map((row) => ({ code: row.code.trim(), value: row.value.trim() }))
      .filter((row) => row.code && row.value);
    if (!editDraft.title.trim()) {
      setError("Название не может быть пустым");
      return;
    }
    if (filters.length === 0) {
      setError("Нужна хотя бы одна пара атрибут — значение");
      return;
    }
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/catalog-page-labels/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title.trim(),
          imageUrl: editDraft.imageUrl.trim() || null,
          sortOrder: editDraft.sortOrder,
          filters,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      setNotice("Ярлык сохранён");
      cancelEdit();
      await reloadLabels(selectedPageId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  };

  const removeLabel = async (row: LabelRow) => {
    if (!window.confirm(`Удалить ярлык «${row.title}»?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/catalog-page-labels/${row.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice("Ярлык удалён");
      if (editingId === row.id) cancelEdit();
      await reloadLabels(selectedPageId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const renderValueInput = (
    code: string,
    value: string,
    onChange: (value: string) => void,
    idPrefix: string,
  ) => {
    const def = code ? attrByCode.get(code) : undefined;
    const opts = Array.isArray(def?.options) ? def!.options!.map((o) => String(o)) : [];
    if (opts.length > 0 && def?.type !== "number") {
      return (
        <select
          id={`${idPrefix}-value`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-[140px] flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
        >
          <option value="">—</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        id={`${idPrefix}-value`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Значение"
        className="min-w-[140px] flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
      />
    );
  };

  return (
    <AdminPage
      title="Ярлыки витрин"
      description="Быстрые фильтры над выдачей на странице каталога: заголовок, картинка и один или несколько атрибутов витрины (как в её фильтрах)."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/catalog-pages">Витрины каталога</Link>
        </Button>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      {loading ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : (
        <>
          <AdminCard className="p-4">
            <label className="flex max-w-md flex-col gap-1 text-xs text-zinc-600">
              Витрина
              <select
                value={selectedPageId}
                onChange={(e) => {
                  setSelectedPageId(Number(e.target.value));
                  setNotice("");
                  cancelEdit();
                }}
                className="rounded border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value={0}>Выберите витрину</option>
                {bootstrap.catalogPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name} ({page.slug})
                  </option>
                ))}
              </select>
            </label>
            {!allowedFilterAttrs.length && selectedPageId ? (
              <p className="mt-2 text-sm text-amber-800">
                У этой витрины не выбраны фильтры по атрибутам. Сначала настройте витрину на странице «Витрины
                каталога».
              </p>
            ) : null}
          </AdminCard>

          {selectedPageId ? (
            <>
              <AdminCard className="p-4">
              <form onSubmit={submitCreate} className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-800">Новый ярлык</h2>
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Название
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-56 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      placeholder="Например, С зеркалом"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    URL картинки
                    <input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-72 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      placeholder="https://…"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Порядок
                    <input
                      type="number"
                      value={newSortOrder}
                      onChange={(e) => setNewSortOrder(Number(e.target.value) || 0)}
                      className="w-24 rounded border border-zinc-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-600">Фильтры (все условия одновременно)</span>
                  {newFilters.map((row, index) => (
                    <div key={`nf-${index}`} className="flex flex-wrap items-center gap-2">
                      <select
                        value={row.code}
                        onChange={(e) => {
                          const code = e.target.value;
                          setNewFilters((prev) =>
                            prev.map((r, i) => (i === index ? { code, value: code !== row.code ? "" : r.value } : r)),
                          );
                        }}
                        className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      >
                        <option value="">Атрибут</option>
                        {allowedFilterAttrs.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.name} ({a.code})
                          </option>
                        ))}
                      </select>
                      {renderValueInput(row.code, row.value, (v) => {
                        setNewFilters((prev) => prev.map((r, i) => (i === index ? { ...r, value: v } : r)));
                      }, `new-${index}`)}
                      <button
                        type="button"
                        className="text-xs text-rose-600"
                        onClick={() =>
                          setNewFilters((prev) => (prev.length <= 1 ? [emptyFilterRow()] : prev.filter((_, i) => i !== index)))
                        }
                      >
                        Удалить строку
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-sm text-zinc-700 underline"
                    onClick={() => setNewFilters((prev) => [...prev, emptyFilterRow()])}
                  >
                    + условие
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={creating || !allowedFilterAttrs.length}
                  className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {creating ? "Создаём…" : "Создать ярлык"}
                </button>
              </form>
              </AdminCard>

              <AdminCard className="p-4">
                <h2 className="text-sm font-semibold text-zinc-800">Ярлыки витрины</h2>
                {labelsLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">Загрузка списка…</p>
                ) : labels.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">Пока нет ярлыков.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {labels.map((row) => (
                      <li key={row.id} className="rounded border border-zinc-200 p-3">
                        {editingId === row.id && editDraft ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-3">
                              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                                Название
                                <input
                                  value={editDraft.title}
                                  onChange={(e) => setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                                  className="w-56 rounded border px-2 py-1.5 text-sm"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                                URL картинки
                                <input
                                  value={editDraft.imageUrl}
                                  onChange={(e) => setEditDraft((d) => (d ? { ...d, imageUrl: e.target.value } : d))}
                                  className="w-72 rounded border px-2 py-1.5 text-sm"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                                Порядок
                                <input
                                  type="number"
                                  value={editDraft.sortOrder}
                                  onChange={(e) =>
                                    setEditDraft((d) =>
                                      d ? { ...d, sortOrder: Number(e.target.value) || 0 } : d,
                                    )
                                  }
                                  className="w-24 rounded border px-2 py-1.5 text-sm"
                                />
                              </label>
                            </div>
                            <div className="space-y-2">
                              {editDraft.filters.map((fr, index) => (
                                <div key={`ef-${row.id}-${index}`} className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={fr.code}
                                    onChange={(e) => {
                                      const code = e.target.value;
                                      setEditDraft((d) => {
                                        if (!d) return d;
                                        const next = d.filters.map((r, i) =>
                                          i === index ? { code, value: code !== r.code ? "" : r.value } : r,
                                        );
                                        return { ...d, filters: next };
                                      });
                                    }}
                                    className="rounded border px-2 py-1.5 text-sm"
                                  >
                                    <option value="">Атрибут</option>
                                    {allowedFilterAttrs.map((a) => (
                                      <option key={a.id} value={a.code}>
                                        {a.name}
                                      </option>
                                    ))}
                                  </select>
                                  {renderValueInput(fr.code, fr.value, (v) => {
                                    setEditDraft((d) => {
                                      if (!d) return d;
                                      const next = d.filters.map((r, i) => (i === index ? { ...r, value: v } : r));
                                      return { ...d, filters: next };
                                    });
                                  }, `edit-${row.id}-${index}`)}
                                  <button
                                    type="button"
                                    className="text-xs text-rose-600"
                                    onClick={() =>
                                      setEditDraft((d) => {
                                        if (!d) return d;
                                        const filters =
                                          d.filters.length <= 1 ? [emptyFilterRow()] : d.filters.filter((_, i) => i !== index);
                                        return { ...d, filters };
                                      })
                                    }
                                  >
                                    Удалить строку
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="text-sm text-zinc-700 underline"
                                onClick={() =>
                                  setEditDraft((d) =>
                                    d ? { ...d, filters: [...d.filters, emptyFilterRow()] } : d,
                                  )
                                }
                              >
                                + условие
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void saveEdit(row.id)}
                                disabled={savingId === row.id}
                                className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-60"
                              >
                                {savingId === row.id ? "Сохраняем…" : "Сохранить"}
                              </button>
                              <button type="button" onClick={cancelEdit} className="rounded border px-3 py-1.5 text-sm">
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex gap-3">
                              {row.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={row.imageUrl}
                                  alt=""
                                  className="h-16 w-16 shrink-0 rounded border bg-zinc-50 object-contain"
                                />
                              ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border bg-zinc-100 text-[10px] text-zinc-400">
                                  нет фото
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{row.title}</p>
                                <p className="text-xs text-zinc-500">sort: {row.sortOrder}</p>
                                <ul className="mt-1 font-mono text-xs text-zinc-600">
                                  {row.filters.map((f) => (
                                    <li key={`${f.code}-${f.value}`}>
                                      {f.code} = {f.value}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                className="rounded border px-2 py-1 text-xs hover:bg-zinc-50"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeLabel(row)}
                                className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
            </>
          ) : null}
        </>
      )}
    </AdminPage>
  );
}
