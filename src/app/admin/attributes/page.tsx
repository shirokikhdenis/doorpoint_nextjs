"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AttributeRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  scope: "product" | "variant";
  sortOrder: number;
  isFilterable?: boolean;
  isVisibleOnProduct?: boolean;
};

const scopeLabel = (scope: string) =>
  scope === "variant" ? "Вариант (SKU)" : "Товар (модель)";

export default function AdminAttributesPage() {
  const [items, setItems] = useState<AttributeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/attributes");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AttributeRow[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Ошибка загрузки");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterableItems = useMemo(
    () => items.filter((row) => row.isFilterable !== false),
    [items],
  );

  const setVisibleOnCard = async (row: AttributeRow, checked: boolean) => {
    if (row.scope !== "product") return;
    setSavingId(row.id);
    setNotice("");
    try {
      const res = await fetch(`/api/admin/attributes/${row.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVisibleOnProduct: checked }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) =>
        prev.map((a) =>
          a.id === row.id ? { ...a, isVisibleOnProduct: checked } : a,
        ),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingId(null);
    }
  };

  const moveFilterOrder = async (row: AttributeRow, direction: -1 | 1) => {
    const index = filterableItems.findIndex((item) => item.id === row.id);
    if (index < 0) return;
    const swapWith = filterableItems[index + direction];
    if (!swapWith) return;

    setSavingId(row.id);
    setNotice("");
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/admin/attributes/${row.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sortOrder: swapWith.sortOrder }),
        }),
        fetch(`/api/admin/attributes/${swapWith.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sortOrder: row.sortOrder }),
        }),
      ]);
      if (!resA.ok) throw new Error(await resA.text());
      if (!resB.ok) throw new Error(await resB.text());
      setItems((prev) =>
        prev
          .map((item) => {
            if (item.id === row.id) return { ...item, sortOrder: swapWith.sortOrder };
            if (item.id === swapWith.id) return { ...item, sortOrder: row.sortOrder };
            return item;
          })
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Не удалось изменить порядок");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 underline">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Атрибуты</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Справочник характеристик без значений. Порядок фильтров в каталоге задаётся для
            атрибутов с фильтрацией; на отдельной витрине его можно переопределить в настройках
            витрины.
          </p>
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-zinc-600">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-zinc-600">Атрибутов нет.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Область</th>
                <th className="px-4 py-3 font-medium">Порядок в фильтрах</th>
                <th className="px-4 py-3 font-medium">На карточке товара</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((row) => {
                const showCheckbox = row.scope === "product";
                const checked = row.isVisibleOnProduct !== false;
                const isFilterable = row.isFilterable !== false;
                const filterIndex = filterableItems.findIndex((item) => item.id === row.id);
                const busy = savingId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-800">{row.code}</td>
                    <td className="px-4 py-2.5 text-zinc-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{row.type}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{scopeLabel(row.scope)}</td>
                    <td className="px-4 py-2.5">
                      {isFilterable ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy || filterIndex <= 0}
                            onClick={() => void moveFilterOrder(row, -1)}
                            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Выше в каталоге"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={busy || filterIndex < 0 || filterIndex >= filterableItems.length - 1}
                            onClick={() => void moveFilterOrder(row, 1)}
                            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Ниже в каталоге"
                          >
                            ↓
                          </button>
                          {busy ? (
                            <span className="ml-1 text-xs text-zinc-500">…</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {showCheckbox ? (
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={checked}
                            disabled={busy}
                            onChange={(e) => setVisibleOnCard(row, e.target.checked)}
                          />
                          <span className="text-zinc-700">
                            {busy ? "Сохранение…" : "Показывать"}
                          </span>
                        </label>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
