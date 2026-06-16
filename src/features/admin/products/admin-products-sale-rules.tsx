"use client";

import { useEffect, useState } from "react";
import type { SaleSettings } from "./types";

type AdminProductsSaleRulesProps = {
  settings: SaleSettings;
  description?: string;
  onSaved: (settings: SaleSettings, description?: string) => void;
};

export function AdminProductsSaleRules({
  settings,
  description,
  onSaved,
}: AdminProductsSaleRulesProps) {
  const [mode, setMode] = useState<SaleSettings["mode"]>(settings.mode);
  const [percent, setPercent] = useState(String(settings.percent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(settings.mode);
    setPercent(String(settings.percent));
  }, [settings.mode, settings.percent]);

  const save = async () => {
    const n = Math.round(Number(percent));
    if (!Number.isFinite(n) || n < 1 || n > 99) {
      setError("Укажите процент от 1 до 99");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sale-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, percent: n }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      const json = (await response.json()) as SaleSettings & { description?: string };
      onSaved({ mode: json.mode, percent: json.percent }, json.description);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Правила проставления акций</h2>
          <p className="mt-1 text-xs text-zinc-600">
            При включении «Акция» текущая цена становится старой. При снятии акции цена возвращается
            к исходной (до акции).
          </p>
          {description ? (
            <p className="mt-2 text-xs font-medium text-amber-900">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "Сохранение…" : "Сохранить правила"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Вариант расчёта
          </legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-white/80 bg-white px-3 py-2 text-sm">
            <input
              type="radio"
              name="sale-mode"
              checked={mode === "minus_percent"}
              onChange={() => setMode("minus_percent")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-zinc-900">Скидка −N%</span>
              <span className="mt-0.5 block text-xs text-zinc-600">
                Старая цена = текущая, новая цена = текущая − N% (например 10 000 → 9 000 при N=10)
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-white/80 bg-white px-3 py-2 text-sm">
            <input
              type="radio"
              name="sale-mode"
              checked={mode === "plus_percent"}
              onChange={() => setMode("plus_percent")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-zinc-900">Зачёркнутая +N%</span>
              <span className="mt-0.5 block text-xs text-zinc-600">
                Старая цена = текущая + N%, новая цена = текущая (цена на полке не меняется)
              </span>
            </span>
          </label>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">N, %</span>
          <input
            type="number"
            min={1}
            max={99}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </section>
  );
}
