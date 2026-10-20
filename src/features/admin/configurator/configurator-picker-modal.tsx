"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/client/format";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { useBodyScrollLock } from "@/lib/client/use-body-scroll-lock";
import { cn } from "@/lib/utils";

export type ConfiguratorPickerItem = {
  id: number;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  price?: number;
  delta?: number;
};

type PickerLayout = "door" | "swatch" | "panel";

type ConfiguratorPickerModalProps = {
  open: boolean;
  title: string;
  items: ConfiguratorPickerItem[];
  selectedId: number | null;
  noneLabel?: string;
  noneId?: number;
  layout?: PickerLayout;
  onClose: () => void;
  onSelect: (id: number) => void;
};

const previewAspect = (layout: PickerLayout) => {
  if (layout === "swatch") return "aspect-square";
  if (layout === "panel") return "aspect-[1096/2110]";
  return "aspect-[3/4]";
};

const markupLabel = (delta?: number) => {
  if (delta == null) return null;
  if (delta <= 0) return "без наценки";
  return `наценка +${formatPrice(delta)}`;
};

export function ConfiguratorPickerModal({
  open,
  title,
  items,
  selectedId,
  noneLabel,
  noneId,
  layout = "door",
  onClose,
  onSelect,
}: ConfiguratorPickerModalProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const select = (id: number) => {
    onSelect(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden bg-white shadow-xl sm:rounded-xl",
          layout === "panel" ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
        <div
          className={cn(
            "grid gap-3 overflow-y-auto p-4",
            layout === "swatch"
              ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
          )}
        >
          {noneLabel && noneId != null ? (
            <button
              type="button"
              onClick={() => select(noneId)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border px-2 py-3 text-sm",
                previewAspect(layout),
                selectedId === noneId ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200",
              )}
            >
              {noneLabel}
            </button>
          ) : null}
          {items.map((item) => {
            const src = toPublicImageSrc(item.imageUrl);
            const markup = markupLabel(item.delta);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                className={cn(
                  "flex flex-col rounded-lg border text-left",
                  selectedId === item.id ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200",
                )}
              >
                <div
                  className={cn(
                    "overflow-hidden rounded-t-[7px] bg-zinc-50",
                    previewAspect(layout),
                    layout === "panel" ? "p-2" : null,
                  )}
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className={cn("h-full w-full", layout === "swatch" ? "object-cover" : "object-contain")}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-400">
                      {layout === "panel" && !item.imageUrl ? "" : "Нет фото"}
                    </div>
                  )}
                </div>
                <div className="flex min-h-[3.5rem] flex-col px-2 py-2">
                  <div className="line-clamp-2 text-sm font-medium leading-snug">{item.name}</div>
                  {markup ? (
                    <div className={cn("mt-0.5 text-xs", item.delta && item.delta > 0 ? "font-medium text-amber-800" : "text-zinc-500")}>
                      {markup}
                    </div>
                  ) : item.subtitle ? (
                    <div className="mt-0.5 truncate text-xs text-zinc-500">{item.subtitle}</div>
                  ) : null}
                  {item.price != null ? (
                    <div className="mt-0.5 text-sm font-semibold">{formatPrice(item.price)}</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
