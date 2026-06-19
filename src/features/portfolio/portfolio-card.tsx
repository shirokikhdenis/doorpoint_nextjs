"use client";

import { StorefrontImage } from "@/features/store/storefront-image";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type PortfolioCardItem = {
  id: number;
  title: string;
  description: string;
  images: string[];
};

type PortfolioCardProps = {
  item: PortfolioCardItem;
  photoIndex: number;
  onPhotoIndexChange: (index: number) => void;
  onOpen: () => void;
};

export function PortfolioCard({
  item,
  photoIndex,
  onPhotoIndexChange,
  onOpen,
}: PortfolioCardProps) {
  const images = item.images.map((url) => toPublicImageSrc(url)).filter(Boolean);
  const safeIndex = images.length > 0 ? photoIndex % images.length : 0;
  const currentSrc = images[safeIndex] || "";
  const hasMultiple = images.length > 1;

  const showPrev = (event: React.MouseEvent) => {
    event.stopPropagation();
    onPhotoIndexChange((safeIndex - 1 + images.length) % images.length);
  };

  const showNext = (event: React.MouseEvent) => {
    event.stopPropagation();
    onPhotoIndexChange((safeIndex + 1) % images.length);
  };

  return (
    <article className="group w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[9/16] w-full bg-zinc-100">
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 z-0 block w-full overflow-hidden"
          aria-label={`Открыть: ${item.title}`}
        >
          {currentSrc ? (
            <StorefrontImage
              src={currentSrc}
              alt={item.title}
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : null}
        </button>

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white shadow transition hover:bg-black/70"
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white shadow transition hover:bg-black/70"
              aria-label="Следующее фото"
            >
              ›
            </button>
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {safeIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      <button type="button" onClick={onOpen} className="w-full space-y-1 px-3 py-2 text-left">
        <div className="text-sm font-medium text-zinc-800">{item.title}</div>
        {item.description ? (
          <p className="line-clamp-2 text-xs text-zinc-500">{item.description}</p>
        ) : null}
      </button>
    </article>
  );
}
