"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadAdminImages } from "@/features/admin/admin-image-upload";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { ArmaPhotoViewer } from "@/features/admin/arma-photos/arma-photo-viewer";
import {
  ArmaPhotoAdminGrid,
  movePhotoToListingPosition,
  reorderPhotosList,
} from "@/features/admin/arma-photos/arma-photo-admin-grid";
import { ArmaPhotoTagManager, reorderById } from "@/features/admin/arma-photos/arma-photo-tag-manager";
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
  const [reordering, setReordering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const galleryItems = selectedTagIds.length > 0 ? filteredItems : items;
  const reorderDisabled = selectedTagIds.length > 0;

  const activePhoto =
    activeIndex == null ? null : galleryItems[activeIndex] || null;

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

  const handleRenameCategory = async (id: number, name: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/arma-photos/categories/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice("Категория переименована");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось переименовать категорию");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleRenameTag = async (id: number, name: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/arma-photos/tags/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice("Тег переименован");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось переименовать тег");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleReorderCategories = async (dragId: number, targetId: number) => {
    const nextCategories = reorderById(categories, dragId, targetId);
    if (nextCategories === categories) return;
    setCategories(nextCategories);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/arma-photos/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderedIds: nextCategories.map((category) => category.id) }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        categories?: ArmaPhotoTagCategory[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить порядок категорий");
      if (Array.isArray(payload.categories)) setCategories(payload.categories);
      setNotice("Порядок категорий сохранён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить порядок категорий");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleReorderTags = async (categoryId: number, dragId: number, targetId: number) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    const nextTags = reorderById(category.tags, dragId, targetId);
    if (nextTags === category.tags) return;
    setCategories((current) =>
      current.map((item) => (item.id === categoryId ? { ...item, tags: nextTags } : item)),
    );
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/arma-photos/tags", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId,
          orderedIds: nextTags.map((tag) => tag.id),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        categories?: ArmaPhotoTagCategory[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить порядок тегов");
      if (Array.isArray(payload.categories)) setCategories(payload.categories);
      setNotice("Порядок тегов сохранён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить порядок тегов");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const goPrev = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index - 1 + galleryItems.length) % galleryItems.length,
    );
  }, [galleryItems.length]);

  const goNext = useCallback(() => {
    setActiveIndex((index) =>
      index == null ? index : (index + 1) % galleryItems.length,
    );
  }, [galleryItems.length]);

  const applyGalleryPayload = (payload: {
    items?: ArmaPhoto[];
    categories?: ArmaPhotoTagCategory[];
  }) => {
    setItems(Array.isArray(payload.items) ? payload.items : []);
    if (Array.isArray(payload.categories)) {
      setCategories(payload.categories);
    }
  };

  const persistPhotoOrder = async (nextItems: ArmaPhoto[], successNotice: string) => {
    setItems(nextItems);
    setReordering(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/arma-photos/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderedIds: nextItems.map((photo) => photo.id) }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        items?: ArmaPhoto[];
        categories?: ArmaPhotoTagCategory[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить порядок");
      applyGalleryPayload(payload);
      setNotice(successNotice);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить порядок");
      await reload();
    } finally {
      setReordering(false);
    }
  };

  const handleReorderPhotos = async (dragId: string, targetId: string) => {
    const nextItems = reorderPhotosList(items, dragId, targetId);
    if (nextItems === items) return;
    await persistPhotoOrder(nextItems, "Порядок фото сохранён");
  };

  const handleChangeListingPosition = async (photoId: string, position: number) => {
    const nextItems = movePhotoToListingPosition(items, photoId, position);
    if (nextItems === items) return;
    const openId = photoId;
    await persistPhotoOrder(nextItems, "Место в выдаче сохранено");
    setActiveIndex((current) => {
      if (current == null) return current;
      const nextGallery =
        selectedTagIds.length > 0
          ? nextItems.filter((photo) => photoMatchesSelectedTags(photo.tagIds, selectedTagIds, tags))
          : nextItems;
      const nextIndex = nextGallery.findIndex((photo) => photo.id === openId);
      return nextIndex >= 0 ? nextIndex : current;
    });
  };

  const handleDeletePhoto = async (photo: ArmaPhoto) => {
    if (!window.confirm(`Удалить фото «${photo.name}»?`)) return;
    setDeletingPhotoId(photo.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/arma-photos/${encodeURIComponent(photo.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        items?: ArmaPhoto[];
        categories?: ArmaPhotoTagCategory[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Не удалось удалить фото");
      applyGalleryPayload(payload);
      setActiveIndex(null);
      setNotice("Фото удалено");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить фото");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      await uploadAdminImages({
        url: "/api/admin/arma-photos",
        files,
      });
      await reload();
      setNotice(files.length === 1 ? "Фото загружено" : `Загружено фото: ${files.length}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  };

  const uploadBusy = uploading || saving || reordering || deletingPhotoId != null;

  const uploadButton = (
    <>
      <button
        type="button"
        disabled={uploadBusy || loading}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-sm text-admin-text hover:bg-admin-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Загрузка…" : "Загрузить фото"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={uploadBusy || loading}
        onChange={(event) => {
          void handleUploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </>
  );

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
    <AdminPage
      title="Арма фото"
      description="Фото заказных дверей фабрики Арма."
      actions={uploadButton}
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}

      <ArmaPhotoTagManager
        categories={categories}
        saving={saving}
        categoryName={categoryName}
        tagName={tagName}
        tagCategoryId={tagCategoryId}
        onCategoryNameChange={setCategoryName}
        onTagNameChange={setTagName}
        onTagCategoryIdChange={setTagCategoryId}
        onCreateCategory={(event) => void handleCreateCategory(event)}
        onCreateTag={(event) => void handleCreateTag(event)}
        onRenameCategory={handleRenameCategory}
        onRenameTag={handleRenameTag}
        onDeleteCategory={(id) => void handleDeleteCategory(id)}
        onDeleteTag={(id) => void handleDeleteTag(id)}
        onReorderCategories={(dragId, targetId) => void handleReorderCategories(dragId, targetId)}
        onReorderTags={(categoryId, dragId, targetId) =>
          void handleReorderTags(categoryId, dragId, targetId)
        }
      />

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
            description="Загрузите фото с компьютера или положите файлы в public/uploads/arma-photos."
          />
        ) : filteredItems.length === 0 ? (
          <AdminEmptyState
            title="Нет фото по выбранным тегам"
            description="Снимите часть фильтров или отметьте теги на фото."
          />
        ) : (
          <ArmaPhotoAdminGrid
            photos={galleryItems}
            disabled={uploadBusy}
            reorderDisabled={reorderDisabled}
            onOpen={setActiveIndex}
            onReorder={(dragId, targetId) => void handleReorderPhotos(dragId, targetId)}
            onDelete={(photo) => void handleDeletePhoto(photo)}
          />
        )}
      </AdminCard>

      {activePhoto ? (
        <ArmaPhotoViewer
          photo={activePhoto}
          categories={categories}
          listingPosition={Math.max(1, items.findIndex((photo) => photo.id === activePhoto.id) + 1)}
          listingTotal={items.length}
          saving={saving}
          savingTagId={savingTagId}
          savingPosition={reordering}
          onToggleTag={(tagId, assigned) => void handleTogglePhotoTag(tagId, assigned)}
          onCreateCategory={(name) => handleCreateCategory(undefined, name)}
          onCreateTag={(categoryId, name) =>
            handleCreateTag(undefined, { categoryId, name, assignToPhoto: true })
          }
          onChangeListingPosition={(position) =>
            void handleChangeListingPosition(activePhoto.id, position)
          }
          onClose={() => setActiveIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : null}
    </AdminPage>
  );
}
