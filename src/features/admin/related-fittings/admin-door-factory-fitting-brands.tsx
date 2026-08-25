"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";

type MappingRow = {
  doorManufacturerName: string;
  fittingsManufacturerName: string;
};

export function AdminDoorFactoryFittingBrands() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [fittingsManufacturers, setFittingsManufacturers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/door-factory-fitting-brands");
    if (!response.ok) throw new Error(await response.text());
    const json = (await response.json()) as {
      rows?: MappingRow[];
      fittingsManufacturers?: string[];
    };
    setRows(Array.isArray(json.rows) ? json.rows : []);
    setFittingsManufacturers(
      Array.isArray(json.fittingsManufacturers) ? json.fittingsManufacturers : [],
    );
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

  const updateRow = (doorManufacturerName: string, fittingsManufacturerName: string) => {
    setRows((current) =>
      current.map((row) =>
        row.doorManufacturerName === doorManufacturerName
          ? { ...row, fittingsManufacturerName }
          : row,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/door-factory-fitting-brands", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: rows }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { message?: string }).message || "Не удалось сохранить");
      }
      if (Array.isArray((payload as { rows?: MappingRow[] }).rows)) {
        setRows((payload as { rows: MappingRow[] }).rows);
      }
      if (Array.isArray((payload as { fittingsManufacturers?: string[] }).fittingsManufacturers)) {
        setFittingsManufacturers((payload as { fittingsManufacturers: string[] }).fittingsManufacturers);
      }
      setNotice("Привязка фабрик сохранена. Блок «Выберите ручки» будет брать фурнитуру выбранной фабрики.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard
      title="Фабрика фурнитуры для межкомнатных дверей"
      description="Для каждой фабрики дверей можно указать фабрику фурнитуры. Тогда в блоке «Выберите ручки» на карточке двери показываются ручки этой фабрики. Пустое значение — случайные ручки из всего каталога, как раньше."
    >
      {notice ? (
        <AdminNotice variant="success" className="mb-3">
          {notice}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice variant="error" className="mb-3">
          {error}
        </AdminNotice>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Нет активных межкомнатных дверей с заполненным производителем.
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="space-y-4">
          {fittingsManufacturers.length === 0 ? (
            <p className="text-sm text-amber-800">
              В каталоге фурнитуры нет активных товаров с производителем — список фабрик пуст.
            </p>
          ) : null}
          <AdminTable className="border-0">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Фабрика дверей</AdminTableCell>
                <AdminTableCell header>Фабрика фурнитуры</AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {rows.map((row) => (
                <AdminTableRow key={row.doorManufacturerName}>
                  <AdminTableCell className="font-medium text-admin-text">
                    {row.doorManufacturerName}
                  </AdminTableCell>
                  <AdminTableCell>
                    <select
                      className="w-full max-w-sm rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
                      value={row.fittingsManufacturerName}
                      onChange={(event) =>
                        updateRow(row.doorManufacturerName, event.target.value)
                      }
                    >
                      <option value="">Любая (случайные ручки)</option>
                      {fittingsManufacturers.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      ) : null}
    </AdminCard>
  );
}
