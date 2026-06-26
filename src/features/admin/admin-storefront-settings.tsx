"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";

export type StorefrontSettings = {
  showCatalogKitPrice: boolean;
  showCatalogManufacturerTree: boolean;
};

type AdminStorefrontSettingsProps = {
  className?: string;
};

export function AdminStorefrontSettings({ className }: AdminStorefrontSettingsProps) {
  const [settings, setSettings] = useState<StorefrontSettings>({
    showCatalogKitPrice: true,
    showCatalogManufacturerTree: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/storefront-settings");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = (await response.json()) as StorefrontSettings;
        if (!cancelled) {
          setSettings(json);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить настройки");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/storefront-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      const json = (await response.json()) as StorefrontSettings;
      setSettings(json);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard
      title="Витрина"
      description="Отображение цен и фильтров на витрине каталога."
      className={className}
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            disabled={loading || saving}
            checked={settings.showCatalogKitPrice}
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({
                ...current,
                showCatalogKitPrice: event.target.checked,
              }));
            }}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-admin-text">
              Показывать в каталоге цену за комплект
            </span>
            <span className="mt-1 block text-xs text-admin-text-muted">
              Для межкомнатных дверей рядом с ценой за полотно показывается расчёт комплекта
              (полотно + коробка + наличники). На странице товара цены не скрываются.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            disabled={loading || saving}
            checked={settings.showCatalogManufacturerTree}
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({
                ...current,
                showCatalogManufacturerTree: event.target.checked,
              }));
            }}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-admin-text">
              Древовидное меню «Фабрики → коллекции» в фильтрах
            </span>
            <span className="mt-1 block text-xs text-admin-text-muted">
              Только для витрины межкомнатных дверей: список производителей с раскрывающимися
              коллекциями над подборками в фильтрах межкомнатных. Если выключено, производитель и коллекция
              остаются в блоке «Характеристики».
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={loading || saving} onClick={() => void save()}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
        {saved ? <span className="text-xs text-brand">Сохранено</span> : null}
      </div>

      {error ? (
        <AdminNotice variant="error" className="mt-3">
          {error}
        </AdminNotice>
      ) : null}
    </AdminCard>
  );
}
