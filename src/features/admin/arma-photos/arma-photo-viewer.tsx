"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ArmaPhoto, ArmaPhotoTagCategory } from "./types";

type ArmaPhotoViewerProps = {
  photo: ArmaPhoto;
  categories: ArmaPhotoTagCategory[];
  saving: boolean;
  savingTagId: number | null;
  onToggleTag: (tagId: number, assigned: boolean) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onCreateTag: (categoryId: number, name: string) => Promise<void>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function ArmaPhotoViewer({
  photo,
  categories,
  saving,
  savingTagId,
  onToggleTag,
  onCreateCategory,
  onCreateTag,
  onClose,
  onPrev,
  onNext,
}: ArmaPhotoViewerProps) {
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagCategoryId, setTagCategoryId] = useState(() =>
    categories[0] ? String(categories[0].id) : "",
  );

  useEffect(() => {
    if (!tagCategoryId && categories[0]) {
      setTagCategoryId(String(categories[0].id));
    }
    if (tagCategoryId && !categories.some((category) => String(category.id) === tagCategoryId)) {
      setTagCategoryId(categories[0] ? String(categories[0].id) : "");
    }
  }, [categories, tagCategoryId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (event.key === "Escape") {
        if (typing) return;
        onClose();
      }
      if (typing) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, onNext, onPrev]);

  const assigned = new Set(photo.tagIds);

  const handleCreateCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    await onCreateCategory(name);
    setCategoryName("");
  };

  const handleCreateTag = async (event: FormEvent) => {
    event.preventDefault();
    const name = tagName.trim();
    const categoryId = Number(tagCategoryId);
    if (!name || !Number.isInteger(categoryId) || categoryId <= 0) return;
    await onCreateTag(categoryId, name);
    setTagName("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Фото Арма"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full overflow-hidden bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex h-full min-h-0 min-w-0 flex-1 items-center justify-center bg-black">
          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
            aria-label="Предыдущее фото"
            onClick={onPrev}
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imageUrl || photo.previewUrl}
            alt="Фото Арма"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
            aria-label="Следующее фото"
            onClick={onNext}
          >
            ›
          </button>
        </div>

        <aside className="flex w-[min(100%,22rem)] shrink-0 flex-col border-l border-zinc-800 bg-admin-surface text-admin-text">
          <div className="flex items-center justify-between gap-2 border-b border-admin-border px-4 py-3">
            <p className="text-sm font-medium">Теги</p>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded text-lg text-admin-text-muted hover:bg-admin-surface-muted"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {categories.length === 0 ? (
              <p className="text-sm text-admin-text-muted">Пока нет категорий — добавьте ниже.</p>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <section key={category.id}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-admin-text-muted">
                      {category.name}
                    </h3>
                    {category.tags.length === 0 ? (
                      <p className="text-xs text-admin-text-muted">Нет тегов</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {category.tags.map((tag) => {
                          const checked = assigned.has(tag.id);
                          return (
                            <li key={tag.id}>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[var(--admin-focus-ring)]"
                                  checked={checked}
                                  disabled={savingTagId === tag.id}
                                  onChange={() => onToggleTag(tag.id, !checked)}
                                />
                                <span>{tag.name}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-admin-border px-4 py-3">
            <form className="space-y-2" onSubmit={(event) => void handleCreateCategory(event)}>
              <p className="text-xs font-medium text-admin-text-secondary">Новая категория</p>
              <div className="flex gap-2">
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Цвет, Остекление…"
                  className="h-9 min-w-0 flex-1 border border-admin-input-border bg-admin-input-bg px-2 text-sm"
                />
                <Button type="submit" size="sm" disabled={saving || !categoryName.trim()}>
                  Добавить
                </Button>
              </div>
            </form>
            <form className="space-y-2" onSubmit={(event) => void handleCreateTag(event)}>
              <p className="text-xs font-medium text-admin-text-secondary">Новый тег</p>
              <select
                value={tagCategoryId}
                onChange={(event) => setTagCategoryId(event.target.value)}
                className="h-9 w-full border border-admin-input-border bg-admin-input-bg px-2 text-sm"
              >
                {categories.length === 0 ? <option value="">Сначала категория</option> : null}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={tagName}
                  onChange={(event) => setTagName(event.target.value)}
                  placeholder="черный, двухстворчатая…"
                  className="h-9 min-w-0 flex-1 border border-admin-input-border bg-admin-input-bg px-2 text-sm"
                />
                <Button type="submit" size="sm" disabled={saving || !tagName.trim() || !tagCategoryId}>
                  Добавить
                </Button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
