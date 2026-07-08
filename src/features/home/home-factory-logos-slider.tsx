"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StorefrontImage } from "@/features/store/storefront-image";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { cn } from "@/lib/utils";
import type { HomeFactoryLogoItem } from "@/features/home/home-factory-logos";

const arrowButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40";

type HomeFactoryLogosSliderProps = {
  items: HomeFactoryLogoItem[];
};

export function HomeFactoryLogosSlider({ items }: HomeFactoryLogosSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [items.length, updateScrollState]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const showControls = canScrollLeft || canScrollRight;

  return (
    <div className="flex items-stretch gap-2 sm:gap-3">
      {showControls ? (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            className={arrowButtonClass}
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollLeft}
            aria-label="Предыдущие фабрики"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "min-w-0 flex-1 overflow-x-auto scroll-smooth pb-1",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          showControls ? "snap-x snap-mandatory" : "",
        )}
      >
        <div className="flex w-max gap-3">
          {items.map((item) => {
            const logoSrc = toPublicImageSrc(item.logoImage);
            return (
              <Link
                key={`${item.name}-${item.href}`}
                href={item.href}
                prefetch={false}
                className="flex h-20 w-[140px] shrink-0 snap-start items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 shadow-sm transition hover:border-brand/25 hover:shadow-md sm:w-[160px]"
              >
                {logoSrc ? (
                  <StorefrontImage
                    src={logoSrc}
                    alt={item.name}
                    width={120}
                    height={48}
                    className="max-h-12 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <span className="text-center text-sm font-medium text-zinc-700">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {showControls ? (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            className={arrowButtonClass}
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            aria-label="Следующие фабрики"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
