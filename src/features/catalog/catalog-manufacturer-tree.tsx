"use client";

import { useEffect, useState } from "react";
import {
  catalogFilterStaticSectionHeadingClass,
  chipToneClass,
} from "@/features/store/storefront-ui";
import type { CatalogManufacturerTreeItem } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";

type CatalogManufacturerTreeProps = {
  tree: CatalogManufacturerTreeItem[];
  selectedManufacturer?: string;
  selectedCollection?: string;
  onSelectCollection: (manufacturer: string, collection: string) => void;
  onSelectManufacturer: (manufacturer: string) => void;
};

function TreeChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn(
        "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
        open && "rotate-90",
      )}
    >
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CatalogManufacturerTree({
  tree,
  selectedManufacturer = "",
  selectedCollection = "",
  onSelectCollection,
  onSelectManufacturer,
}: CatalogManufacturerTreeProps) {
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedManufacturer) return;
    setExpandedManufacturer(selectedManufacturer);
  }, [selectedManufacturer]);

  if (tree.length === 0) return null;

  const toggleManufacturer = (manufacturer: string) => {
    setExpandedManufacturer((current) => (current === manufacturer ? null : manufacturer));
  };

  return (
    <div data-testid="catalog-manufacturer-tree">
      <p className={catalogFilterStaticSectionHeadingClass}>Фабрики</p>
      <ul className="flex flex-col gap-0.5 pb-1">
        {tree.map(({ manufacturer, collections }) => {
          const isOpen = expandedManufacturer === manufacturer;
          const manufacturerActive =
            selectedManufacturer === manufacturer && !selectedCollection;
          return (
            <li key={manufacturer}>
              <button
                type="button"
                data-testid="catalog-manufacturer-tree-factory"
                data-manufacturer={manufacturer}
                onClick={() => {
                  toggleManufacturer(manufacturer);
                  onSelectManufacturer(manufacturer);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition",
                  manufacturerActive
                    ? chipToneClass(true)
                    : "text-zinc-800 hover:bg-zinc-50",
                )}
                aria-expanded={isOpen}
              >
                <TreeChevron open={isOpen} />
                <span className="min-w-0 flex-1 truncate">{manufacturer}</span>
              </button>
              {isOpen ? (
                <ul className="mb-1 ml-3 border-l border-zinc-200 pl-2">
                  {collections.map((collection) => {
                    const active =
                      selectedManufacturer === manufacturer && selectedCollection === collection;
                    return (
                      <li key={collection}>
                        <button
                          type="button"
                          data-testid="catalog-manufacturer-tree-collection"
                          data-manufacturer={manufacturer}
                          data-collection={collection}
                          onClick={() => onSelectCollection(manufacturer, collection)}
                          className={cn(
                            "mt-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm transition",
                            active
                              ? chipToneClass(true)
                              : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
                          )}
                        >
                          {collection}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
