"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FinishPickerFinishCard } from "@/features/product/finish-picker-finish-card";
import { formatFinishPriceDelta } from "@/features/product/finish-picker-utils";
import { StorefrontImage } from "@/features/store/storefront-image";
import type { DoorFinishItem, DoorFinishOptions } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";

export type FinishPickerTemplateProps = {
  finishOptions: DoorFinishOptions;
  selectedFinish: DoorFinishItem | null;
  onSelectFinish: (finish: DoorFinishItem) => void;
};

export function FinishPickerModalGridTabs({
  finishOptions,
  selectedFinish,
  onSelectFinish,
}: FinishPickerTemplateProps) {
  const [open, setOpen] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState(finishOptions.groups[0]?.key || "solid");

  const activeGroup = useMemo(
    () => finishOptions.groups.find((group) => group.key === activeGroupKey) || finishOptions.groups[0],
    [activeGroupKey, finishOptions.groups],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="space-y-2">
        <span className="text-sm text-zinc-600">Покрытие</span>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {selectedFinish ? "Изменить покрытие" : "Выбрать покрытие"}
          </Button>
          {selectedFinish ? (
            <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-800">
              {selectedFinish.image ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-zinc-200">
                  <StorefrontImage
                    src={selectedFinish.image}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="font-medium">{selectedFinish.name}</span>
                <span className="text-zinc-500"> · {formatFinishPriceDelta(selectedFinish.priceDelta)}</span>
              </span>
            </div>
          ) : (
            <span className="text-sm text-zinc-500">Выберите покрытие перед добавлением в корзину</span>
          )}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-finish-picker-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:px-6">
              <div>
                <h2 id="product-finish-picker-title" className="text-lg font-semibold text-zinc-900">
                  Выберите покрытие
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Каталог покрытий {finishOptions.manufacturerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl text-zinc-500 transition hover:bg-zinc-100"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-zinc-200 px-4 py-3 sm:px-6">
              {finishOptions.groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroupKey(group.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    activeGroupKey === group.key
                      ? "bg-brand text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  )}
                >
                  {group.title}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {(activeGroup?.items || []).map((item) => (
                  <FinishPickerFinishCard
                    key={item.id}
                    item={item}
                    selected={selectedFinish?.id === item.id}
                    onSelect={() => {
                      onSelectFinish(item);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
