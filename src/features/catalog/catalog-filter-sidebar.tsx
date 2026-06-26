import { RangeSlider } from "@/components/ui/range-slider";
import { AttributeFilterBlock } from "@/features/catalog/catalog-attribute-filter";
import {
  CollapsibleFilterSection,
  StaticFilterSection,
} from "@/features/catalog/catalog-filter-section";
import { CatalogManufacturerTree } from "@/features/catalog/catalog-manufacturer-tree";
import {
  attributeFiltersForSidebar,
  getEffectiveRange,
  labelMatchesSelections,
  priceSliderStep,
  shouldShowCategoryFilters,
  shouldShowSubcategoryFilters,
} from "@/features/catalog/catalog-filter-utils";
import type { NumericRange } from "@/features/catalog/catalog-types";
import {
  catalogFilterChipButtonClass,
  catalogFilterClearButtonClass,
  catalogFilterHeadingClass,
  catalogFilterOptionLabelClass,
  catalogFilterStaticSectionHeadingClass,
  chipToneClass,
} from "@/features/store/storefront-ui";
import type { CatalogLabel, CatalogMeta } from "@/lib/client/normalizers";
import {
  catalogPageSupportsManufacturerTree,
  catalogPageSupportsOnSaleFilter,
} from "@/lib/catalog-page-slugs";

type CatalogFilterSidebarProps = {
  catalogPage: string;
  meta: CatalogMeta;
  categories: string[];
  subcategories: string[];
  attrSelections: Record<string, string[]>;
  attrRanges: Record<string, NumericRange>;
  priceRange: NumericRange;
  onSale: boolean;
  onOnSaleChange: (value: boolean) => void;
  hasActiveFilters: boolean;
  isFilterSectionCollapsed: (sectionId: string) => boolean;
  onToggleFilterSection: (sectionId: string) => void;
  onClearAllFilters: () => void;
  onToggleCategory: (slug: string) => void;
  onToggleSubcategory: (slug: string) => void;
  onToggleAttrValue: (code: string, value: string) => void;
  onUpdatePriceRange: (min: number, max: number) => void;
  onUpdateAttrRange: (
    code: string,
    boundsMin: number,
    boundsMax: number,
    min: number,
    max: number,
  ) => void;
  onLabelClick: (label: CatalogLabel) => void;
  onSelectManufacturerCollection: (manufacturer: string, collection: string) => void;
  onSelectManufacturer: (manufacturer: string) => void;
};

function countAttrSelections(selected: string[]): number {
  return selected.length;
}

