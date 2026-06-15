"use client";

import { Suspense, useCallback, useState } from "react";
import { emptyCatalogMeta } from "@/features/catalog/catalog-constants";
import { CatalogFilterSidebar } from "@/features/catalog/catalog-filter-sidebar";
import { CatalogProductGrid } from "@/features/catalog/catalog-product-grid";
import { saveCatalogScrollPayload } from "@/features/catalog/catalog-scroll-storage";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";
import { useCatalogProducts } from "@/features/catalog/use-catalog-products";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import type { CatalogMeta } from "@/lib/client/normalizers";

function CatalogPageContent() {
  const [meta, setMeta] = useState<CatalogMeta>(emptyCatalogMeta);
  const filters = useCatalogFilters(meta);

  const { products, total, page, setPage, loading, loadingMore, error } = useCatalogProducts({
    catalogPage: filters.catalogPage,
    setCatalogPage: filters.setCatalogPage,
    query: filters.query,
    setAttrSelections: filters.setAttrSelections,
    setAttrRanges: filters.setAttrRanges,
    setMeta,
  });

  const rememberScrollForProduct = useCallback(() => {
    saveCatalogScrollPayload(filters.catalogPage, page, filters.filterState);
  }, [filters.catalogPage, filters.filterState, page]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <div className="flex w-full flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <aside
            className={`${filters.isMobileFiltersOpen ? "block" : "hidden"} w-full shrink-0 rounded-lg border border-zinc-200 bg-white p-4 lg:sticky lg:top-[var(--storefront-sticky-offset)] lg:flex lg:max-h-[calc(100vh-var(--storefront-sticky-offset)-2rem)] lg:w-72 lg:flex-col lg:rounded-none lg:border-0 lg:border-r lg:border-zinc-200 lg:bg-transparent lg:p-0 lg:pr-6`}
          >
            <CatalogFilterSidebar
              meta={meta}
              searchInput={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              sort={filters.sort}
              onSortChange={filters.setSort}
              categories={filters.categories}
              subcategories={filters.subcategories}
              attrSelections={filters.attrSelections}
              attrRanges={filters.attrRanges}
              priceRange={filters.priceRange}
              hasActiveFilters={filters.hasActiveFilters}
              isFilterSectionCollapsed={filters.isFilterSectionCollapsed}
              onToggleFilterSection={filters.toggleFilterSection}
              onClearAllFilters={filters.clearAllFilters}
              onToggleCategory={(slug) =>
                filters.toggle(slug, filters.categories, filters.setCategories)
              }
              onToggleSubcategory={(slug) =>
                filters.toggle(slug, filters.subcategories, filters.setSubcategories)
              }
              onToggleAttrValue={filters.toggleAttrValue}
              onUpdatePriceRange={filters.updatePriceRange}
              onUpdateAttrRange={filters.updateAttrRange}
              onLabelClick={filters.handleLabelClick}
            />
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800"
                onClick={() => filters.setIsMobileFiltersOpen((current) => !current)}
              >
                {filters.isMobileFiltersOpen ? "Скрыть фильтры" : "Показать фильтры"}
              </button>
              <span className="text-xs text-zinc-500">
                {products.length > 0 ? `${products.length} из ${total}` : "Подберите параметры"}
              </span>
            </div>

            <section className="space-y-4">
              <CatalogProductGrid
                products={products}
                total={total}
                loading={loading}
                loadingMore={loadingMore}
                error={error}
                onLoadMore={() => setPage((current) => current + 1)}
                onRememberScroll={rememberScrollForProduct}
              />
            </section>
          </div>
        </div>
      </main>
      <MeasureLeadForm />
    </>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-zinc-500 sm:px-6 lg:px-8">
          Загрузка каталога…
        </main>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
