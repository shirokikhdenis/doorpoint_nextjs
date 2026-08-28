"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminDveriCatalogFilters } from "@/features/admin/dveri-catalog/admin-dveri-catalog-filters";
import { AdminDveriCatalogMeta } from "@/features/admin/dveri-catalog/admin-dveri-catalog-meta";
import { AdminDveriCatalogPagination } from "@/features/admin/dveri-catalog/admin-dveri-catalog-pagination";
import { AdminDveriCatalogPricingSettings } from "@/features/admin/dveri-catalog/admin-dveri-catalog-pricing-settings";
import { AdminDveriCatalogPriceReconcile } from "@/features/admin/dveri-catalog/admin-dveri-catalog-price-reconcile";
import { AdminDveriCatalogTable } from "@/features/admin/dveri-catalog/admin-dveri-catalog-table";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
} from "@/features/admin/dveri-catalog/constants";
import {
  getFilteredProducts,
  getProductById,
} from "@/features/admin/dveri-catalog/dveri-catalog-utils";
import { useDveriCatalog } from "@/features/admin/dveri-catalog/use-dveri-catalog";
import { useDveriPricingRules } from "@/features/admin/dveri-catalog/use-dveri-pricing-rules";
import type { DveriSortKey } from "@/features/admin/dveri-catalog/types";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";

export default function AdminDveriCatalogPage() {
  const { raw, loading, error, load } = useDveriCatalog();
  const {
    rules: pricingRules,
    ready: pricingRulesReady,
    setDefaultRule,
    setCategoryRule,
    addCategoryRule,
    removeCategoryRule,
  } = useDveriPricingRules();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [trademarkId, setTrademarkId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<DveriSortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedProductId, setExpandedProductId] = useState<number | string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const filters = useMemo(
    () => ({
      categoryId,
      trademarkId,
      search: debouncedSearch,
      sort,
    }),
    [categoryId, trademarkId, debouncedSearch, sort],
  );

  const filteredProducts = useMemo(
    () => getFilteredProducts(raw?.products, filters),
    [raw?.products, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const detailProduct = useMemo(
    () => (expandedProductId != null ? getProductById(raw?.products, expandedProductId) : null),
    [raw?.products, expandedProductId],
  );

  const resetView = useCallback(() => {
    setPage(1);
    setExpandedProductId(null);
  }, []);

  const handleLoad = useCallback(
    async (refresh = false) => {
      await load(refresh);
      resetView();
      setInitialized(true);
    },
    [load, resetView],
  );

  useEffect(() => {
    void handleLoad();
  }, [handleLoad]);

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
    if (expandedProductId != null && !detailProduct) {
      setExpandedProductId(null);
    }
  }, [expandedProductId, detailProduct]);

  const toggleProduct = (productId: number | string) => {
    setExpandedProductId((current) => (String(current) === String(productId) ? null : productId));
  };

  return (
    <AdminPage
      title="Dveri.com — каталог"
      description="Москва"
      actions={
        <Button type="button" onClick={() => void handleLoad(true)} disabled={loading}>
          {loading ? "Загрузка…" : "Обновить"}
        </Button>
      }
    >
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      {!raw && loading ? <AdminEmptyState title="Загрузка каталога…" /> : null}

      {!raw && !loading && initialized ? (
        <AdminEmptyState title="Нет данных" description="Не удалось загрузить каталог dveri.com." />
      ) : null}

      {raw ? (
        <>
          <AdminCard title="Фильтры">
            <AdminDveriCatalogFilters
              categories={raw.categories}
              trademarks={raw.trademarks}
              categoryId={categoryId}
              trademarkId={trademarkId}
              search={search}
              sort={sort}
              pageSize={pageSize}
              onCategoryChange={(value) => {
                setCategoryId(value);
                resetView();
              }}
              onTrademarkChange={(value) => {
                setTrademarkId(value);
                resetView();
              }}
              onSearchChange={setSearch}
              onSortChange={(value) => {
                setSort(value);
                resetView();
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                resetView();
              }}
            />
            <AdminDveriCatalogMeta raw={raw} filteredCount={filteredProducts.length} />
          </AdminCard>

          <AdminDveriCatalogPricingSettings
            categories={raw.categories}
            rules={pricingRules}
            ready={pricingRulesReady}
            onDefaultRuleChange={setDefaultRule}
            onCategoryRuleChange={setCategoryRule}
            onAddCategoryRule={addCategoryRule}
            onRemoveCategoryRule={removeCategoryRule}
          />

          <AdminCard title="Сверка цен">
            <AdminDveriCatalogPriceReconcile
              categories={raw.categories}
              products={raw.products}
              pricingRules={pricingRules}
              pricingRulesReady={pricingRulesReady}
              storefrontPrices={raw.storefrontPrices}
            />
          </AdminCard>

          <AdminCard title={detailProduct ? "Варианты размеров" : "Товары"}>
            {pageRows.length === 0 && !detailProduct ? (
              <AdminEmptyState title="Ничего не найдено" description="Измените фильтры или поиск." />
            ) : (
              <AdminDveriCatalogTable
                rows={pageRows}
                categories={raw.categories}
                pricingRules={pricingRules}
                storefrontPrices={raw.storefrontPrices}
                expandedProductId={expandedProductId}
                onToggleProduct={toggleProduct}
                onBack={() => setExpandedProductId(null)}
                detailProduct={detailProduct}
              />
            )}

            {!detailProduct ? (
              <AdminDveriCatalogPagination
                page={currentPage}
                pageSize={pageSize}
                total={filteredProducts.length}
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
