"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";

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
    <AdminPage
      title="Атрибуты"
      description="Справочник характеристик без значений. Порядок фильтров в каталоге задаётся для атрибутов с фильтрацией; на отдельной витрине его можно переопределить в настройках витрины."
    >
      {notice ? <AdminNotice variant="error">{notice}</AdminNotice> : null}

      <AdminCard>
        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <AdminEmptyState title="Атрибутов нет" />
        ) : (
          <AdminTable className="border-0">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Код</AdminTableCell>
                <AdminTableCell header>Название</AdminTableCell>
                <AdminTableCell header>Тип</AdminTableCell>
                <AdminTableCell header>Область</AdminTableCell>
                <AdminTableCell header>Порядок в фильтрах</AdminTableCell>
                <AdminTableCell header>На карточке товара</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {items.map((row) => {
                const showCheckbox = row.scope === "product";
                const checked = row.isVisibleOnProduct !== false;
                const isFilterable = row.isFilterable !== false;
                const filterIndex = filterableItems.findIndex((item) => item.id === row.id);
                const busy = savingId === row.id;
                return (
                  <AdminTableRow key={row.id}>
                    <AdminTableCell className="font-mono text-xs">{row.code}</AdminTableCell>
                    <AdminTableCell>{row.name}</AdminTableCell>
                    <AdminTableCell className="text-zinc-600">{row.type}</AdminTableCell>
                    <AdminTableCell className="text-zinc-600">{scopeLabel(row.scope)}</AdminTableCell>
                    <AdminTableCell>
                      {isFilterable ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy || filterIndex <= 0}
                            onClick={() => void moveFilterOrder(row, -1)}
                            title="Выше в каталоге"
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              busy || filterIndex < 0 || filterIndex >= filterableItems.length - 1
                            }
                            onClick={() => void moveFilterOrder(row, 1)}
                            title="Ниже в каталоге"
                          >
                            ↓
                          </Button>
                          {busy ? <span className="ml-1 text-xs text-zinc-500">…</span> : null}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
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
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>
    </AdminPage>
  );
}
