"use client";

import { useEffect } from "react";
import { toPublicImageSrc, isMergedStorefrontImageUrl } from "@/lib/client/image-src";
import { stepGalleryImage } from "@/lib/client/gallery-step";
import { StorefrontImage } from "@/features/store/storefront-image";

type ProductGalleryProps = {
  productName: string;
  image: string;
  galleryImages: string[];
  onOpenLightbox: () => void;
  onSelectThumbnail: (url: string) => void;
  keyboardEnabled?: boolean;
  editable?: boolean;
  photosBusy?: boolean;
  onRemoveImage?: (url: string) => void;
  onAddFiles?: (files: File[]) => void;
};

function GalleryNavButton({
  label,
  onClick,
  side,
}: {
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-lg leading-none text-white hover:bg-black/70 ${
        side === "left" ? "left-2" : "right-2"
      }`}
      aria-label={label}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

export function ProductGallery({
  productName,
  image,
  galleryImages,
  onOpenLightbox,
  onSelectThumbnail,
  keyboardEnabled = false,
  editable = false,
  photosBusy = false,
  onRemoveImage,
  onAddFiles,
}: ProductGalleryProps) {
  const canFlip = galleryImages.length > 1;
  const showThumbs = canFlip || editable;
  const activeIndex = Math.max(0, galleryImages.indexOf(image));

  const showPrev = () => onSelectThumbnail(stepGalleryImage(galleryImages, image, -1));
  const showNext = () => onSelectThumbnail(stepGalleryImage(galleryImages, image, 1));

  useEffect(() => {
    if (!canFlip || !keyboardEnabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSelectThumbnail(stepGalleryImage(galleryImages, image, -1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelectThumbnail(stepGalleryImage(galleryImages, image, 1));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canFlip, keyboardEnabled, galleryImages, image, onSelectThumbnail]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => image && onOpenLightbox()}
          disabled={!image}
          className="w-full cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-default"
          aria-label="Увеличить фото"
        >
          <div className="relative aspect-[4/5] w-full rounded-lg bg-white p-3 sm:p-4 md:aspect-auto md:h-[620px]">
            {image ? (
              <StorefrontImage
                src={toPublicImageSrc(image) || image}
                alt={productName}
                fill
                className="object-contain object-center"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : null}
          </div>
        </button>
        {canFlip ? (
          <>
            <GalleryNavButton label="Предыдущее фото" side="left" onClick={showPrev} />
            <GalleryNavButton label="Следующее фото" side="right" onClick={showNext} />
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white">
              {activeIndex + 1} / {galleryImages.length}
            </div>
          </>
        ) : null}
      </div>
      {showThumbs ? (
        <div className="flex flex-wrap gap-2">
          {galleryImages.map((url, index) => {
            const active = url === image;
            const canDelete = Boolean(editable && onRemoveImage && !isMergedStorefrontImageUrl(url));
            return (
              <div key={url} className="relative">
                <button
                  type="button"
                  onClick={() => onSelectThumbnail(url)}
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-white p-1 ${
                    active ? "border-brand ring-2 ring-brand/30" : "border-zinc-200"
                  }`}
                  aria-label={`Показать фото ${index + 1}`}
                  aria-pressed={active}
                >
                  <StorefrontImage
                    src={toPublicImageSrc(url) || url}
                    alt=""
                    width={64}
                    height={64}
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    disabled={photosBusy}
                    onClick={() => onRemoveImage?.(url)}
                    className="absolute -right-1 -top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs leading-none text-white hover:bg-rose-700 disabled:opacity-50"
                    aria-label={`Удалить фото ${index + 1}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
          {editable && onAddFiles ? (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-sky-300 bg-sky-50 text-2xl leading-none text-sky-800 hover:bg-sky-100">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={photosBusy}
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  event.target.value = "";
                  if (files.length > 0) onAddFiles(files);
                }}
              />
              <span aria-hidden>+</span>
              <span className="sr-only">Добавить фото</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
