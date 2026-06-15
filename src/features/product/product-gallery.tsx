"use client";

import Image from "next/image";

type ProductGalleryProps = {
  productName: string;
  image: string;
  galleryImages: string[];
  onOpenLightbox: () => void;
  onSelectThumbnail: (url: string) => void;
};

export function ProductGallery({
  productName,
  image,
  galleryImages,
  onOpenLightbox,
  onSelectThumbnail,
}: ProductGalleryProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => image && onOpenLightbox()}
        disabled={!image}
        className="flex aspect-[4/5] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-white py-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-default md:aspect-auto md:h-[620px]"
        aria-label="Увеличить фото"
      >
        {image ? (
          <Image
            src={image}
            alt={productName}
            width={800}
            height={1000}
            className="max-h-full max-w-full object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : null}
      </button>
      {galleryImages.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {galleryImages.map((url) => {
            const active = url === image;
            return (
              <button
                key={url}
                type="button"
                onClick={() => onSelectThumbnail(url)}
                className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-white p-1 ${
                  active ? "border-brand ring-2 ring-brand/30" : "border-zinc-200"
                }`}
                aria-label="Показать фото"
                aria-pressed={active}
              >
                <Image
                  src={url}
                  alt=""
                  width={64}
                  height={64}
                  className="max-h-full max-w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
