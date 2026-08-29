"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { ArmaPhotoViewer } from "@/features/admin/arma-photos/arma-photo-viewer";
import {
  flattenTags,
  photoMatchesSelectedTags,
  type ArmaPhoto,
  type ArmaPhotoTagCategory,
} from "@/features/admin/arma-photos/types";

const readError = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return payload.message || `Ошибка (${response.status})`;
};

export default function AdminArmaPhotosPage() {
  const [items, setItems] = useState<ArmaPhoto[]>([]);
  const [categories, setCategories] = useState<ArmaPhotoTagCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagCategoryId, setTagCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingTagId, setSavingTagId] = useState<number | null>(null);

  const tags = useMemo(() => flattenTags(categories), [categories]);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/arma-photos");
    const payload = (await response.json().catch(() => ({}))) as {
      items?: ArmaPhoto[];
      categories?: ArmaPhotoTagCategory[];
      message?: string;
    };
    if (!response.ok) {
      throw new Error(payload.message || "Не удалось загрузить фото");
    }
    setItems(Array.isArray(payload.items) ? payload.items : []);
    const nextCategories = Array.isArray(payload.categories) ? payload.categories : [];
    setCategories(nextCategories);
    setTagCategoryId((current) => {
      if (current && nextCategories.some((category) => String(category.id) === current)) {
        return current;
      }
      return nextCategories[0] ? String(nextCategories[0].id) : "";
    });
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [reload]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const filteredItems = useMemo(
    () => items.filter((photo) => photoMatchesSelectedTags(photo.tagIds, selectedTagIds, tags)),
    [items, selectedTagIds, tags],
  );

  const activePhoto =
    activeIndex == null ? null : filteredItems[activeIndex] || null;

  const toggleFilterTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
    setActiveIndex(null);
  };

  const handleCreateCategory = async (event?: FormEvent, nameOverride?: string) => {
    event?.preventDefault();
    const name = (nameOverride ?? categoryName).trim();
    if (!name) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/arma-photos/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setCategoryName("");
      setNotice("Категория добавлена");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать категорию");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async (
    event?: FormEvent,
    overrides?: { categoryId: number; name: string; assignToPhoto?: boolean },
  ) => {
    event?.preventDefault();
    const name = (overrides?.name ?? tagName).trim();
    const categoryId = Number(overrides?.categoryId ?? tagCategoryId);
    if (!name || !Number.isInteger(categoryId) || categoryId <= 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/arma-photos/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, categoryId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { id?: number; message?: string };
      if (!response.ok) throw new Error(payload.message || "Не удалось создать тег");
      setTagName("");
      setNotice("Тег добавлен");
      await reload();
      if (overrides?.assignToPhoto && payload.id) {
        await handleTogglePhotoTag(payload.id, true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать тег");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/arma-photos/categories/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      setSelectedTagIds((current) => {
        const removed = new Set(
          categories.find((category) => category.id === id)?.tags.map((tag) => tag.id) ?? [],
        );
        return current.filter((tagId) => !removed.has(tagId));
      });
      setNotice("Категория удалена");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить категорию");
    }
  };

  const handleDeleteTag = async (id: number) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/arma-photos/tags/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response));
      setSelectedTagIds((current) => current.filter((tagId) => tagId !== id));
      setNotice("Тег удалён");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить тег");
    }
  };

  const goPrev = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index - 1 + filteredItems.length) % filteredItems.length,
    );
  }, [filteredItems.length]);

  const goNext = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index + 1) % filteredItems.length,
    );
  }, [filteredItems.length]);

  const handleTogglePhotoTag = async (tagId: number, assigned: boolean) => {
    if (!activePhoto) return;
    setSavingTagId(tagId);
    setError("");
    try {
      const response = await fetch("/api/admin/arma-photos/photo-tags", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId: activePhoto.id, tagId, assigned }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        tagIds?: number[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить тег");
      const nextTagIds = Array.isArray(payload.tagIds) ? payload.tagIds : activePhoto.tagIds;
      setItems((current) =>
        current.map((photo) =>
          photo.id === activePhoto.id ? { ...photo, tagIds: nextTagIds } : photo,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить тег");
    } finally {
      setSavingTagId(null);
    }
  };

  return (
    <AdminPage title="Арма фото" description="Фото заказных дверей фабрики Арма.">
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}

      <AdminCard title="Категории и теги">
        <div className="grid gap-4 lg:grid-cols-2">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void handleCreateCategory(event)}>
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-admin-text-secondary">Новая категория</span>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Цвет, Остекление…"
                className="flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 text-sm"
              />
            </label>
            <Button type="submit" disabled={saving || !categoryName.trim()}>
              Добавить категорию
            </Button>
          </form>

          <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void handleCreateTag(event)}>
            <label className="text-sm">
              <span className="mb-1 block text-admin-text-secondary">Категория</span>
              <select
                value={tagCategoryId}
                onChange={(event) => setTagCategoryId(event.target.value)}
                className="flex h-10 border border-admin-input-border bg-admin-input-bg px-3 text-sm"
              >
                {categories.length === 0 ? <option value="">Нет категорий</option> : null}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-admin-text-secondary">Новый тег</span>
              <input
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="черный, со стеклопакетом…"
                className="flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 text-sm"
              />
            </label>
            <Button type="submit" disabled={saving || !tagName.trim() || !tagCategoryId}>
              Добавить тег
            </Button>
          </form>
        </div>

        {categories.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {categories.map((category) => (
              <li key={category.id} className="rounded border border-admin-border px-3 py-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{category.name}</p>
                  <AdminConfirmButton
                    confirmMessage={`Удалить категорию «${category.name}» и все её теги?`}
                    onConfirm={() => handleDeleteCategory(category.id)}
                  >
                    Удалить
                  </AdminConfirmButton>
                </div>
                {category.tags.length === 0 ? (
                  <p className="text-xs text-admin-text-muted">Тегов пока нет</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full border border-admin-border bg-admin-surface-muted px-2 py-0.5 text-xs"
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="text-admin-text-muted hover:text-red-700"
                          aria-label={`Удалить тег ${tag.name}`}
                          onClick={() => void handleDeleteTag(tag.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminCard>

      <AdminCard
        title="Галерея"
        description={
          loading
            ? undefined
            : `${filteredItems.length} из ${items.length} фото`
        }
      >
        {categories.length > 0 ? (
          <div className="mb-4 space-y-3 border-b border-admin-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-admin-text-secondary">Фильтр по тегам</p>
              {selectedTagIds.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-admin-text-muted hover:underline"
                  onClick={() => setSelectedTagIds([])}
                >
                  Сбросить
                </button>
              ) : null}
            </div>
            {categories.map((category) => (
              <div key={category.id}>
                <p className="mb-1 text-xs uppercase tracking-wide text-admin-text-muted">{category.name}</p>
                <div className="flex flex-wrap gap-2">
                  {category.tags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={
                          active
                            ? "rounded-full border border-amber-700 bg-amber-100 px-2.5 py-1 text-xs text-amber-950"
                            : "rounded-full border border-admin-border px-2.5 py-1 text-xs text-admin-text-secondary hover:bg-admin-surface-muted"
                        }
                        onClick={() => toggleFilterTag(tag.id)}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-admin-text-muted">Загрузка фото…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState
            title="Фото не найдены"
            description="Локальная папка public/uploads/arma-photos пуста."
          />
        ) : filteredItems.length === 0 ? (
          <AdminEmptyState
            title="Нет фото по выбранным тегам"
            description="Снимите часть фильтров или отметьте теги на фото."
          />
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {filteredItems.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="group block w-full overflow-hidden rounded border border-admin-border bg-admin-surface-muted"
                  onClick={() => setActiveIndex(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl || photo.imageUrl}
                    alt="Фото Арма"
                    className="aspect-[3/4] w-full object-cover transition group-hover:opacity-90"
                    loading="lazy"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {activePhoto ? (
        <ArmaPhotoViewer
          photo={activePhoto}
          categories={categories}
          saving={saving}
          savingTagId={savingTagId}
          onToggleTag={(tagId, assigned) => void handleTogglePhotoTag(tagId, assigned)}
          onCreateCategory={(name) => handleCreateCategory(undefined, name)}
          onCreateTag={(categoryId, name) =>
            handleCreateTag(undefined, { categoryId, name, assignToPhoto: true })
          }
          onClose={() => setActiveIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : null}
    </AdminPage>
  );
}
