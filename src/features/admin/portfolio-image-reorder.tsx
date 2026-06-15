"use client";

import Image from "next/image";
import { useState } from "react";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type PortfolioImageItem = {
  id: number;
  projectId: number;
  imageUrl: string;
  sortOrder: number;
};

const reorderImagesList = (
  images: PortfolioImageItem[],
  dragId: number,
  targetId: number,
): PortfolioImageItem[] => {
  const from = images.findIndex((img) => img.id === dragId);
  const to = images.findIndex((img) => img.id === targetId);
  if (from < 0 || to < 0 || from === to) return images;
  const next = [...images];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

type PortfolioImageReorderProps = {
  images: PortfolioImageItem[];
  disabled?: boolean;
  onReorder: (dragId: number, targetId: number) => void;
  onDelete: (image: PortfolioImageItem) => void;
};

export function PortfolioImageReorder({
  images,
  disabled = false,
  onReorder,
  onDelete,
}: PortfolioImageReorderProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  if (images.length === 0) {
    return <p className="text-sm text-zinc-400">Фото пока нет — добавьте ниже.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">Перетащите фото, чтобы изменить порядок (первое — обложка).</p>
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => {
          const src = toPublicImageSrc(image.imageUrl);
          const isDragging = dragId === image.id;
          const isOver = overId === image.id && dragId !== image.id;
          return (
            <div
              key={image.id}
              draggable={!disabled}
              onDragStart={() => {
                if (disabled) return;
                setDragId(image.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                if (disabled) return;
                event.preventDefault();
                setOverId(image.id);
              }}
              onDragLeave={() => {
                if (overId === image.id) setOverId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (disabled || dragId == null || dragId === image.id) return;
                onReorder(dragId, image.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`relative h-20 w-28 overflow-hidden rounded border bg-zinc-50 transition ${
                disabled ? "opacity-60" : "cursor-grab active:cursor-grabbing"
              } ${isDragging ? "opacity-40" : ""} ${
                isOver ? "border-brand ring-2 ring-brand/40" : "border-zinc-200"
              }`}
            >
              {src ? (
                <Image src={src} alt="" fill className="pointer-events-none object-cover" sizes="112px" />
              ) : null}
              <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                {index + 1}
              </span>
              <button
                type="button"
                title="Удалить фото"
                disabled={disabled}
                onClick={() => onDelete(image)}
                className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-700 shadow disabled:opacity-50"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { reorderImagesList };
