"use client";

import { useCatalogSearchRegistry } from "@/features/catalog/catalog-search-context";
import { cn } from "@/lib/utils";

type CatalogHeaderSearchProps = {
  className?: string;
};

export function CatalogHeaderSearch({ className }: CatalogHeaderSearchProps) {
  const registry = useCatalogSearchRegistry();
  const api = registry?.api;

  if (!api) return null;

  return (
    <input
      type="search"
      data-testid="catalog-header-search"
      value={api.searchInput}
      onChange={(event) => api.setSearchInput(event.target.value)}
      placeholder="Поиск"
      aria-label="Поиск по каталогу"
      className={cn(
        "min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400",
        className,
      )}
    />
  );
}
