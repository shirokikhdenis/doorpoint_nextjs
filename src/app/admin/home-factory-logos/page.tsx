"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";

type LogoRow = {
  manufacturerName: string;
  sortOrder: number;
  isVisible: boolean;
  logoUrl: string;
};

const moveItem = (items: LogoRow[], index: number, direction: -1 | 1): LogoRow[] => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next.map((item, sortOrder) => ({ ...item, sortOrder }));
};

export default function AdminHomeFactoryLogosPage() {
  const [items, setItems] = useState<LogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/home-factory-logos");
    if (!response.ok) throw new Error(await response.text());
    const json = (await response.json()) as { items?: LogoRow[] };
    setItems(Array.isArray(json.items) ? json.items : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await reload();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const toggleVisible = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isVisible: !item.isVisible } : item)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/home-factory-logos", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Не удалось сохранить");
      await reload();
      setNotice("Настройки логотипов на главной сохранены");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = items.filter((item) => item.isVisible).length;

  return (
    <AdminPage
      title="Логотипы фабрик на главной"
      description="Выберите, какие логотипы показывать в блоке «Работаем с ведущими фабриками», и задайте порядок."
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      <AdminCard title={`Фабрики с логотипом (${visibleCount} на главной)`}>
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Нет фабрик с загруженным логотипом. Добавьте логотипы в разделе «Фабрики».
          </p>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-zinc-100">
              {items.map((item, index) => (
                <li
                  key={item.manufacturerName}
                  className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => setItems((prev) => moveItem(prev, index, -1))}
                      className="rounded border border-zinc-200 px-2 py-1 text-sm disabled:opacity-40"
                      aria-label="Выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => setItems((prev) => moveItem(prev, index, 1))}
                      className="rounded border border-zinc-200 px-2 py-1 text-sm disabled:opacity-40"
                      aria-label="Ниже"
                    >
                      ↓
                    </button>
                  </div>

                  <span className="relative flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-white p-1">
                    {item.logoUrl ? (
                      <Image
                        src={item.logoUrl}
                        alt=""
                        fill
                        className="object-contain p-1"
                        sizes="96px"
                      />
                    ) : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{item.manufacturerName}</p>
                    <p className="text-xs text-zinc-500">Позиция: {index + 1}</p>
                  </div>

                  <label className="flex shrink-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.isVisible}
                      onChange={() => toggleVisible(index)}
                    />
                    На главной
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}
