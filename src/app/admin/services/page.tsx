"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminInputField } from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";

type ServiceRow = {
  id: number;
  name: string;
  price: string;
  sortOrder: number;
};

type ServiceSection = {
  id: number;
  title: string;
  sortOrder: number;
  rows: ServiceRow[];
};

const emptyRowDraft = () => ({ name: "", price: "" });

export default function AdminServicesPage() {
  const [sections, setSections] = useState<ServiceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionDraft, setSectionDraft] = useState({ title: "", sortOrder: 0 });
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null);

  const [newRowDrafts, setNewRowDrafts] = useState<Record<number, ReturnType<typeof emptyRowDraft>>>(
    {},
  );
  const [addingRowSectionId, setAddingRowSectionId] = useState<number | null>(null);

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState(emptyRowDraft());
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [reorderingSectionId, setReorderingSectionId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/services");
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Не удалось загрузить услуги");
    }
    const json = (await response.json()) as { sections?: ServiceSection[] };
    setSections(Array.isArray(json.sections) ? json.sections : []);
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

  const getNewRowDraft = (sectionId: number) =>
    newRowDrafts[sectionId] ?? emptyRowDraft();

  const setNewRowDraft = (sectionId: number, patch: Partial<ReturnType<typeof emptyRowDraft>>) => {
    setNewRowDrafts((prev) => ({
      ...prev,
      [sectionId]: { ...getNewRowDraft(sectionId), ...patch },
    }));
  };

  const handleCreateSection = async (event: FormEvent) => {
    event.preventDefault();
    setCreatingSection(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newSectionTitle,
          sortOrder: (sections.length + 1) * 10,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось создать раздел");
      }
      setNewSectionTitle("");
      await reload();
      setNotice("Раздел добавлен");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreatingSection(false);
    }
  };

  const saveSection = async (sectionId: number) => {
    setSavingSectionId(sectionId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/${sectionId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sectionDraft),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить раздел");
      }
      setEditingSectionId(null);
      await reload();
      setNotice("Раздел сохранён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingSectionId(null);
    }
  };

  const deleteSection = async (sectionId: number) => {
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/${sectionId}`, { method: "DELETE" });
      if (response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось удалить раздел");
      }
      await reload();
      setNotice("Раздел удалён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const addRow = async (sectionId: number) => {
    const draft = getNewRowDraft(sectionId);
    setAddingRowSectionId(sectionId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/${sectionId}/rows`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось добавить строку");
      }
      setNewRowDrafts((prev) => ({ ...prev, [sectionId]: emptyRowDraft() }));
      await reload();
      setNotice("Строка добавлена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setAddingRowSectionId(null);
    }
  };

  const saveRow = async (rowId: number) => {
    setSavingRowId(rowId);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/rows/${rowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rowDraft),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось сохранить строку");
      }
      setEditingRowId(null);
      await reload();
      setNotice("Строка сохранена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingRowId(null);
    }
  };

  const deleteRow = async (rowId: number) => {
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/rows/${rowId}`, { method: "DELETE" });
      if (response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось удалить строку");
      }
      await reload();
      setNotice("Строка удалена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  const moveRow = async (section: ServiceSection, rowId: number, direction: -1 | 1) => {
    const index = section.rows.findIndex((row) => row.id === rowId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= section.rows.length) return;

    const orderedIds = section.rows.map((row) => row.id);
    [orderedIds[index], orderedIds[swapIndex]] = [orderedIds[swapIndex], orderedIds[index]];

    setReorderingSectionId(section.id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/services/${section.id}/rows/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Не удалось изменить порядок");
      }
      await reload();
      setNotice("Порядок обновлён");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setReorderingSectionId(null);
    }
  };

  return (
    <AdminPage
      title="Услуги"
      description="Прайс на странице «Доставка и монтаж». Изменения сразу видны на сайте."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/uslugi" target="_blank" rel="noopener noreferrer">
            Открыть на сайте
          </Link>
        </Button>
      }
    >
      {notice ? (
        <AdminNotice variant="success" onDismiss={() => setNotice("")}>
          {notice}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice variant="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}

      <AdminCard title="Новый раздел">
        <form onSubmit={handleCreateSection} className="flex flex-wrap items-end gap-3">
          <AdminInputField
            id="new-section-title"
            label="Название раздела"
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            placeholder="Например: Доставка"
            className="min-w-[240px] flex-1"
            required
          />
          <Button type="submit" disabled={creatingSection}>
            {creatingSection ? "Добавление…" : "Добавить раздел"}
          </Button>
        </form>
      </AdminCard>

      {loading ? (
        <p className="text-sm text-admin-text-muted">Загрузка…</p>
      ) : sections.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-admin-text-muted">Разделов пока нет.</p>
        </AdminCard>
      ) : (
        sections.map((section) => {
          const isEditingSection = editingSectionId === section.id;
          const newRow = getNewRowDraft(section.id);

          return (
            <AdminCard
              key={section.id}
              title={isEditingSection ? "Редактирование раздела" : section.title}
              description={isEditingSection ? undefined : `Порядок: ${section.sortOrder}`}
            >
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                {isEditingSection ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingSectionId === section.id}
                      onClick={() => void saveSection(section.id)}
                    >
                      {savingSectionId === section.id ? "Сохранение…" : "Сохранить"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSectionId(null)}
                    >
                      Отмена
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setSectionDraft({ title: section.title, sortOrder: section.sortOrder });
                      }}
                    >
                      Изменить раздел
                    </Button>
                    <AdminConfirmButton
                      confirmMessage={`Удалить раздел «${section.title}» и все строки прайса?`}
                      onConfirm={() => deleteSection(section.id)}
                    >
                      Удалить раздел
                    </AdminConfirmButton>
                  </>
                )}
              </div>
              {isEditingSection ? (
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <AdminInputField
                    id={`section-title-${section.id}`}
                    label="Название"
                    value={sectionDraft.title}
                    onChange={(event) =>
                      setSectionDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                    required
                  />
                  <AdminInputField
                    id={`section-sort-${section.id}`}
                    label="Порядок"
                    type="number"
                    value={sectionDraft.sortOrder}
                    onChange={(event) =>
                      setSectionDraft((prev) => ({
                        ...prev,
                        sortOrder: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ) : null}

              <AdminTable className="border-0">
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableCell header>Услуга</AdminTableCell>
                    <AdminTableCell header>Цена</AdminTableCell>
                    <AdminTableCell header className="w-[100px]">
                      Порядок
                    </AdminTableCell>
                    <AdminTableCell header className="w-[140px]">
                      Действия
                    </AdminTableCell>
                  </AdminTableRow>
                </AdminTableHead>
                <AdminTableBody>
                  {section.rows.map((row, rowIndex) => {
                    const isEditingRow = editingRowId === row.id;
                    const reorderBusy = reorderingSectionId === section.id;
                    if (isEditingRow) {
                      return (
                        <AdminTableRow key={row.id}>
                          <AdminTableCell>
                            <input
                              value={rowDraft.name}
                              onChange={(event) =>
                                setRowDraft((prev) => ({ ...prev, name: event.target.value }))
                              }
                              className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                            />
                          </AdminTableCell>
                          <AdminTableCell>
                            <input
                              value={rowDraft.price}
                              onChange={(event) =>
                                setRowDraft((prev) => ({ ...prev, price: event.target.value }))
                              }
                              className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                            />
                          </AdminTableCell>
                          <AdminTableCell />
                          <AdminTableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingRowId === row.id}
                                onClick={() => void saveRow(row.id)}
                              >
                                OK
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingRowId(null)}
                              >
                                ×
                              </Button>
                            </div>
                          </AdminTableCell>
                        </AdminTableRow>
                      );
                    }

                    return (
                      <AdminTableRow key={row.id}>
                        <AdminTableCell>{row.name}</AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap font-medium">
                          {row.price}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={reorderBusy || rowIndex <= 0}
                              onClick={() => void moveRow(section, row.id, -1)}
                              title="Выше"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={reorderBusy || rowIndex >= section.rows.length - 1}
                              onClick={() => void moveRow(section, row.id, 1)}
                              title="Ниже"
                            >
                              ↓
                            </Button>
                            {reorderBusy ? <span className="text-xs text-admin-text-muted">…</span> : null}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRowId(row.id);
                                setRowDraft({
                                  name: row.name,
                                  price: row.price,
                                });
                              }}
                            >
                              Изменить
                            </Button>
                            <AdminConfirmButton
                              confirmMessage="Удалить эту строку?"
                              onConfirm={() => deleteRow(row.id)}
                            >
                              Удалить
                            </AdminConfirmButton>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                  <AdminTableRow>
                    <AdminTableCell>
                      <input
                        value={newRow.name}
                        onChange={(event) =>
                          setNewRowDraft(section.id, { name: event.target.value })
                        }
                        placeholder="Новая услуга"
                        className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                      />
                    </AdminTableCell>
                    <AdminTableCell>
                      <input
                        value={newRow.price}
                        onChange={(event) =>
                          setNewRowDraft(section.id, { price: event.target.value })
                        }
                        placeholder="от 1 000 ₽"
                        className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                      />
                    </AdminTableCell>
                    <AdminTableCell />
                    <AdminTableCell>
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingRowSectionId === section.id || !newRow.name.trim()}
                        onClick={() => void addRow(section.id)}
                      >
                        {addingRowSectionId === section.id ? "…" : "Добавить"}
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>
                </AdminTableBody>
              </AdminTable>
            </AdminCard>
          );
        })
      )}
    </AdminPage>
  );
}
