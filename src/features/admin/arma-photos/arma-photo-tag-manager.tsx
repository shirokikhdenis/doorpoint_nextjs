"use client";

import { FormEvent, useEffect, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import type { ArmaPhotoTag, ArmaPhotoTagCategory } from "@/features/admin/arma-photos/types";
import { cn } from "@/lib/utils";

const reorderById = <T extends { id: number }>(items: T[], dragId: number, targetId: number): T[] => {
  const from = items.findIndex((item) => item.id === dragId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

type ArmaPhotoTagManagerProps = {
  categories: ArmaPhotoTagCategory[];
  saving: boolean;
  categoryName: string;
  tagName: string;
  tagCategoryId: string;
  onCategoryNameChange: (value: string) => void;
  onTagNameChange: (value: string) => void;
  onTagCategoryIdChange: (value: string) => void;
  onCreateCategory: (event: FormEvent) => void;
  onCreateTag: (event: FormEvent) => void;
  onRenameCategory: (id: number, name: string) => Promise<void>;
  onRenameTag: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => void;
  onDeleteTag: (id: number) => void;
  onReorderCategories: (dragId: number, targetId: number) => void;
  onReorderTags: (categoryId: number, dragId: number, targetId: number) => void;
};

export { reorderById };

function DragHandle({ disabled, label }: { disabled?: boolean; label: string }) {
  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-6 shrink-0 select-none items-center justify-center text-admin-text-muted",
        disabled ? "opacity-40" : "cursor-grab active:cursor-grabbing",
      )}
    >
      ⋮⋮
    </span>
  );
}

function InlineNameInput({
  value,
  disabled,
  ariaLabel,
  className,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  onSave: (name: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    onSave(next);
  };

  return (
    <input
      aria-label={ariaLabel}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "h-8 border border-admin-input-border bg-admin-input-bg px-2 text-sm",
        className,
      )}
    />
  );
}

