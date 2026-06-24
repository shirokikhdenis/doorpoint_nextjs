"use client";

import { useMemo, useState } from "react";
import { FinishPickerFinishCard } from "@/features/product/finish-picker-finish-card";
import { formatFinishPriceDelta } from "@/features/product/finish-picker-utils";
import type { FinishPickerTemplateProps } from "@/features/product/finish-picker-modal-grid-tabs";
import { cn } from "@/lib/utils";

const CARDS_PER_ROW = 8;

export function FinishPickerInlinePanel({
  finishOptions,
  selectedFinish,
  onSelectFinish,
}: FinishPickerTemplateProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState(finishOptions.groups[0]?.key || "solid");

  const activeGroup = useMemo(
    () => finishOptions.groups.find((group) => group.key === activeGroupKey) || finishOptions.groups[0],
    [activeGroupKey, finishOptions.groups],
  );

  const groupItems = activeGroup?.items || [];
  const visibleItems = expanded ? groupItems : groupItems.slice(0, CARDS_PER_ROW);

  return (
    <section
      className="mt-6 w-full rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
      aria-label="Выбор покрытия"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Выберите покрытие</h2>
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand hover:bg-brand/5"
              aria-expanded={expanded}
            >
              {expanded ? "Свернуть" : "Развернуть"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "")}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        {selectedFinish ? (
          <p className="text-sm text-zinc-700">
            Выбрано: <span className="font-medium text-zinc-900">{selectedFinish.name}</span>
            <span className="text-zinc-500"> · {formatFinishPriceDelta(selectedFinish.priceDelta)}</span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Выберите покрытие перед добавлением в корзину</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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

      <div
        className={cn(
          "mt-4 grid gap-2 sm:gap-3",
          "grid-cols-4 sm:grid-cols-6 lg:grid-cols-8",
          !expanded && "overflow-hidden",
        )}
      >
        {visibleItems.map((item) => (
          <FinishPickerFinishCard
            key={item.id}
            item={item}
            selected={selectedFinish?.id === item.id}
            onSelect={() => onSelectFinish(item)}
            imageSizes="12vw"
            compact
          />
        ))}
      </div>

    </section>
  );
}
