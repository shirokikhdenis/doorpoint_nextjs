"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminExhibitionFilters } from "@/features/admin/exhibition/admin-exhibition-filters";
import { AdminExhibitionForm } from "@/features/admin/exhibition/admin-exhibition-form";
import { AdminExhibitionPagination } from "@/features/admin/exhibition/admin-exhibition-pagination";
import { AdminExhibitionPriceTagBar } from "@/features/admin/exhibition/admin-exhibition-price-tag-bar";
import { AdminExhibitionTable } from "@/features/admin/exhibition/admin-exhibition-table";
import {
  DEFAULT_GROUP_BY,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
} from "@/features/admin/exhibition/constants";
import {
  buildGroupedSections,
  countRows,
  flattenSections,
  paginateSections,
} from "@/features/admin/exhibition/exhibition-utils";
import { useExhibition } from "@/features/admin/exhibition/use-exhibition";
import {
  downloadExhibitionPriceTag,
  downloadExhibitionPriceTags,
} from "@/lib/client/admin-exhibition-price-tag";
import type {
  ExhibitionDoorRow,
  ExhibitionFormState,
  GroupByKey,
  SortKey,
} from "@/features/admin/exhibition/types";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";

export default function AdminExhibitionPage() {
  const { items, manufacturers, meta, loading, error, load, createItem, updateItem, deleteItem } =
    useExhibition();

  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<ExhibitionDoorRow | null>(null);

  const [categoryType, setCategoryType] = useState<"" | "entry" | "interior">("");
  const [manufacturer, setManufacturer] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [groupBy, setGroupBy] = useState<GroupByKey>(DEFAULT_GROUP_BY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [downloadingPriceTags, setDownloadingPriceTags] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const filters = useMemo(
    () => ({
      categoryType,
      manufacturer,
      groupFilter,
      search: debouncedSearch,
      sort,
      groupBy,
    }),
    [categoryType, manufacturer, groupFilter, debouncedSearch, sort, groupBy],
  );

  const allSections = useMemo(
    () => buildGroupedSections(items, filters, meta ?? undefined),
    [items, filters, meta],
  );
  const totalRows = useMemo(() => countRows(allSections), [allSections]);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSections = useMemo(
    () => paginateSections(allSections, currentPage, pageSize),
    [allSections, currentPage, pageSize],
  );
  const pageRows = useMemo(() => flattenSections(pageSections), [pageSections]);
  const pageInteriorIds = useMemo(
    () => pageRows.filter((row) => row.categoryType === "interior").map((row) => row.id),
    [pageRows],
  );
  const selectedInteriorIds = useMemo(
    () => [...selectedIds].filter((id) => items.some((row) => row.id === id && row.categoryType === "interior")),
    [selectedIds, items],
  );
  const allPageInteriorSelected =
    pageInteriorIds.length > 0 && pageInteriorIds.every((id) => selectedIds.has(id));

  const resetView = useCallback(() => {
    setPage(1);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      resetView();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, resetView]);

  const handleOpenCreate = () => {
    setEditingRow(null);
    setShowForm(true);
    setActionError("");
    setNotice("");
  };

  const handleEdit = (row: ExhibitionDoorRow) => {
    setEditingRow(row);
    setShowForm(true);
    setActionError("");
    setNotice("");
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingRow(null);
    setActionError("");
  };

  const handleSubmit = async (form: ExhibitionFormState) => {
    setSaving(true);
    setActionError("");
    setNotice("");
    try {
      if (editingRow) {
        await updateItem(editingRow.id, form);
        setNotice("Запись обновлена");
      } else {
        await createItem(form);
        setNotice("Дверь добавлена на выставку");
      }
      await load();
      setShowForm(false);
      setEditingRow(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ExhibitionDoorRow) => {
    setSaving(true);
    setActionError("");
    setNotice("");
    try {
      await deleteItem(row.id);
      setNotice("Запись удалена");
      await load();
      setShowForm(false);
      setEditingRow(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFromTable = async (row: ExhibitionDoorRow) => {
    if (!window.confirm("Удалить запись с выставки?")) return;
    await handleDelete(row);
    setSelectedIds((prev) => {
      if (!prev.has(row.id)) return prev;
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  };

  const handleToggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTogglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageInteriorSelected) {
        for (const id of pageInteriorIds) next.delete(id);
      } else {
        for (const id of pageInteriorIds) next.add(id);
      }
      return next;
    });
  };

  const handleDownloadPriceTag = async (row: ExhibitionDoorRow) => {
    setDownloadingId(row.id);
    setActionError("");
    setNotice("");
    try {
      await downloadExhibitionPriceTag(row.id);
      setNotice("Ценник скачан");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Ошибка формирования ценника");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSelectedPriceTags = async () => {
    if (selectedInteriorIds.length === 0) return;
    setDownloadingPriceTags(true);
    setActionError("");
    setNotice("");
    try {
      await downloadExhibitionPriceTags(selectedInteriorIds);
      setNotice(`Скачано ценников: ${selectedInteriorIds.length}`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Ошибка формирования ценников");
    } finally {
      setDownloadingPriceTags(false);
    }
  };

  return (
    <AdminPage
      title="Учёт выставки"
      description="Список дверей, представленных на выставке салона."
      actions={
        <Button type="button" onClick={handleOpenCreate} disabled={loading}>
          Добавить дверь
        </Button>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
      {actionError ? <AdminNotice variant="error">{actionError}</AdminNotice> : null}

      {showForm ? (
        <AdminCard title={editingRow ? "Редактирование" : "Новая дверь на выставке"}>
          <AdminExhibitionForm
            meta={meta}
            manufacturers={manufacturers}
            editingRow={editingRow}
            saving={saving}
            onCancel={handleCancelForm}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        </AdminCard>
      ) : null}

      <AdminCard title="Двери на выставке">
        <div className="space-y-4">
          <AdminExhibitionFilters
            items={items}
            manufacturers={manufacturers}
            meta={meta}
            categoryType={categoryType}
            manufacturer={manufacturer}
            groupFilter={groupFilter}
            search={search}
            sort={sort}
            groupBy={groupBy}
            pageSize={pageSize}
            onCategoryTypeChange={(value) => {
              setCategoryType(value);
              resetView();
            }}
            onManufacturerChange={(value) => {
              setManufacturer(value);
              resetView();
            }}
            onGroupFilterChange={(value) => {
              setGroupFilter(value);
              resetView();
            }}
            onSearchChange={setSearch}
            onSortChange={(value) => {
              setSort(value);
              resetView();
            }}
            onGroupByChange={(value) => {
              setGroupBy(value);
              setGroupFilter("");
              resetView();
            }}
            onPageSizeChange={(value) => {
              setPageSize(value);
              resetView();
            }}
          />

          <AdminExhibitionPriceTagBar
            selectedCount={selectedInteriorIds.length}
            loading={downloadingPriceTags}
            onDownload={() => void handleDownloadSelectedPriceTags()}
            onClearSelection={() => setSelectedIds(new Set())}
          />

          {loading ? (
            <AdminEmptyState title="Загрузка…" />
          ) : totalRows === 0 ? (
            <AdminEmptyState
              title="Пока нет дверей на выставке"
              description="Добавьте первую дверь, чтобы начать учёт."
            />
          ) : (
            <>
              <AdminExhibitionTable
                sections={pageSections}
                meta={meta}
                showGroupHeaders={groupBy !== "none"}
                selectedIds={selectedIds}
                pageInteriorIds={pageInteriorIds}
                allPageInteriorSelected={allPageInteriorSelected}
                downloadingId={downloadingId}
                onToggleRow={handleToggleRow}
                onTogglePageSelection={handleTogglePageSelection}
                onEdit={handleEdit}
                onDelete={handleDeleteFromTable}
                onDownloadPriceTag={(row) => void handleDownloadPriceTag(row)}
              />
              <AdminExhibitionPagination
                page={currentPage}
                pageSize={pageSize}
                total={totalRows}
                loading={loading}
                onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              />
            </>
          )}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
