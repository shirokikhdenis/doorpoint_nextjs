import { RangeSlider } from "@/components/ui/range-slider";
import { CollapsibleFilterSection } from "@/features/catalog/catalog-filter-section";
import { getEffectiveRange } from "@/features/catalog/catalog-filter-utils";
import type { NumericRange } from "@/features/catalog/catalog-types";
import {
  catalogFilterFieldClass,
  catalogFilterOptionLabelClass,
} from "@/features/store/storefront-ui";
import type { CatalogAttributeFilter } from "@/lib/client/normalizers";

type AttributeFilterBlockProps = {
  filter: CatalogAttributeFilter;
  selected: string[];
  range: NumericRange;
  collapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onToggleValue: (value: string) => void;
  onChangeRange: (min: number, max: number) => void;
};

export function AttributeFilterBlock({
  filter,
  selected,
  range,
  collapsed,
  onToggleCollapse,
  onToggleValue,
  onChangeRange,
}: AttributeFilterBlockProps) {
  const sectionId = `attr-${filter.code}`;
  const title =
    filter.unit && filter.type === "number" ? (
      <>
        {filter.name}
        <span className="font-normal text-zinc-500"> ({filter.unit})</span>
      </>
    ) : (
      filter.name
    );

  if (filter.type === "number") {
    const min = filter.min ?? 0;
    const max = filter.max ?? 0;
    if (max <= min) return null;
    const effective = getEffectiveRange(range, min, max);
    return (
      <CollapsibleFilterSection
        sectionId={sectionId}
        title={title}
        collapsed={collapsed}
        onToggle={onToggleCollapse}
      >
        {filter.code === "thickness" ? (
          <RangeSlider
            min={min}
            max={max}
            step={1}
            valueMin={effective.min}
            valueMax={effective.max}
            onChange={onChangeRange}
          />
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(min)}
              value={range.min}
              onChange={(event) =>
                onChangeRange(
                  event.target.value.trim() === "" ? min : Number(event.target.value),
                  effective.max,
                )
              }
              className={`${catalogFilterFieldClass} min-w-0 flex-1 py-1.5`}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(max)}
              value={range.max}
              onChange={(event) =>
                onChangeRange(
                  effective.min,
                  event.target.value.trim() === "" ? max : Number(event.target.value),
                )
              }
              className={`${catalogFilterFieldClass} min-w-0 flex-1 py-1.5`}
            />
          </div>
        )}
      </CollapsibleFilterSection>
    );
  }

  const values = filter.values || [];
  if (values.length === 0) return null;
  return (
    <CollapsibleFilterSection
      sectionId={sectionId}
      title={title}
      collapsed={collapsed}
      onToggle={onToggleCollapse}
    >
      <div className="space-y-1.5">
        {values.map((value) => (
          <label key={value} className={catalogFilterOptionLabelClass}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggleValue(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </CollapsibleFilterSection>
  );
}
