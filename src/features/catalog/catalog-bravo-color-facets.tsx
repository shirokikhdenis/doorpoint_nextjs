"use client";

import { toPublicImageSrc } from "@/lib/client/image-src";
import type { CatalogColorFacet } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";

type CatalogBravoColorFacetsProps = {
  facets: CatalogColorFacet[];
  selected: string[];
  onSelect: (color: string, subcategorySlug?: string) => void;
};

export function CatalogBravoColorFacets({
  facets,
  selected,
  onSelect,
}: CatalogBravoColorFacetsProps) {
  if (!facets.length) return null;

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 px-1"
      role="listbox"
      aria-label="Цвет покрытия"
      data-testid="catalog-bravo-color-facets"
    >
      {facets.map((facet) => {
        const isSelected = selected.includes(facet.color);
        const swatch = toPublicImageSrc(facet.swatch);
        return (
          <button
            key={facet.color}
            type="button"
            role="option"
            aria-selected={isSelected}
            title={`${facet.color}${facet.count ? ` (${facet.count})` : ""}`}
            aria-label={facet.color}
            className={cn(
              "h-7 w-7 shrink-0 overflow-hidden rounded border bg-zinc-50 transition sm:h-8 sm:w-8",
              isSelected
                ? "border-brand ring-2 ring-brand/40"
                : "border-zinc-200 hover:border-zinc-400",
            )}
            onClick={() => onSelect(facet.color, facet.subcategorySlug)}
          >
            {swatch ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={swatch} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="block h-full w-full bg-gradient-to-br from-zinc-100 to-zinc-300" />
            )}
          </button>
        );
      })}
    </div>
  );
}
