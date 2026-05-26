"use client";

import Image from "next/image";
import { useState } from "react";

const galleryItems = [
  { src: "/uploads/doorphotos/tilda_upload/30100.jpg", title: "Проект 1" },
  { src: "/uploads/doorphotos/tilda_upload/30101.jpg", title: "Проект 2" },
  { src: "/uploads/doorphotos/tilda_upload/30102.jpg", title: "Проект 3" },
  { src: "/uploads/doorphotos/tilda_upload/30103.jpg", title: "Проект 4" },
  { src: "/uploads/doorphotos/tilda_upload/30104.jpg", title: "Проект 5" },
  { src: "/uploads/doorphotos/tilda_upload/30105.jpg", title: "Проект 6" },
  { src: "/uploads/doorphotos/tilda_upload/30106.jpg", title: "Проект 7" },
  { src: "/uploads/doorphotos/tilda_upload/30107.jpg", title: "Проект 8" },
  { src: "/uploads/doorphotos/tilda_upload/30108.jpg", title: "Проект 9" },
];

export default function PortfolioPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex != null ? galleryItems[activeIndex] : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Портфолио</h1>
      <p className="mt-2 text-sm text-zinc-600">Наши выполненные работы.</p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {galleryItems.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="px-3 py-2 text-sm font-medium text-zinc-700">{item.title}</div>
          </button>
        ))}
      </section>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActiveIndex(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Escape") setActiveIndex(null);
          }}
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute right-2 top-2 z-10 rounded bg-white px-3 py-1 text-sm font-medium"
            >
              Закрыть
            </button>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-zinc-950">
              <Image
                src={active.src}
                alt={active.title}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p className="mt-2 text-center text-sm text-zinc-100">{active.title}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
