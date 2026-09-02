"use client";

import { useEffect } from "react";
import { stepGalleryImage } from "@/lib/client/gallery-step";

type ImageLightboxProps = {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  images?: string[];
  onSelect?: (url: string) => void;
};

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
  images = [],
  onSelect,
}: ImageLightboxProps) {
  const galleryKey = images.join("|");
  const gallery = galleryKey ? galleryKey.split("|") : src ? [src] : [];
  const canFlip = Boolean(onSelect) && gallery.length > 1;

  useEffect(() => {
    if (!open) return undefined;
    const list = galleryKey ? galleryKey.split("|") : src ? [src] : [];
    const allowFlip = Boolean(onSelect) && list.length > 1;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (!allowFlip || !onSelect) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSelect(stepGalleryImage(list, src, -1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelect(stepGalleryImage(list, src, 1));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, onSelect, galleryKey, src]);

  if (!open || !src) return null;

  const activeIndex = Math.max(0, gallery.indexOf(src));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Увеличенное фото"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
        aria-label="Закрыть"
      >
        ×
      </button>
      {canFlip ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(stepGalleryImage(gallery, src, -1));
            }}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-2xl leading-none text-white hover:bg-black/70 sm:left-6"
            aria-label="Предыдущее фото"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(stepGalleryImage(gallery, src, 1));
            }}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-2xl leading-none text-white hover:bg-black/70 sm:right-6"
            aria-label="Следующее фото"
          >
            ›
          </button>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white">
            {activeIndex + 1} / {gallery.length}
          </div>
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[min(90vh,1200px)] max-w-[min(92vw,1200px)] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
