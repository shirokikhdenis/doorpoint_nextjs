"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLabelToSelections,
  buildCatalogActiveFilterChips,
  buildCatalogApiQuery,
  buildDefaultCollapsedSections,
  expandSectionsWithActiveFilters,
  isMetaEmpty,
  labelMatchesSelections,
  parseCatalogFilterStateFromSearchParams,
  rangeToFilterState,
  type CatalogActiveFilterChip,
} from "@/features/catalog/catalog-filter-utils";
import { clearCatalogReturnPayload } from "@/features/catalog/session/catalog-return-storage";
import type { CatalogFilterState, NumericRange } from "@/features/catalog/catalog-types";
import type { CatalogLabel, CatalogMeta } from "@/lib/client/normalizers";
import {
  buildCatalogFilterQuery,
  catalogPageFromPathname,
  catalogPagePath,
} from "@/lib/catalog-url";
import { catalogPageSupportsOnSaleFilter } from "@/lib/catalog-page-slugs";

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

  if (typeof window !== "undefined") {
    const flat: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((value, key) => {
      flat[key] = value;
    });
    return {
      catalogPage: catalogPageFromPathname(window.location.pathname),
      filters: parseCatalogFilterStateFromSearchParams(flat),
    };
  }

  return {
    catalogPage: options?.initialCatalogPage || "all",
    filters: defaultFilterState(),
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
  const searchDebounceInitializedRef = useRef(false);

  const notifyUserFilterChange = useCallback(() => {
    clearCatalogReturnPayload();
  }, []);

  const onSaleApplies = catalogPageSupportsOnSaleFilter(catalogPage);
  const effectiveOnSale = onSaleApplies && onSale;

  const filterState: CatalogFilterState = useMemo(
    () => ({
      search: debouncedSearch,
      sort,
      categories,
      subcategories,
      attrSelections,
      attrRanges,
      priceRange,
      onSale: effectiveOnSale,
    }),
    [debouncedSearch, sort, categories, subcategories, attrSelections, attrRanges, priceRange, effectiveOnSale],
  );

  const query = useMemo(
    () => buildCatalogApiQuery(catalogPage, filterState),
    [catalogPage, filterState],
  );

  const activeFilterChips = useMemo(
    () => buildCatalogActiveFilterChips(meta, { ...filterState, search: searchInput }),
    [filterState, meta, searchInput],
  );

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    Object.keys(attrSelections).length > 0 ||
    Object.keys(attrRanges).length > 0 ||
    priceRange.min.trim() !== "" ||
    priceRange.max.trim() !== "" ||
    effectiveOnSale;

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
    notifyUserFilterChange();
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
    setOnSale(false);
  }, [notifyUserFilterChange]);

  const clearAllFilters = useCallback(() => {
    notifyUserFilterChange();
    resetUserFilters();
    setSearchInput("");
  }, [notifyUserFilterChange, resetUserFilters]);

  const toggle = (value: string, state: string[], setState: (values: string[]) => void) => {
    notifyUserFilterChange();
    setState(state.includes(value) ? state.filter((v) => v !== value) : [...state, value]);
  };

  const toggleAttrValue = (code: string, value: string) => {
    notifyUserFilterChange();
    setAttrSelections((prev) => {
      const current = prev[code] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const rest = { ...prev };
        delete rest[code];
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  const selectManufacturerCollection = (manufacturer: string, collection: string) => {
    const collectionCode = meta.collectionAttrCode?.trim() || "collection";
    notifyUserFilterChange();
    const curManufacturer = attrSelections.manufacturer?.[0];
    const curCollection = attrSelections[collectionCode]?.[0];
    if (curManufacturer === manufacturer && curCollection === collection) {
      setAttrSelections((prev) => {
        const next = { ...prev };
        delete next.manufacturer;
        delete next[collectionCode];
        return next;
      });
      return;
    }
    setAttrSelections((prev) => ({
      ...prev,
      manufacturer: [manufacturer],
      [collectionCode]: [collection],
    }));
  };

  const selectManufacturer = (manufacturer: string) => {
    const collectionCode = meta.collectionAttrCode?.trim() || "collection";
    notifyUserFilterChange();
    const curManufacturer = attrSelections.manufacturer?.[0];
    const curCollection = attrSelections[collectionCode]?.[0];
    if (curManufacturer === manufacturer && !curCollection) {
      setAttrSelections((prev) => {
        const next = { ...prev };
        delete next.manufacturer;
        return next;
      });
      return;
    }
    setAttrSelections((prev) => {
      const next = { ...prev };
      next.manufacturer = [manufacturer];
      delete next[collectionCode];
      return next;
    });
  };

  const updatePriceRange = (min: number, max: number) => {
    notifyUserFilterChange();
    setPriceRange(rangeToFilterState(meta.price.min, meta.price.max, min, max));
  };

  const updateAttrRange = (
    code: string,
    boundsMin: number,
    boundsMax: number,
    min: number,
    max: number,
  ) => {
    notifyUserFilterChange();
    setAttrRanges((prev) => {
      const next = rangeToFilterState(boundsMin, boundsMax, min, max);
      if (next.min === "" && next.max === "") {
        const rest = { ...prev };
        delete rest[code];
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  const handleLabelClick = (label: CatalogLabel) => {
    notifyUserFilterChange();
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

  const setSortWithClear = (value: string) => {
    notifyUserFilterChange();
    setSort(value);
  };

  const setOnSaleWithClear = (value: boolean) => {
    notifyUserFilterChange();
    setOnSale(value);
  };

  const setSearchInputWithClear = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const removeActiveFilterChip = useCallback(
    (chip: CatalogActiveFilterChip) => {
      notifyUserFilterChange();
      switch (chip.kind) {
        case "search":
          setSearchInput("");
          return;
        case "sort":
          setSort("popularity");
          return;
        case "onSale":
          setOnSale(false);
          return;
        case "category":
          setCategories((prev) => prev.filter((slug) => slug !== chip.slug));
          return;
        case "subcategory":
          setSubcategories((prev) => prev.filter((slug) => slug !== chip.slug));
          return;
        case "attrValue":
          setAttrSelections((prev) => {
            const nextValues = (prev[chip.code] || []).filter((value) => value !== chip.attrValue);
            if (nextValues.length === 0) {
              const rest = { ...prev };
              delete rest[chip.code];
              return rest;
            }
            return { ...prev, [chip.code]: nextValues };
          });
          return;
        case "attrRange":
          setAttrRanges((prev) => {
            const rest = { ...prev };
            delete rest[chip.code];
            return rest;
          });
          return;
        case "price":
          setPriceRange({ min: "", max: "" });
          return;
      }
    },
    [notifyUserFilterChange],
  );

  useEffect(() => {
    if (!searchDebounceInitializedRef.current) {
      searchDebounceInitializedRef.current = true;
      return;
    }
    notifyUserFilterChange();
  }, [debouncedSearch, notifyUserFilterChange]);

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
    // URL navigation is the external source of truth for direct/back-forward filter state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    clearCatalogReturnPayload();

    // Route changes must reset controlled filter inputs before the next catalog fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCatalogPage(pageFromPath);
    setSearchInput("");
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
    setOnSale(
      catalogPageSupportsOnSaleFilter(pageFromPath) && searchParams?.get("onSale") === "1",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!searchParams) return;
    if (!catalogPageSupportsOnSaleFilter(catalogPage)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnSale(false);
      return;
    }
    // Keep browser history navigation in sync with the controlled sale checkbox.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnSale(searchParams.get("onSale") === "1");
  }, [searchParams, catalogPage]);

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
    setSearchInput: setSearchInputWithClear,
    sort,
    setSort: setSortWithClear,
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
    setOnSale: setOnSaleWithClear,
    filterState,
    query,
    activeFilterChips,
    removeActiveFilterChip,
    hasActiveFilters,
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    isFilterSectionCollapsed,
    toggleFilterSection,
    clearAllFilters,
    toggle,
    toggleAttrValue,
    selectManufacturerCollection,
    selectManufacturer,
    updatePriceRange,
    updateAttrRange,
    handleLabelClick,
  };
}
