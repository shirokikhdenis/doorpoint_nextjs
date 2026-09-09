"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/lib/client/use-body-scroll-lock";

type CatalogFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  children: ReactNode;
};

export function CatalogFilterDrawer({
  open,
  onClose,
  resultCount,
  children,
}: CatalogFilterDrawerProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) onClose();
    };
    media.addEventListener("change", onChange);
    if (media.matches) onClose();
    return () => media.removeEventListener("change", onChange);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Фильтры">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Закрыть фильтры"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-end border-b border-zinc-200 px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Скрыть фильтры
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <Button type="button" variant="brand" className="w-full" onClick={onClose}>
            {resultCount > 0 ? `Показать ${resultCount} товаров` : "Показать товары"}
          </Button>
        </div>
      </div>
    </div>
  );
}
