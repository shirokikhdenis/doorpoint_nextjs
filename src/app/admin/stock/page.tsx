"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminPrometStockFilters } from "@/features/admin/promet-stock/admin-promet-stock-filters";
import { AdminPrometStockMeta } from "@/features/admin/promet-stock/admin-promet-stock-meta";
import { AdminPrometStockPagination } from "@/features/admin/promet-stock/admin-promet-stock-pagination";
import { AdminPrometStockTable } from "@/features/admin/promet-stock/admin-promet-stock-table";
import {
  DEFAULT_GROUP,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  DEFAULT_WAREHOUSE,
} from "@/features/admin/promet-stock/constants";
import {
  extractGroups,
  getFilteredRows,
  getRowByProductId,
  getWarehouses,
  resolveDefaultGroup,
  resolveDefaultWarehouse,
} from "@/features/admin/promet-stock/promet-stock-utils";
import { usePrometStock } from "@/features/admin/promet-stock/use-promet-stock";
import type { SortKey } from "@/features/admin/promet-stock/types";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";

export default function AdminStockPage() {
  const { raw, loading, error, load } = usePrometStock();

  const [group, setGroup] = useState(DEFAULT_GROUP);
  const [warehouseCol, setWarehouseCol] = useState(DEFAULT_WAREHOUSE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedProductId, setExpandedProductId] = useState<string | number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const warehouses = useMemo(() => getWarehouses(raw?.columns), [raw?.columns]);
  const groups = useMemo(() => extractGroups(raw?.data), [raw?.data]);

  const filters = useMemo(
    () => ({
      group,
      warehouseCol,
      search: debouncedSearch,
      onlyInStock,
      sort,
    }),
    [group, warehouseCol, debouncedSearch, onlyInStock, sort],
  );

  const filteredRows = useMemo(() => getFilteredRows(raw?.data, filters), [raw?.data, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const detailRow = useMemo(
    () => (expandedProductId != null ? getRowByProductId(raw?.data, expandedProductId) ?? null : null),
    [raw?.data, expandedProductId],
  );

  const resetView = useCallback(() => {
    setPage(1);
    setExpandedProductId(null);
  }, []);

  const handleLoad = useCallback(async () => {
    await load();
    resetView();
    setInitialized(true);
  }, [load, resetView]);

  useEffect(() => {
    void handleLoad();
  }, [handleLoad]);

  useEffect(() => {
    if (!raw) return;
    setGroup(resolveDefaultGroup(extractGroups(raw.data), DEFAULT_GROUP));
    setWarehouseCol(resolveDefaultWarehouse(getWarehouses(raw.columns), DEFAULT_WAREHOUSE));
  }, [raw]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      resetView();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, resetView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && expandedProductId != null) {
        setExpandedProductId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expandedProductId]);

  useEffect(() => {
    if (expandedProductId != null && !detailRow) {
      setExpandedProductId(null);
    }
  }, [expandedProductId, detailRow]);

  const toggleProduct = (productId: string | number) => {
    setExpandedProductId((current) =>
      String(current) === String(productId) ? null : productId,
    );
  };

  return (
    <AdminPage
      title="Остатки товаров"
      actions={
        <Button type="button" onClick={() => void handleLoad()} disabled={loading}>
          {loading ? "Загрузка…" : "Обновить"}
        </Button>
      }
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      {!raw && loading ? (
        <AdminEmptyState title="Загрузка остатков…" />
      ) : null}

      {!raw && !loading && initialized ? (
        <AdminEmptyState title="Нет данных" description="Не удалось загрузить остатки." />
      ) : null}

      {raw ? (
        <>
          <AdminCard title="Фильтры">
            <AdminPrometStockFilters
              groups={groups}
              warehouses={warehouses}
              group={group}
              warehouseCol={warehouseCol}
              search={search}
              onlyInStock={onlyInStock}
              sort={sort}
              pageSize={pageSize}
              onGroupChange={(value) => {
                setGroup(value);
                resetView();
              }}
              onWarehouseChange={(value) => {
                setWarehouseCol(value);
                resetView();
              }}
              onSearchChange={setSearch}
              onOnlyInStockChange={(value) => {
                setOnlyInStock(value);
                resetView();
              }}
              onSortChange={(value) => {
                setSort(value);
                resetView();
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                resetView();
              }}
            />
            <AdminPrometStockMeta raw={raw} filteredCount={filteredRows.length} />
          </AdminCard>

          <AdminCard title={detailRow ? "Остатки по складам" : "Товары"}>
            {pageRows.length === 0 && !detailRow ? (
              <AdminEmptyState title="Ничего не найдено" description="Измените фильтры или поиск." />
            ) : (
              <AdminPrometStockTable
                rows={pageRows}
                warehouses={warehouses}
                warehouseCol={warehouseCol}
                expandedProductId={expandedProductId}
                onToggleProduct={toggleProduct}
                onBack={() => setExpandedProductId(null)}
                detailRow={detailRow}
              />
            )}

            {!detailRow ? (
              <AdminPrometStockPagination
                page={currentPage}
                pageSize={pageSize}
                total={filteredRows.length}
                loading={loading}
                onPrev={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setExpandedProductId(null);
                }}
                onNext={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setExpandedProductId(null);
                }}
              />
            ) : null}
          </AdminCard>
        </>
      ) : null}
    </AdminPage>
  );
}
