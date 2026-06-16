"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminProductsSaleRules } from "@/features/admin/products/admin-products-sale-rules";
import { AdminProductsFilters } from "@/features/admin/products/admin-products-filters";
import { AdminProductsPagination } from "@/features/admin/products/admin-products-pagination";
import { AdminProductsTable } from "@/features/admin/products/admin-products-table";
import { AdminProductsToolbar } from "@/features/admin/products/admin-products-toolbar";
import { runBulkProductAction } from "@/features/admin/products/bulk-actions";
import { loadColumnVisibility, saveColumnVisibility } from "@/features/admin/products/column-visibility";
import { useAdminProductsData } from "@/features/admin/products/use-admin-products-data";
import type { BulkAction, ColumnVisibility, HitFilter, SaleFilter, SaleSettings } from "@/features/admin/products/types";

export default function AdminProductsPage() {
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [subcategoryId, setSubcategoryId] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  const [manufacturer, setManufacturer] = useState("");
  const [appliedManufacturer, setAppliedManufacturer] = useState("");
  const [attrCode, setAttrCode] = useState("");
  const [attrValue, setAttrValue] = useState("");
  const [appliedAttrCode, setAppliedAttrCode] = useState("");
  const [appliedAttrValue, setAppliedAttrValue] = useState("");
  const [attrValueOptions, setAttrValueOptions] = useState<string[]>([]);
  const [attrValueOptionsLoading, setAttrValueOptionsLoading] = useState(false);
  const [hitFilter, setHitFilter] = useState<HitFilter>("");
  const [saleFilter, setSaleFilter] = useState<SaleFilter>("");

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => loadColumnVisibility());
  const [compact, setCompact] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saleSettings, setSaleSettings] = useState<SaleSettings>({
    mode: "minus_percent",
    percent: 10,
  });
  const [saleRuleDescription, setSaleRuleDescription] = useState("");

  const { data, loading, error, attributes, productAttributes, rows } = useAdminProductsData({
    page,
    limit,
    appliedSearch,
    categoryId,
    subcategoryId,
    appliedManufacturer,
    appliedAttrCode,
    appliedAttrValue,
    hitFilter,
    saleFilter,
    reloadToken,
  });

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, limit, appliedSearch, categoryId, subcategoryId, appliedManufacturer, appliedAttrCode, appliedAttrValue, hitFilter, saleFilter, reloadToken]);

  useEffect(() => {
    if (!data?.saleSettings) return;
    setSaleSettings(data.saleSettings);
    setSaleRuleDescription(data.saleRuleDescription || "");
  }, [data?.saleSettings, data?.saleRuleDescription]);

  useEffect(() => {
    if (!attrCode) {
      setAttrValueOptions([]);
      setAttrValueOptionsLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setAttrValueOptionsLoading(true);
    const params = new URLSearchParams({ code: attrCode });
    if (categoryId) params.set("categoryId", String(categoryId));
    if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
    void fetch(`/api/admin/product-attribute-values?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((values) => {
        if (cancelled) return;
        setAttrValueOptions(
          Array.isArray(values) ? values.map((value) => String(value)).filter(Boolean) : [],
        );
      })
      .catch(() => {
        if (!cancelled) setAttrValueOptions([]);
      })
      .finally(() => {
        if (!cancelled) setAttrValueOptionsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attrCode, categoryId, subcategoryId]);

  const triggerReload = () => setReloadToken((token) => token + 1);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.categories || []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [data?.categories]);

  const subcategoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.subcategories || []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [data?.subcategories]);

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
    setAppliedManufacturer(manufacturer.trim());
    setAppliedAttrCode(attrCode.trim());
    setAppliedAttrValue(attrValue.trim());
  };

  const resetFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setManufacturer("");
    setAppliedManufacturer("");
    setCategoryId(0);
    setSubcategoryId(0);
    setAttrCode("");
    setAttrValue("");
    setAppliedAttrCode("");
    setAppliedAttrValue("");
    setHitFilter("");
    setSaleFilter("");
    setPage(1);
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (appliedSearch.trim()) {
      chips.push({
        key: "search",
        label: `Поиск: ${appliedSearch.trim()}`,
        onRemove: () => {
          setSearch("");
          setAppliedSearch("");
          setPage(1);
        },
      });
    }
    if (categoryId) {
      chips.push({
        key: "category",
        label: `Категория: ${categoryNameById.get(categoryId) || categoryId}`,
        onRemove: () => {
          setCategoryId(0);
          setSubcategoryId(0);
          setPage(1);
        },
      });
    }
    if (subcategoryId) {
      chips.push({
        key: "subcategory",
        label: `Подкатегория: ${subcategoryNameById.get(subcategoryId) || subcategoryId}`,
        onRemove: () => {
          setSubcategoryId(0);
          setPage(1);
        },
      });
    }
    if (appliedManufacturer.trim()) {
      chips.push({
        key: "manufacturer",
        label: `Производитель: ${appliedManufacturer.trim()}`,
        onRemove: () => {
          setManufacturer("");
          setAppliedManufacturer("");
          setPage(1);
        },
      });
    }
    if (hitFilter === "yes") {
      chips.push({
        key: "hit",
        label: "Только хиты",
        onRemove: () => {
          setHitFilter("");
          setPage(1);
        },
      });
    } else if (hitFilter === "no") {
      chips.push({
        key: "hit-no",
        label: "Без хита",
        onRemove: () => {
          setHitFilter("");
          setPage(1);
        },
      });
    }
    if (saleFilter === "yes") {
      chips.push({
        key: "sale",
        label: "Только акционные",
        onRemove: () => {
          setSaleFilter("");
          setPage(1);
        },
      });
    } else if (saleFilter === "no") {
      chips.push({
        key: "sale-no",
        label: "Без акции",
        onRemove: () => {
          setSaleFilter("");
          setPage(1);
        },
      });
    }
    if (appliedAttrCode.trim() && appliedAttrValue.trim()) {
      chips.push({
        key: "attr",
        label: `${appliedAttrCode}: ${appliedAttrValue.trim()}`,
        onRemove: () => {
          setAttrCode("");
          setAttrValue("");
          setAppliedAttrCode("");
          setAppliedAttrValue("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [
    appliedSearch,
    categoryId,
    subcategoryId,
    appliedManufacturer,
    hitFilter,
    saleFilter,
    appliedAttrCode,
    appliedAttrValue,
    categoryNameById,
    subcategoryNameById,
  ]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (rows.every((row) => selectedIds.has(row.id))) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((row) => row.id)));
  };

  const handleBulkAction = async (action: BulkAction) => {
    if (!selectedRows.length || bulkLoading) return;
    setBulkLoading(true);
    setNotice("");
    try {
      const { updated, failed } = await runBulkProductAction(selectedRows, action);
      setNotice(
        failed > 0
          ? `Обновлено: ${updated}, ошибок: ${failed}.`
          : `Массовое действие выполнено для ${updated} товаров.`,
      );
      setSelectedIds(new Set());
      triggerReload();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteByCategory = async () => {
    if (deleting) return;
    if (!subcategoryId && !categoryId) {
      setNotice("Выберите категорию или подкатегорию в фильтре.");
      return;
    }
    const subName = subcategoryId ? subcategoryNameById.get(subcategoryId) : "";
    const catName = categoryId ? categoryNameById.get(categoryId) : "";
    const scopeText = subcategoryId
      ? `подкатегории «${subName || `#${subcategoryId}`}»`
      : `категории «${catName || `#${categoryId}`}» (все подкатегории этой ветки)`;
    const searchNote =
      appliedSearch.trim().length > 0
        ? "\n\nУдаляются все товары в этой области таксономии, не только строки, попавшие под текущий поиск."
        : "";
    const first = window.confirm(
      `Удалить все товары из ${scopeText}?\n\nВместе с ними пропадут варианты и привязки картинок. Действие необратимо.${searchNote}`,
    );
    if (!first) return;
    const phrase = window.prompt(
      "Чтобы подтвердить, введите слово DELETE заглавными буквами:",
      "",
    );
    if (phrase !== "DELETE") {
      setNotice("Удаление отменено — подтверждение не совпало.");
      return;
    }
    setDeleting(true);
    setNotice("");
    try {
      const params = new URLSearchParams();
      if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
      else if (categoryId) params.set("categoryId", String(categoryId));
      const response = await fetch(`/api/admin/products?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { deleted?: number };
      setNotice(`Удалено товаров: ${Number(body.deleted || 0)}.`);
      setPage(1);
      triggerReload();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleting) return;
    if (!data || data.total === 0) {
      setNotice("В базе нет товаров — удалять нечего.");
      return;
    }
    const first = window.confirm(
      `Удалить ВСЕ ${data.total} товаров?\n\nВместе с ними пропадут все варианты и привязки картинок. Действие необратимо.`,
    );
    if (!first) return;
    const phrase = window.prompt(
      "Чтобы подтвердить, введите слово DELETE заглавными буквами:",
      "",
    );
    if (phrase !== "DELETE") {
      setNotice("Удаление отменено — подтверждение не совпало.");
      return;
    }
    setDeleting(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { deleted?: number };
      setNotice(`Удалено товаров: ${Number(body.deleted || 0)}.`);
      setPage(1);
      triggerReload();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Товары</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600">
            Управление каталогом: фильтры, массовые действия, настройка колонок и быстрое редактирование
            цен и статусов.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/import"
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Импорт CSV →
          </Link>
          <Link
            href="/admin"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            ← К админке
          </Link>
        </div>
      </header>

      <AdminProductsSaleRules
        settings={saleSettings}
        description={saleRuleDescription}
        onSaved={(next, description) => {
          setSaleSettings(next);
          setSaleRuleDescription(description || "");
          setNotice("Правила акций сохранены");
        }}
      />

      <AdminProductsFilters
        loading={loading}
        total={data?.total ?? null}
        categories={data?.categories || []}
        subcategories={data?.subcategories || []}
        manufacturers={data?.manufacturers || []}
        productAttributes={productAttributes}
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={(value) => {
          setCategoryId(value);
          setSubcategoryId(0);
          setPage(1);
        }}
        subcategoryId={subcategoryId}
        onSubcategoryChange={(value) => {
          setSubcategoryId(value);
          setPage(1);
        }}
        manufacturer={manufacturer}
        onManufacturerChange={(value) => {
          setManufacturer(value);
          setPage(1);
        }}
        hitFilter={hitFilter}
        onHitFilterChange={(value) => {
          setHitFilter(value);
          setPage(1);
        }}
        saleFilter={saleFilter}
        onSaleFilterChange={(value) => {
          setSaleFilter(value);
          setPage(1);
        }}
        limit={limit}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        attrCode={attrCode}
        onAttrCodeChange={(value) => {
          setAttrCode(value);
          setAttrValue("");
          setPage(1);
        }}
        attrValue={attrValue}
        onAttrValueChange={(value) => {
          setAttrValue(value);
          setPage(1);
        }}
        attrValueOptions={attrValueOptions}
        attrValueOptionsLoading={attrValueOptionsLoading}
        onSubmit={onSearchSubmit}
        onReset={resetFilters}
        activeChips={activeChips}
        deleting={deleting}
        onDeleteByCategory={handleDeleteByCategory}
        onDeleteAll={handleDeleteAll}
        canDeleteByCategory={Boolean(categoryId || subcategoryId)}
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <AdminProductsToolbar
          selectedCount={selectedIds.size}
          pageRowCount={rows.length}
          allPageSelected={rows.length > 0 && rows.every((row) => selectedIds.has(row.id))}
          onToggleSelectAll={toggleSelectAllPage}
          onClearSelection={() => setSelectedIds(new Set())}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          compact={compact}
          onCompactChange={(value) => {
            setCompact(value);
            if (!value) {
              setColumnVisibility((prev) => {
                const next = { ...prev, photos: true };
                saveColumnVisibility(next);
                return next;
              });
            }
          }}
          onBulkAction={(action) => void handleBulkAction(action)}
          bulkLoading={bulkLoading}
          loading={loading}
        />

        <AdminProductsTable
          rows={rows}
          attributes={attributes}
          columnVisibility={columnVisibility}
          compact={compact}
          loading={loading}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onSaved={triggerReload}
        />

        {data && data.total > 0 ? (
          <AdminProductsPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            shown={rows.length}
            loading={loading}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </main>
  );
}
