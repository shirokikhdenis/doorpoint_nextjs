"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLabelToSelections,
  buildCatalogQuery,
  buildDefaultCollapsedSections,
  expandSectionsWithActiveFilters,
  isMetaEmpty,
  labelMatchesSelections,
  rangeToFilterState,
} from "@/features/catalog/catalog-filter-utils";
import { buildInitialCatalogFilters, resolveCatalogPageSlug } from "@/features/catalog/catalog-scroll-storage";
import type { CatalogFilterState, NumericRange } from "@/features/catalog/catalog-types";
import type { CatalogLabel, CatalogMeta } from "@/lib/client/normalizers";

const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useCatalogFilters(meta: CatalogMeta) {
  const [initialFilters] = useState(buildInitialCatalogFilters);
  const [catalogPage, setCatalogPage] = useState(() => resolveCatalogPageSlug());

  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [sort, setSort] = useState(initialFilters.sort);
  const [categories, setCategories] = useState<string[]>(initialFilters.categories);
  const [subcategories, setSubcategories] = useState<string[]>(initialFilters.subcategories);
  const [attrSelections, setAttrSelections] = useState<Record<string, string[]>>(
    initialFilters.attrSelections,
  );
  const [attrRanges, setAttrRanges] = useState<Record<string, NumericRange>>(
    initialFilters.attrRanges,
  );
  const [priceRange, setPriceRange] = useState<NumericRange>(initialFilters.priceRange);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [collapsedFilterSections, setCollapsedFilterSections] = useState<Set<string>>(
    () => new Set(),
  );
  const filterDefaultsPendingRef = useRef(true);

  const filterState: CatalogFilterState = useMemo(
    () => ({
      search: debouncedSearch,
      sort,
      categories,
      subcategories,
      attrSelections,
      attrRanges,
      priceRange,
    }),
    [debouncedSearch, sort, categories, subcategories, attrSelections, attrRanges, priceRange],
  );

  const query = useMemo(
    () => buildCatalogQuery(catalogPage, filterState),
    [catalogPage, filterState],
  );

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    Object.keys(attrSelections).length > 0 ||
    Object.keys(attrRanges).length > 0 ||
    priceRange.min.trim() !== "" ||
    priceRange.max.trim() !== "";

  const isFilterSectionCollapsed = (sectionId: string) => collapsedFilterSections.has(sectionId);

  const toggleFilterSection = (sectionId: string) => {
    setCollapsedFilterSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const resetUserFilters = useCallback(() => {
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
  }, []);

  const clearAllFilters = useCallback(() => {
    resetUserFilters();
    setSearchInput("");
  }, [resetUserFilters]);

  const toggle = (value: string, state: string[], setState: (values: string[]) => void) => {
    setState(state.includes(value) ? state.filter((v) => v !== value) : [...state, value]);
  };

  const toggleAttrValue = (code: string, value: string) => {
    setAttrSelections((prev) => {
      const current = prev[code] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const { [code]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  const updatePriceRange = (min: number, max: number) => {
    setPriceRange(rangeToFilterState(meta.price.min, meta.price.max, min, max));
  };

  const updateAttrRange = (
    code: string,
    boundsMin: number,
    boundsMax: number,
    min: number,
    max: number,
  ) => {
    setAttrRanges((prev) => {
      const next = rangeToFilterState(boundsMin, boundsMax, min, max);
      if (next.min === "" && next.max === "") {
        const { [code]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  const handleLabelClick = (label: CatalogLabel) => {
    if (labelMatchesSelections(label, attrSelections)) {
      setAttrSelections((prev) => {
        const next = { ...prev };
        for (const rule of label.filters) {
          delete next[rule.code];
        }
        return next;
      });
      setAttrRanges({});
      return;
    }
    setAttrSelections(applyLabelToSelections(label));
    setAttrRanges({});
  };

  useEffect(() => {
    if (typeof window === "undefined" || !catalogPage) return;
    window.sessionStorage.setItem("lastCatalogPage", catalogPage);
    const params = new URLSearchParams(window.location.search);
    if (params.get("catalogPage") !== catalogPage) {
      params.set("catalogPage", catalogPage);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", next);
    }
  }, [catalogPage]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const next = searchParams.get("catalogPage");
    if (!next || next === catalogPage) return;
    setCatalogPage(next);
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("catalogLabel");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (isMetaEmpty(meta)) {
      filterDefaultsPendingRef.current = true;
      return;
    }
    if (!filterDefaultsPendingRef.current) return;
    filterDefaultsPendingRef.current = false;
    setCollapsedFilterSections(
      expandSectionsWithActiveFilters(buildDefaultCollapsedSections(meta), {
        ...filterState,
        labels: meta.labels,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  useEffect(() => {
    filterDefaultsPendingRef.current = true;
  }, [catalogPage]);

  useEffect(() => {
    if (typeof window === "undefined" || meta.labels.length === 0) return;
    const matching = meta.labels.find((l) => labelMatchesSelections(l, attrSelections));
    const params = new URLSearchParams(window.location.search);
    if (matching) params.set("catalogLabel", String(matching.id));
    else params.delete("catalogLabel");
    if (params.get("catalogPage") !== catalogPage) params.set("catalogPage", catalogPage);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const cur = window.location.pathname + window.location.search;
    if (nextUrl !== cur) window.history.replaceState(null, "", nextUrl);
  }, [attrSelections, meta.labels, catalogPage]);

  return {
    catalogPage,
    setCatalogPage,
    searchInput,
    setSearchInput,
    sort,
    setSort,
    categories,
    setCategories,
    subcategories,
    setSubcategories,
    attrSelections,
    setAttrSelections,
    attrRanges,
    setAttrRanges,
    priceRange,
    filterState,
    query,
    hasActiveFilters,
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    isFilterSectionCollapsed,
    toggleFilterSection,
    clearAllFilters,
    toggle,
    toggleAttrValue,
    updatePriceRange,
    updateAttrRange,
    handleLabelClick,
  };
}
