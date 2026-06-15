import { RangeSlider } from "@/components/ui/range-slider";
import { AttributeFilterBlock } from "@/features/catalog/catalog-attribute-filter";
import { CollapsibleFilterSection } from "@/features/catalog/catalog-filter-section";
import {
  getEffectiveRange,
  labelMatchesSelections,
  priceSliderStep,
} from "@/features/catalog/catalog-filter-utils";
import type { NumericRange } from "@/features/catalog/catalog-types";
import {
  catalogFilterChipButtonClass,
  catalogFilterFieldClass,
  catalogFilterHeadingClass,
  catalogFilterOptionLabelClass,
  chipToneClass,
} from "@/features/store/storefront-ui";
import type { CatalogLabel, CatalogMeta } from "@/lib/client/normalizers";

type CatalogFilterSidebarProps = {
  meta: CatalogMeta;
  searchInput: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  categories: string[];
  subcategories: string[];
  attrSelections: Record<string, string[]>;
  attrRanges: Record<string, NumericRange>;
  priceRange: NumericRange;
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
};

export function CatalogFilterSidebar({
  meta,
  searchInput,
  onSearchChange,
  sort,
  onSortChange,
  categories,
  subcategories,
  attrSelections,
  attrRanges,
  priceRange,
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
}: CatalogFilterSidebarProps) {
  return (
    <div className="catalog-filters-scroll min-h-0 flex-1 space-y-4 lg:overflow-y-auto lg:pb-6 lg:pr-3">
      <h2 className={catalogFilterHeadingClass}>Фильтры</h2>
      <input
        className={catalogFilterFieldClass}
        placeholder="Поиск"
        value={searchInput}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        className={catalogFilterFieldClass}
        value={sort}
        onChange={(event) => onSortChange(event.target.value)}
      >
        <option value="popularity">По популярности</option>
        <option value="alphabet-asc">По алфавиту (А-Я)</option>
        <option value="alphabet-desc">По алфавиту (Я-А)</option>
        <option value="price-asc">Цена по возрастанию</option>
        <option value="price-desc">Цена по убыванию</option>
      </select>

      {meta.labels.length > 0 ? (
        <CollapsibleFilterSection
          sectionId="labels"
          title="Подборки"
          collapsed={isFilterSectionCollapsed("labels")}
          onToggle={onToggleFilterSection}
        >
          <div className="flex flex-col gap-1.5">
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
        </CollapsibleFilterSection>
      ) : null}

      {meta.categories.length > 0 ? (
        <CollapsibleFilterSection
          sectionId="categories"
          title="Категории"
          collapsed={isFilterSectionCollapsed("categories")}
          onToggle={onToggleFilterSection}
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

      {meta.subcategories.length > 0 ? (
        <CollapsibleFilterSection
          sectionId="subcategories"
          title="Подкатегории"
          collapsed={isFilterSectionCollapsed("subcategories")}
          onToggle={onToggleFilterSection}
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

      {meta.price.max > meta.price.min ? (
        <CollapsibleFilterSection
          sectionId="price"
          title="Цена, ₽"
          collapsed={isFilterSectionCollapsed("price")}
          onToggle={onToggleFilterSection}
        >
          <RangeSlider
            min={meta.price.min}
            max={meta.price.max}
            step={priceSliderStep(meta.price.min, meta.price.max)}
            valueMin={getEffectiveRange(priceRange, meta.price.min, meta.price.max).min}
            valueMax={getEffectiveRange(priceRange, meta.price.min, meta.price.max).max}
            onChange={onUpdatePriceRange}
            formatValue={(value) => `${value.toLocaleString("ru-RU")} ₽`}
          />
        </CollapsibleFilterSection>
      ) : null}

      {meta.attributeFilters.map((filter) => (
        <AttributeFilterBlock
          key={filter.code}
          filter={filter}
          selected={attrSelections[filter.code] || []}
          range={attrRanges[filter.code] || { min: "", max: "" }}
          collapsed={isFilterSectionCollapsed(`attr-${filter.code}`)}
          onToggleCollapse={onToggleFilterSection}
          onToggleValue={(value) => onToggleAttrValue(filter.code, value)}
          onChangeRange={(min, max) =>
            onUpdateAttrRange(filter.code, filter.min ?? 0, filter.max ?? 0, min, max)
          }
        />
      ))}

      <button
        type="button"
        onClick={onClearAllFilters}
        disabled={!hasActiveFilters}
        className={`${catalogFilterFieldClass} font-medium transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400`}
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
