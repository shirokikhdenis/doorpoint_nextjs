"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AttributeRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  scope: "product" | "variant";
  sortOrder: number;
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

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 underline">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Атрибуты</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Справочник характеристик без значений. Для атрибутов уровня «товар» можно отключить
            показ в блоке характеристик на карточке товара в витрине.
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Область</th>
                <th className="px-4 py-3 font-medium">На карточке товара</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((row) => {
                const showCheckbox = row.scope === "product";
                const checked = row.isVisibleOnProduct !== false;
                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-800">{row.code}</td>
                    <td className="px-4 py-2.5 text-zinc-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{row.type}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{scopeLabel(row.scope)}</td>
                    <td className="px-4 py-2.5">
                      {showCheckbox ? (
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={checked}
                            disabled={savingId === row.id}
                            onChange={(e) => setVisibleOnCard(row, e.target.checked)}
                          />
                          <span className="text-zinc-700">
                            {savingId === row.id ? "Сохранение…" : "Показывать"}
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
