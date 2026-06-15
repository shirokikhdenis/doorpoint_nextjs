"use client";

type RangeSliderProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  onChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
};

export function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  onChange,
  formatValue,
}: RangeSliderProps) {
  const span = Math.max(max - min, step);
  const low = Math.min(Math.max(valueMin, min), max - step);
  const high = Math.max(Math.min(valueMax, max), min + step);
  const safeLow = Math.min(low, high - step);
  const safeHigh = Math.max(high, safeLow + step);

  const percentLow = ((safeLow - min) / span) * 100;
  const percentHigh = ((safeHigh - min) / span) * 100;

  const format = formatValue ?? ((value: number) => String(value));

  return (
    <div className="space-y-2 px-1">
      <div className="relative mx-1 h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-zinc-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${percentLow}%`, width: `${percentHigh - percentLow}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeLow}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Math.min(next, safeHigh - step), safeHigh);
          }}
          className="range-slider-input absolute inset-0 z-20 w-full"
          aria-label="Минимум"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeHigh}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(safeLow, Math.max(next, safeLow + step));
          }}
          className="range-slider-input absolute inset-0 z-30 w-full"
          aria-label="Максимум"
        />
      </div>
      <div className="flex justify-between text-sm tabular-nums text-zinc-600">
        <span>{format(safeLow)}</span>
        <span>{format(safeHigh)}</span>
      </div>
    </div>
  );
}
