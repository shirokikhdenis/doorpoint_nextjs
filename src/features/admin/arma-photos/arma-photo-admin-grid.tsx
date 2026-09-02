"use client";

import { useState } from "react";
import type { ArmaPhoto } from "@/features/arma-photos/types";

const reorderPhotosList = (photos: ArmaPhoto[], dragId: string, targetId: string): ArmaPhoto[] => {
  const from = photos.findIndex((photo) => photo.id === dragId);
  const to = photos.findIndex((photo) => photo.id === targetId);
  if (from < 0 || to < 0 || from === to) return photos;
  const next = [...photos];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

type ArmaPhotoAdminGridProps = {
  photos: ArmaPhoto[];
  disabled?: boolean;
  reorderDisabled?: boolean;
  onOpen: (index: number) => void;
  onReorder: (dragId: string, targetId: string) => void;
  onDelete: (photo: ArmaPhoto) => void;
};

export function ArmaPhotoAdminGrid({
  photos,
  disabled = false,
  reorderDisabled = false,
  onOpen,
  onReorder,
  onDelete,
}: ArmaPhotoAdminGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const canReorder = !disabled && !reorderDisabled;

  return (
    <div className="space-y-3">
      <p className="text-xs text-admin-text-muted">
        {canReorder
          ? "Перетащите фото, чтобы изменить порядок на сайте. Первые фото показываются выше."
          : "Сбросьте фильтр по тегам, чтобы менять порядок фото."}
      </p>
      <ul className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => {
          const isDragging = dragId === photo.id;
          const isOver = overId === photo.id && dragId !== photo.id;
          return (
            <li
              key={photo.id}
              draggable={canReorder}
              onDragStart={() => {
                if (!canReorder) return;
                setDragId(photo.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                if (!canReorder) return;
                event.preventDefault();
                setOverId(photo.id);
              }}
              onDragLeave={() => {
                if (overId === photo.id) setOverId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!canReorder || dragId == null || dragId === photo.id) return;
                onReorder(dragId, photo.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`relative overflow-hidden rounded border bg-admin-surface-muted transition ${
                canReorder ? "cursor-grab active:cursor-grabbing" : ""
              } ${isDragging ? "opacity-40" : ""} ${
                isOver ? "border-brand ring-2 ring-brand/40" : "border-admin-border"
              }`}
            >
              <button
                type="button"
                className="group block w-full"
                onClick={() => onOpen(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl || photo.imageUrl}
                  alt={photo.name}
                  className="aspect-[3/4] w-full object-cover transition group-hover:opacity-90"
                  loading="lazy"
                  draggable={false}
                />
              </button>
              <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                {index + 1}
              </span>
              <button
                type="button"
                title="Удалить фото"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(photo);
                }}
                className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-700 shadow disabled:opacity-50"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { reorderPhotosList };
