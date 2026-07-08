"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { Button } from "@/components/ui/button";

type ModuleSettings = {
  manufacturerName: string;
  finishPickerEnabled: boolean;
  hardwareServicesEnabled: boolean;
  glassOptionsEnabled: boolean;
};

export function DoorFinishesModulesTab() {
  const [manufacturer, setManufacturer] = useState("Аэлита");
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [settings, setSettings] = useState<ModuleSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadModules = useCallback(async (nextManufacturer: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextManufacturer) params.set("manufacturer", nextManufacturer);
      const response = await fetch(`/api/admin/door-manufacturer-modules?${params.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      const json = (await response.json()) as {
        manufacturers: string[];
        settings: ModuleSettings | null;
        selectedManufacturer: string;
      };
      setManufacturers(json.manufacturers);
      if (json.settings) {
        setSettings(json.settings);
      } else if (nextManufacturer) {
        setSettings({
          manufacturerName: nextManufacturer,
          finishPickerEnabled: true,
          hardwareServicesEnabled: false,
          glassOptionsEnabled: false,
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules(manufacturer);
  }, [manufacturer, loadModules]);

  const saveSettings = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-manufacturer-modules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manufacturerName: settings.manufacturerName,
          finishPickerEnabled: settings.finishPickerEnabled,
          hardwareServicesEnabled: settings.hardwareServicesEnabled,
          glassOptionsEnabled: settings.glassOptionsEnabled,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      }
      if ((payload as { settings?: ModuleSettings }).settings) {
        setSettings((payload as { settings: ModuleSettings }).settings);
      }
      setNotice("Настройки модулей сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title="Модули на карточке товара" className="p-4">
        <label className="mb-4 flex flex-col gap-1 text-xs text-zinc-600">
          Производитель
          <select
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            className="max-w-xs rounded border border-zinc-200 px-3 py-2 text-sm"
          >
            {manufacturers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}

        {settings ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={settings.finishPickerEnabled}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, finishPickerEnabled: event.target.checked }
                      : current,
                  )
                }
              />
              Покрытия (finish picker)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={settings.hardwareServicesEnabled}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, hardwareServicesEnabled: event.target.checked }
                      : current,
                  )
                }
              />
              Врезка фурнитуры (чекбоксы)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={settings.glassOptionsEnabled}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, glassOptionsEnabled: event.target.checked } : current,
                  )
                }
              />
              Стекло (chips с надбавкой; скрывает навигацию glassVariants)
            </label>
            <Button type="button" onClick={() => void saveSettings()} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}
