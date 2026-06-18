"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { PortfolioCard, type PortfolioCardItem } from "@/features/portfolio/portfolio-card";
import { toPublicImageSrc } from "@/lib/client/image-src";

type PortfolioItem = PortfolioCardItem & {
  coverImage: string;
};

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cardPhotoIndexes, setCardPhotoIndexes] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/portfolio");
        if (!response.ok) throw new Error("Не удалось загрузить портфолио");
        const json = (await response.json()) as { items?: PortfolioItem[] };
        if (!cancelled) {
          setItems(Array.isArray(json.items) ? json.items : []);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = activeIndex != null ? items[activeIndex] : null;
  const activeImages = active?.images.map((url) => toPublicImageSrc(url)).filter(Boolean) ?? [];
  const currentPhoto = activeImages[photoIndex] || activeImages[0] || "";

  const getCardPhotoIndex = useCallback(
    (id: number) => cardPhotoIndexes[id] ?? 0,
    [cardPhotoIndexes],
  );

  const setCardPhotoIndex = useCallback((id: number, index: number) => {
    setCardPhotoIndexes((prev) => ({ ...prev, [id]: index }));
  }, []);

  const openProject = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      setPhotoIndex(getCardPhotoIndex(item.id));
      setActiveIndex(index);
    },
    [items, getCardPhotoIndex],
  );

  const closeProject = useCallback(() => {
    if (activeIndex != null) {
      const item = items[activeIndex];
      if (item) {
        setCardPhotoIndexes((prev) => ({ ...prev, [item.id]: photoIndex }));
      }
    }
    setActiveIndex(null);
    setPhotoIndex(0);
  }, [activeIndex, items, photoIndex]);

  const showPrev = useCallback(() => {
    setPhotoIndex((prev) => (prev <= 0 ? activeImages.length - 1 : prev - 1));
  }, [activeImages.length]);

  const showNext = useCallback(() => {
    setPhotoIndex((prev) => (prev >= activeImages.length - 1 ? 0 : prev + 1));
  }, [activeImages.length]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProject();
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
  }, [active, closeProject, showNext, showPrev]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Портфолио</h1>
      <p className="mt-2 text-sm text-zinc-600">Наши выполненные работы.</p>

      {loading ? <p className="mt-6 text-sm text-zinc-500">Загрузка…</p> : null}
      {error ? (
        <p className="mt-6 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Пока нет опубликованных работ.</p>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <PortfolioCard
            key={item.id}
            item={item}
            photoIndex={getCardPhotoIndex(item.id)}
            onPhotoIndexChange={(nextIndex) => setCardPhotoIndex(item.id, nextIndex)}
            onOpen={() => openProject(index)}
          />
        ))}
      </section>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={closeProject}
        >
          <div
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-zinc-950 p-3 sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeProject}
              className="absolute right-3 top-3 z-20 rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            >
              Закрыть
            </button>

            <div className="relative mx-auto mt-8 h-[min(87dvh,51rem,calc(100dvh-10rem))] w-[min(100%,calc(min(87dvh,51rem,calc(100dvh-10rem))*9/16))] overflow-hidden rounded-lg bg-black sm:mt-0">
              {currentPhoto ? (
                <Image
                  src={currentPhoto}
                  alt={active.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                  priority
                />
              ) : null}

              {activeImages.length > 1 ? (
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
                    {photoIndex + 1} / {activeImages.length}
                  </div>
                </>
              ) : null}
            </div>

            {activeImages.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
                {activeImages.map((url, index) => {
                  const selected = index === photoIndex;
                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={`relative aspect-[9/16] h-16 shrink-0 overflow-hidden rounded border-2 ${
                        selected ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Фото ${index + 1}`}
                      aria-pressed={selected}
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-3 space-y-2 px-1 text-white">
              <h2 className="text-lg font-semibold">{active.title}</h2>
              {active.description ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-200">{active.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
