import type { CatalogActiveFilterChip } from "@/features/catalog/catalog-filter-utils";

type CatalogActiveFilterChipsProps = {
  chips: CatalogActiveFilterChip[];
  onRemove: (chip: CatalogActiveFilterChip) => void;
  onClearAll: () => void;
};

export function CatalogActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: CatalogActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0" data-testid="catalog-active-filters">
      <div className="flex w-max items-center gap-2.5 sm:w-full sm:flex-wrap">
        {chips.map((chip) => {
          const title = `${chip.label}: ${chip.value}`;
          return (
            <button
              key={chip.id}
              type="button"
              data-testid="catalog-active-filter-chip"
              onClick={() => onRemove(chip)}
              aria-label={`Убрать фильтр ${title}`}
              className="group inline-flex max-w-[78vw] shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-800 transition hover:bg-brand/10 hover:text-brand sm:max-w-full"
            >
              <span className="text-zinc-500">{chip.label}:</span>
              <span className="truncate">{chip.value}</span>
              <span aria-hidden="true" className="text-sm leading-none text-zinc-400 transition group-hover:text-brand">
                ×
              </span>
            </button>
          );
        })}
        <button
          type="button"
          data-testid="catalog-active-filters-clear"
          onClick={onClearAll}
          className="shrink-0 rounded-full px-2 py-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          Сбросить все
        </button>
      </div>
    </div>
  );
}
