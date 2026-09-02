"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/features/store/storefront-image";
import { ARMA_FOTO_GALLERY, ARMA_FOTO_GALLERY_ID } from "@/features/arma-photos/arma-foto-copy";
import { getPhotoTagsByCategory } from "@/features/arma-photos/arma-foto-photo-tags";
import {
  flattenTags,
  photoMatchesSelectedTags,
  type ArmaPhoto,
  type ArmaPhotoTagCategory,
} from "@/features/arma-photos/types";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { cn } from "@/lib/utils";

type ArmaPhotoGalleryProps = {
  items: ArmaPhoto[];
  categories: ArmaPhotoTagCategory[];
  onRequestQuote?: (photo: ArmaPhoto) => void;
};

const PHOTOS_PER_ROW = 3;
const INITIAL_VISIBLE_ROWS = 6;
const LOAD_MORE_ROWS = 3;
const INITIAL_VISIBLE_COUNT = PHOTOS_PER_ROW * INITIAL_VISIBLE_ROWS;
const LOAD_MORE_COUNT = PHOTOS_PER_ROW * LOAD_MORE_ROWS;

export function ArmaPhotoGallery({ items, categories, onRequestQuote }: ArmaPhotoGalleryProps) {
  const tags = useMemo(() => flattenTags(categories), [categories]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const filteredItems = useMemo(
    () => items.filter((photo) => photoMatchesSelectedTags(photo.tagIds, selectedTagIds, tags)),
    [items, selectedTagIds, tags],
  );

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const activePhoto = activeIndex == null ? null : filteredItems[activeIndex] || null;
  const activePhotoTags = useMemo(
    () => (activePhoto ? getPhotoTagsByCategory(activePhoto, categories) : []),
    [activePhoto, categories],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setActiveIndex(null);
  }, [selectedTagIds, items]);

  const toggleFilterTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
    setActiveIndex(null);
  };

  const closeViewer = useCallback(() => setActiveIndex(null), []);

  const requestQuote = useCallback(() => {
    if (!activePhoto || !onRequestQuote) return;
    onRequestQuote(activePhoto);
    closeViewer();
  }, [activePhoto, closeViewer, onRequestQuote]);

  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null || filteredItems.length === 0) return current;
      return current <= 0 ? filteredItems.length - 1 : current - 1;
    });
  }, [filteredItems.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null || filteredItems.length === 0) return current;
      return current >= filteredItems.length - 1 ? 0 : current + 1;
    });
  }, [filteredItems.length]);

  useEffect(() => {
    if (!activePhoto) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activePhoto, closeViewer, showNext, showPrev]);

  return (
    <>
      <section id={ARMA_FOTO_GALLERY_ID} className="mt-10 scroll-mt-24 space-y-2">
        <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">{ARMA_FOTO_GALLERY.title}</h2>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
          {ARMA_FOTO_GALLERY.description}
        </p>
      </section>

      {categories.length > 0 ? (
        <section className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-zinc-900">Подбор по характеристикам</h2>
            {selectedTagIds.length > 0 ? (
              <button
                type="button"
                className="text-[11px] text-zinc-500 transition hover:text-brand"
                onClick={() => {
                  setSelectedTagIds([]);
                  setActiveIndex(null);
                }}
              >
                Сбросить
              </button>
            ) : null}
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {category.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {category.tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 transition",
                        active
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-brand/30 hover:text-brand",
                      )}
                      onClick={() => toggleFilterTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Фото пока не опубликованы.</p>
      ) : filteredItems.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Нет фото по выбранным тегам.</p>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-3 gap-3 lg:gap-4">
            {visibleItems.map((photo, index) => {
              const previewSrc = toPublicImageSrc(photo.previewUrl || photo.imageUrl);
              if (!previewSrc) return null;
              return (
                <button
                  key={photo.id}
                  type="button"
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                  onClick={() => setActiveIndex(index)}
                >
                  <StorefrontImage
                    src={previewSrc}
                    alt={photo.name}
                    fill
                    sizes="(max-width: 1024px) 33vw, 320px"
                    variant="card"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </button>
              );
            })}
          </section>
          {visibleCount < filteredItems.length ? (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleCount((current) => current + LOAD_MORE_COUNT)}
              >
                Показать ещё
              </Button>
            </div>
          ) : null}
        </>
      )}

      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.name}
          onClick={closeViewer}
        >
          <div
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-xl bg-zinc-950 p-3 sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeViewer}
              className="absolute right-3 top-3 z-20 rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            >
              Закрыть
            </button>

            <div className="relative mx-auto mt-8 h-[min(80dvh,48rem)] w-full overflow-hidden rounded-lg bg-black sm:mt-0">
              <StorefrontImage
                src={toPublicImageSrc(activePhoto.imageUrl || activePhoto.previewUrl) || ""}
                alt={activePhoto.name}
                fill
                className="object-contain"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
              {filteredItems.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrev}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
                    aria-label="Предыдущее фото"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
                    aria-label="Следующее фото"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                    {(activeIndex ?? 0) + 1} / {filteredItems.length}
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-4 space-y-4 px-1 text-white">
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="text-lg font-semibold">{activePhoto.name}</h3>
                {activePhotoTags.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    {activePhotoTags.flatMap((row) =>
                      row.tags.map((tag) => (
                        <span
                          key={`${row.category}-${tag}`}
                          className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/90"
                        >
                          {tag}
                        </span>
                      )),
                    )}
                  </div>
                ) : null}
              </div>
              {onRequestQuote ? (
                <div className="flex justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="brand"
                    className="min-w-[12rem]"
                    onClick={requestQuote}
                  >
                    Отправить заявку
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