export function ArmaPhotoTagManager({
  categories,
  saving,
  categoryName,
  tagName,
  tagCategoryId,
  onCategoryNameChange,
  onTagNameChange,
  onTagCategoryIdChange,
  onCreateCategory,
  onCreateTag,
  onRenameCategory,
  onRenameTag,
  onDeleteCategory,
  onDeleteTag,
  onReorderCategories,
  onReorderTags,
}: ArmaPhotoTagManagerProps) {
  const [dragCategoryId, setDragCategoryId] = useState<number | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<number | null>(null);
  const [dragTag, setDragTag] = useState<{ categoryId: number; tagId: number } | null>(null);
  const [overTagId, setOverTagId] = useState<number | null>(null);

  const canReorder = !saving;

  const handleCategoryDragOver = (event: DragEvent, categoryId: number) => {
    if (!canReorder || dragCategoryId == null) return;
    event.preventDefault();
    setOverCategoryId(categoryId);
  };

  const handleCategoryDrop = (event: DragEvent, categoryId: number) => {
    event.preventDefault();
    if (!canReorder || dragCategoryId == null || dragCategoryId === categoryId) {
      setDragCategoryId(null);
      setOverCategoryId(null);
      return;
    }
    onReorderCategories(dragCategoryId, categoryId);
    setDragCategoryId(null);
    setOverCategoryId(null);
  };

  const handleTagDragOver = (event: DragEvent, tag: ArmaPhotoTag) => {
    if (!canReorder || dragTag == null || dragTag.categoryId !== tag.categoryId) return;
    event.preventDefault();
    event.stopPropagation();
    setOverTagId(tag.id);
  };

  const handleTagDrop = (event: DragEvent, tag: ArmaPhotoTag) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canReorder || dragTag == null || dragTag.categoryId !== tag.categoryId || dragTag.tagId === tag.id) {
      setDragTag(null);
      setOverTagId(null);
      return;
    }
    onReorderTags(tag.categoryId, dragTag.tagId, tag.id);
    setDragTag(null);
    setOverTagId(null);
  };

  return (
    <AdminCard
      title="Категории и теги"
      description="Переименуйте пункты или перетащите их — тот же порядок будет в фильтре на странице «Арма фото»."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="flex flex-wrap items-end gap-2" onSubmit={onCreateCategory}>
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block text-admin-text-secondary">Новая категория</span>
            <input
              value={categoryName}
              onChange={(event) => onCategoryNameChange(event.target.value)}
              placeholder="Цвет, Остекление…"
              className="flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 text-sm"
            />
          </label>
          <Button type="submit" disabled={saving || !categoryName.trim()}>
            Добавить категорию
          </Button>
        </form>

        <form className="flex flex-wrap items-end gap-2" onSubmit={onCreateTag}>
          <label className="text-sm">
            <span className="mb-1 block text-admin-text-secondary">Категория</span>
            <select
              value={tagCategoryId}
              onChange={(event) => onTagCategoryIdChange(event.target.value)}
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
              onChange={(event) => onTagNameChange(event.target.value)}
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
          {categories.map((category) => {
            const isOver = overCategoryId === category.id && dragCategoryId !== category.id;
            return (
              <li
                key={category.id}
                onDragOver={(event) => handleCategoryDragOver(event, category.id)}
                onDrop={(event) => handleCategoryDrop(event, category.id)}
                className={cn(
                  "rounded border px-3 py-2",
                  isOver ? "border-brand ring-2 ring-brand/40" : "border-admin-border",
                  dragCategoryId === category.id && "opacity-40",
                )}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div
                    draggable={canReorder}
                    onDragStart={() => {
                      if (!canReorder) return;
                      setDragCategoryId(category.id);
                    }}
                    onDragEnd={() => {
                      setDragCategoryId(null);
                      setOverCategoryId(null);
                    }}
                  >
                    <DragHandle disabled={!canReorder} label={`Порядок категории «${category.name}»`} />
                  </div>
                  <InlineNameInput
                    value={category.name}
                    disabled={saving}
                    ariaLabel={`Название категории ${category.name}`}
                    className="min-w-[10rem] flex-1 font-medium"
                    onSave={(name) => void onRenameCategory(category.id, name)}
                  />
                  <AdminConfirmButton
                    confirmMessage={`Удалить категорию «${category.name}» и все её теги?`}
                    onConfirm={() => onDeleteCategory(category.id)}
                  >
                    Удалить
                  </AdminConfirmButton>
                </div>
                {category.tags.length === 0 ? (
                  <p className="text-xs text-admin-text-muted">Тегов пока нет</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => {
                      const tagOver =
                        overTagId === tag.id && dragTag != null && dragTag.tagId !== tag.id;
                      return (
                        <span
                          key={tag.id}
                          onDragOver={(event) => handleTagDragOver(event, tag)}
                          onDrop={(event) => handleTagDrop(event, tag)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border bg-admin-surface-muted py-0.5 pl-1 pr-2 text-xs",
                            tagOver ? "border-brand ring-2 ring-brand/40" : "border-admin-border",
                            dragTag?.tagId === tag.id && "opacity-40",
                          )}
                        >
                          <span
                            draggable={canReorder}
                            onDragStart={() => {
                              if (!canReorder) return;
                              setDragTag({ categoryId: category.id, tagId: tag.id });
                            }}
                            onDragEnd={() => {
                              setDragTag(null);
                              setOverTagId(null);
                            }}
                          >
                            <DragHandle disabled={!canReorder} label={`Порядок тега «${tag.name}»`} />
                          </span>
                          <InlineNameInput
                            value={tag.name}
                            disabled={saving}
                            ariaLabel={`Название тега ${tag.name}`}
                            className="h-6 w-[9rem] rounded-full px-2 text-xs"
                            onSave={(name) => void onRenameTag(tag.id, name)}
                          />
                          <button
                            type="button"
                            className="text-admin-text-muted hover:text-red-700"
                            aria-label={`Удалить тег ${tag.name}`}
                            onClick={() => onDeleteTag(tag.id)}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </AdminCard>
  );
}