export function CatalogFilterSidebar({
  catalogPage,
  meta,
  categories,
  subcategories,
  attrSelections,
  attrRanges,
  priceRange,
  onSale,
  onOnSaleChange,
  hasActiveFilters,
  isFilterSectionCollapsed,
  onToggleFilterSection,
  onClearAllFilters,
  onToggleCategory,
  onToggleSubcategory,
  onToggleAttrValue,
  onUpdatePriceRange,
  onUpdateAttrRange,
  onLabelClick,
  onSelectManufacturerCollection,
  onSelectManufacturer,
}: CatalogFilterSidebarProps) {
  const sidebarAttributeFilters = attributeFiltersForSidebar(meta);
  const showCategories = shouldShowCategoryFilters(meta);
  const showSubcategories = shouldShowSubcategoryFilters(meta);
  const showCharacteristicsBlock = showSubcategories || sidebarAttributeFilters.length > 0;
  const showOnSaleFilter = catalogPageSupportsOnSaleFilter(catalogPage);
  const manufacturerTree =
    catalogPageSupportsManufacturerTree(catalogPage) && meta.manufacturerCollectionTree?.length
      ? meta.manufacturerCollectionTree
      : null;
  const selectedManufacturer = attrSelections.manufacturer?.[0] ?? "";
  const collectionAttrCode = meta.collectionAttrCode?.trim() || "collection";
  const selectedCollection = attrSelections[collectionAttrCode]?.[0] ?? "";

  return (
    <div className="catalog-filters-scroll min-h-0 flex-1 space-y-3 lg:overflow-y-auto lg:pb-6 lg:pr-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={catalogFilterHeadingClass}>Фильтры</h2>
        <button
          type="button"
          data-testid="catalog-clear-filters"
          onClick={onClearAllFilters}
          disabled={!hasActiveFilters}
          className={catalogFilterClearButtonClass}
        >
          Сбросить
        </button>
      </div>

      {manufacturerTree ? (
        <CatalogManufacturerTree
          tree={manufacturerTree}
          selectedManufacturer={selectedManufacturer}
          selectedCollection={selectedCollection}
          onSelectCollection={onSelectManufacturerCollection}
          onSelectManufacturer={onSelectManufacturer}
        />
      ) : null}

      {meta.labels.length > 0 ? (
        <div>
          <p className={catalogFilterStaticSectionHeadingClass}>Подборки</p>
          <div className="flex flex-col gap-2 pb-1">
            {meta.labels.map((label) => {
              const active = labelMatchesSelections(label, attrSelections);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onLabelClick(label)}
                  className={`${catalogFilterChipButtonClass} ${chipToneClass(active)}`}
                >
                  {label.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {meta.price.max > meta.price.min ? (
        <StaticFilterSection title="Цена, ₽">
          <RangeSlider
            min={meta.price.min}
            max={meta.price.max}
            step={priceSliderStep(meta.price.min, meta.price.max)}
            valueMin={getEffectiveRange(priceRange, meta.price.min, meta.price.max).min}
            valueMax={getEffectiveRange(priceRange, meta.price.min, meta.price.max).max}
            onChange={onUpdatePriceRange}
            formatValue={(value) => `${value.toLocaleString("ru-RU")} ₽`}
          />
        </StaticFilterSection>
      ) : null}

      {showOnSaleFilter ? (
        <button
          type="button"
          data-testid="catalog-filter-on-sale"
          aria-pressed={onSale}
          onClick={() => onOnSaleChange(!onSale)}
          className={`${catalogFilterChipButtonClass} ${chipToneClass(onSale)}`}
        >
          Двери со скидкой
        </button>
      ) : null}

      {showCategories ? (
        <CollapsibleFilterSection
          sectionId="categories"
          title="Категории"
          collapsed={isFilterSectionCollapsed("categories")}
          onToggle={onToggleFilterSection}
          activeCount={categories.length}
        >
          <div className="space-y-1.5">
            {meta.categories.map((category) => (
              <label key={category.slug} className={catalogFilterOptionLabelClass}>
                <input
                  type="checkbox"
                  checked={categories.includes(category.slug)}
                  onChange={() => onToggleCategory(category.slug)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </CollapsibleFilterSection>
      ) : null}

      {showCharacteristicsBlock ? (
        <div className="border-t border-zinc-100">
          <p className={catalogFilterStaticSectionHeadingClass}>Характеристики</p>
          <div className="space-y-0">
            {showSubcategories ? (
              <CollapsibleFilterSection
                sectionId="subcategories"
                title="Подкатегории"
                collapsed={isFilterSectionCollapsed("subcategories")}
                onToggle={onToggleFilterSection}
                activeCount={subcategories.length}
              >
                <div className="space-y-1.5">
                  {meta.subcategories.map((subcategory) => (
                    <label key={subcategory.slug} className={catalogFilterOptionLabelClass}>
                      <input
                        type="checkbox"
                        checked={subcategories.includes(subcategory.slug)}
                        onChange={() => onToggleSubcategory(subcategory.slug)}
                      />
                      {subcategory.name}
                    </label>
                  ))}
                </div>
              </CollapsibleFilterSection>
            ) : null}

            {sidebarAttributeFilters.map((filter) => {
              const selected = attrSelections[filter.code] || [];
              const range = attrRanges[filter.code] || { min: "", max: "" };
              const rangeActive =
                range.min.trim() !== "" || range.max.trim() !== "" ? 1 : 0;
              const activeCount =
                filter.type === "number" ? rangeActive : countAttrSelections(selected);

              return (
                <AttributeFilterBlock
                  key={filter.code}
                  filter={filter}
                  selected={selected}
                  range={range}
                  collapsed={isFilterSectionCollapsed(`attr-${filter.code}`)}
                  onToggleCollapse={onToggleFilterSection}
                  activeCount={activeCount}
                  onToggleValue={(value) => onToggleAttrValue(filter.code, value)}
                  onChangeRange={(min, max) =>
                    onUpdateAttrRange(filter.code, filter.min ?? 0, filter.max ?? 0, min, max)
                  }
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
