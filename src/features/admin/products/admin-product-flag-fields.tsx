"use client";

import {
  DEFAULT_PRODUCT_FLAG_COLOR,
  PRODUCT_FLAG_COLOR_PRESETS,
  PRODUCT_FLAG_LABEL_MAX_LEN,
  normalizeClientFlagColor,
} from "@/lib/client/product-flag";
import { AdminInputField } from "@/features/admin/ui/admin-form-field";

type AdminProductFlagFieldsProps = {
  idPrefix: string;
  flagLabel: string;
  flagColor: string;
  onFlagLabelChange: (value: string) => void;
  onFlagColorChange: (value: string) => void;
  disabled?: boolean;
};

export function AdminProductFlagFields({
  idPrefix,
  flagLabel,
  flagColor,
  onFlagLabelChange,
  onFlagColorChange,
  disabled = false,
}: AdminProductFlagFieldsProps) {
  const previewColor = normalizeClientFlagColor(flagColor, DEFAULT_PRODUCT_FLAG_COLOR);
  const previewLabel = flagLabel.trim() || "Пример";

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-800">Флажок на карточке</h3>
      <p className="text-xs text-zinc-500">
        Произвольный текст поверх фото (как «Хит»). Пустой текст — без флажка. Системные «Хит» и
        «Акция» не затрагиваются.
      </p>
      <AdminInputField
        id={`${idPrefix}-flag-label`}
        label="Текст флажка"
        value={flagLabel}
        maxLength={PRODUCT_FLAG_LABEL_MAX_LEN}
        placeholder="Например: Новинка"
        disabled={disabled}
        onChange={(event) => onFlagLabelChange(event.target.value)}
        hint={`До ${PRODUCT_FLAG_LABEL_MAX_LEN} символов`}
      />
      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-flag-color`} className="block text-sm font-medium text-zinc-800">
          Цвет флажка
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`${idPrefix}-flag-color`}
            type="color"
            value={previewColor}
            disabled={disabled}
            onChange={(event) => onFlagColorChange(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-zinc-200 bg-white p-1 disabled:opacity-50"
          />
          <input
            type="text"
            value={flagColor}
            disabled={disabled}
            placeholder={DEFAULT_PRODUCT_FLAG_COLOR}
            onChange={(event) => onFlagColorChange(event.target.value)}
            className="h-9 w-28 rounded border border-zinc-200 px-2 font-mono text-sm disabled:opacity-50"
          />
          {PRODUCT_FLAG_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              title={preset}
              disabled={disabled}
              onClick={() => onFlagColorChange(preset)}
              className={`h-7 w-7 rounded-full border-2 disabled:opacity-50 ${
                previewColor === preset ? "border-zinc-900" : "border-transparent"
              }`}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>Превью:</span>
        <span
          className="rounded px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: previewColor }}
        >
          {previewLabel}
        </span>
      </div>
    </section>
  );
}
