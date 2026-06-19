"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLabelToSelections,
  buildCatalogApiQuery,
  buildDefaultCollapsedSections,
  expandSectionsWithActiveFilters,
  isMetaEmpty,
  labelMatchesSelections,
  rangeToFilterState,
} from "@/features/catalog/catalog-filter-utils";
import {
  buildInitialCatalogFilters,
  readCatalogScrollPayload,
  resolveCatalogPageSlug,
} from "@/features/catalog/catalog-scroll-storage";
import type { CatalogFilterState, NumericRange } from "@/features/catalog/catalog-types";
import type { CatalogLabel, CatalogMeta } from "@/lib/client/normalizers";
import {
  buildCatalogFilterQuery,
  catalogPageFromPathname,
  catalogPagePath,
} from "@/lib/catalog-url";

const SEARCH_DEBOUNCE_MS = 300;

type UseCatalogFiltersOptions = {
  initialCatalogPage?: string;
  initialFilterState?: CatalogFilterState;
};

const defaultFilterState = (): CatalogFilterState => ({
  search: "",
  sort: "popularity",
  categories: [],
  subcategories: [],
  attrSelections: {},
  attrRanges: {},
  priceRange: { min: "", max: "" },
  onSale: false,
});

const resolveCatalogBootstrap = (options?: UseCatalogFiltersOptions) => {
  if (options?.initialFilterState && options.initialCatalogPage) {
    return {
      catalogPage: options.initialCatalogPage,
      filters: options.initialFilterState,
    };
  }

  const scroll =
    typeof window !== "undefined" ? readCatalogScrollPayload() : null;
  const urlPage =
    typeof window !== "undefined"
      ? resolveCatalogPageSlug()
      : options?.initialCatalogPage || "all";

  if (scroll?.catalogPage && scroll.catalogPage === urlPage) {
    return {
      catalogPage: scroll.catalogPage,
      filters: buildInitialCatalogFilters(),
    };
  }

  return {
    catalogPage: urlPage,
    filters:
      typeof window !== "undefined" ? buildInitialCatalogFilters() : defaultFilterState(),
  };
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useCatalogFilters(meta: CatalogMeta, options?: UseCatalogFiltersOptions) {
  const [bootstrap] = useState(() => resolveCatalogBootstrap(options));
  const [catalogPage, setCatalogPage] = useState(() => bootstrap.catalogPage);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(bootstrap.filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [sort, setSort] = useState(bootstrap.filters.sort);
  const [categories, setCategories] = useState<string[]>(bootstrap.filters.categories);
  const [subcategories, setSubcategories] = useState<string[]>(bootstrap.filters.subcategories);
  const [attrSelections, setAttrSelections] = useState<Record<string, string[]>>(
    bootstrap.filters.attrSelections,
  );
  const [attrRanges, setAttrRanges] = useState<Record<string, NumericRange>>(
    bootstrap.filters.attrRanges,
  );
  const [priceRange, setPriceRange] = useState<NumericRange>(bootstrap.filters.priceRange);
  const [onSale, setOnSale] = useState(bootstrap.filters.onSale);

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
      onSale,
    }),
    [debouncedSearch, sort, categories, subcategories, attrSelections, attrRanges, priceRange, onSale],
  );

  const query = useMemo(
    () => buildCatalogApiQuery(catalogPage, filterState),
    [catalogPage, filterState],
  );

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    Object.keys(attrSelections).length > 0 ||
    Object.keys(attrRanges).length > 0 ||
    priceRange.min.trim() !== "" ||
    priceRange.max.trim() !== "" ||
    onSale;

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
    setOnSale(false);
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string[]> = {};
    params.forEach((value, key) => {
      if (!key.startsWith("attr_") || key.endsWith("_min") || key.endsWith("_max")) return;
      const code = key.slice(5);
      const values = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (values.length) fromUrl[code] = values;
    });
    if (Object.keys(fromUrl).length === 0) return;
    setAttrSelections((prev) => {
      const same =
        Object.keys(fromUrl).length === Object.keys(prev).length &&
        Object.entries(fromUrl).every(([code, values]) => {
          const current = prev[code] || [];
          return current.length === values.length && current.every((v, i) => v === values[i]);
        });
      return same ? prev : fromUrl;
    });
  }, [catalogPage, searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const pageFromPath = catalogPageFromPathname(pathname);
    if (pageFromPath === catalogPage) return;

    if (typeof window !== "undefined") {
      try {
        const scroll = readCatalogScrollPayload();
        if (scroll?.catalogPage && scroll.catalogPage !== pageFromPath) {
          window.sessionStorage.removeItem("catalogScroll");
        }
      } catch {
        /* ignore */
      }
    }

    setCatalogPage(pageFromPath);
    setSearchInput("");
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
    setOnSale(searchParams?.get("onSale") === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!searchParams) return;
    setOnSale(searchParams.get("onSale") === "1");
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
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("lastCatalogPage", catalogPage);
    const matching = meta.labels.find((l) => labelMatchesSelections(l, attrSelections));
    const path = catalogPagePath(catalogPage);
    const params = new URLSearchParams(buildCatalogFilterQuery(filterState));
    if (matching) params.set("catalogLabel", String(matching.id));
    const qs = params.toString();
    const nextUrl = qs ? `${path}?${qs}` : path;
    const cur = window.location.pathname + window.location.search;
    if (nextUrl !== cur) router.replace(nextUrl, { scroll: false });
  }, [attrSelections, catalogPage, filterState, meta.labels, router]);

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
    onSale,
    setOnSale,
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
