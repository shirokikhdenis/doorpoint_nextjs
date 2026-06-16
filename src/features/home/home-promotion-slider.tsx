"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PromotionBanner } from "@/lib/client/normalizers";

const AUTOPLAY_MS = 7000;

const arrowButtonClass =
  "z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50";

function SlideContent({
  banner,
  className,
}: {
  banner: Pick<PromotionBanner, "title" | "subtitle" | "backgroundImageUrl" | "href">;
  className?: string;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-white" aria-hidden />
      {banner.backgroundImageUrl ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] min-w-[120px] max-w-[280px] p-4 sm:w-[45%] sm:max-w-none sm:p-6">
          <div className="relative h-full w-full">
            <Image
              src={banner.backgroundImageUrl}
              alt=""
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 40vw, 280px"
            />
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "relative z-10 flex min-h-[280px] flex-col justify-between gap-4 py-6 pb-10 pr-4 sm:pr-6",
          banner.backgroundImageUrl ? "max-w-[58%] sm:max-w-[55%]" : "max-w-xl",
          className,
        )}
      >
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Акция</p>
          <p className="text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl lg:text-3xl">
            {banner.title}
          </p>
          {banner.subtitle ? (
            <p className="text-sm leading-snug text-zinc-600 sm:text-base">{banner.subtitle}</p>
          ) : null}
        </div>
        <span className="inline-flex w-fit rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition group-hover:border-brand/30 group-hover:bg-zinc-50">
          Перейти
        </span>
      </div>
    </>
  );
}

function StaticPromoFallback() {
  return (
    <Link
      href="/catalog?catalogPage=interior-doors&onSale=1"
      className="group relative block min-h-[280px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md transition hover:shadow-lg"
    >
      <SlideContent
        banner={{
          href: "/catalog?catalogPage=interior-doors&onSale=1",
          title: "Скидки на двери",
          subtitle: "Выгодные предложения на межкомнатные и входные двери в салоне",
          backgroundImageUrl: "",
        }}
        className="px-6"
      />
    </Link>
  );
}

type HomePromotionSliderProps = {
  banners: PromotionBanner[];
};

export function HomePromotionSlider({ banners }: HomePromotionSliderProps) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const count = banners.length;
  const active = count > 0 ? banners[index % count] : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count <= 1 || reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, reduceMotion]);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  if (!active) {
    return <StaticPromoFallback />;
  }

  const showControls = count > 1;

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md">
      <div className="flex min-h-[280px] items-stretch">
        {showControls ? (
          <div className="flex shrink-0 items-center px-2 sm:px-3">
            <button
              type="button"
              className={arrowButtonClass}
              onClick={() => goTo(index - 1)}
              aria-label="Предыдущая акция"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="relative min-w-0 flex-1">
          {banners.map((banner, i) => (
            <Link
              key={banner.id}
              href={banner.href}
              className={cn(
                "group absolute inset-0 block overflow-hidden transition-opacity duration-500",
                i === index % count ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none",
              )}
              aria-hidden={i !== index % count}
              tabIndex={i === index % count ? 0 : -1}
            >
              <SlideContent banner={banner} className="px-2 sm:px-4" />
            </Link>
          ))}
        </div>

        {showControls ? (
          <div className="flex shrink-0 items-center px-2 sm:px-3">
            <button
              type="button"
              className={arrowButtonClass}
              onClick={() => goTo(index + 1)}
              aria-label="Следующая акция"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {showControls ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === index % count ? "bg-brand" : "bg-zinc-300 hover:bg-zinc-400",
              )}
              onClick={() => goTo(i)}
              aria-label={`Акция ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
