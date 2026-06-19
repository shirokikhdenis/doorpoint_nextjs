"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CATALOG_PAGE_LIMIT } from "@/features/catalog/catalog-constants";
import { applyLabelToSelections, dedupeProductsById } from "@/features/catalog/catalog-filter-utils";
import {
  clearCatalogScrollPayload,
  readCatalogScrollPayload,
  resolveCatalogPageSlug,
} from "@/features/catalog/catalog-scroll-storage";
import type { CatalogReturnSnapshot } from "@/features/catalog/catalog-types";
import {
  CatalogMeta,
  CatalogPageItem,
  ProductCard,
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";
import type { CatalogShellInitial } from "@/lib/server/catalog-shell";

type UseCatalogProductsOptions = {
  catalogPage: string;
  setCatalogPage: (slug: string) => void;
  query: string;
  setAttrSelections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setAttrRanges: React.Dispatch<
    React.SetStateAction<Record<string, { min: string; max: string }>>
  >;
  setMeta: React.Dispatch<React.SetStateAction<CatalogMeta>>;
  initial?: CatalogShellInitial;
};

const matchesInitialShell = (
  initial: CatalogShellInitial | undefined,
  query: string,
  catalogPage: string,
) =>
  Boolean(
    initial &&
      query === initial.queryString &&
      catalogPage === initial.catalogPage,
  );

export function useCatalogProducts({
  catalogPage,
  setCatalogPage,
  query,
  setAttrSelections,
  setAttrRanges,
  setMeta,
  initial,
}: UseCatalogProductsOptions) {
  const initialShellRef = useRef(initial);
  initialShellRef.current = initial;

  const useInitialRef = useRef(matchesInitialShell(initial, query, catalogPage));
  const catalogReturnSnapshotRef = useRef<CatalogReturnSnapshot | null>(null);
  const scrollRestoredRef = useRef(false);
  const skippedInitialMetaRef = useRef(false);
  const skippedInitialPagesRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (catalogReturnSnapshotRef.current) return;

    const urlPage = resolveCatalogPageSlug();
    const payload = readCatalogScrollPayload();
    if (!payload) return;

    if (payload.catalogPage && payload.catalogPage !== urlPage) {
      clearCatalogScrollPayload();
      return;
    }

    const slug = String(payload.catalogPage || "").trim();
    if (!slug) return;

    const loadedPages = Math.min(25, Math.max(1, Number(payload.loadedPages) || 1));
    if (loadedPages <= 1) {
      clearCatalogScrollPayload();
      return;
    }

    catalogReturnSnapshotRef.current = {
      catalogPage: slug,
      scrollY: Number(payload.scrollY) || 0,
      loadedPages,
      scrollApplied: false,
    };
  }, []);

  const [catalogPages, setCatalogPages] = useState<CatalogPageItem[]>(() =>
    useInitialRef.current && initial ? initial.catalogPages : [],
  );
  const [products, setProducts] = useState<ProductCard[]>(() =>
    useInitialRef.current && initial ? initial.products : [],
  );
  const [total, setTotal] = useState(() =>
    useInitialRef.current && initial ? initial.total : 0,
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!useInitialRef.current);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const lastFetchedRef = useRef<{ query: string; page: number }>(
    useInitialRef.current && initial
      ? { query: initial.queryString, page: 1 }
      : { query: "", page: 0 },
  );
  const restoreCheckDoneRef = useRef(false);
  const catalogPageRef = useRef(catalogPage);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    if (catalogPageRef.current === catalogPage) return;
    catalogPageRef.current = catalogPage;

    useInitialRef.current = false;
    skippedInitialMetaRef.current = false;
    skippedInitialPagesRef.current = false;
    restoreCheckDoneRef.current = false;
    catalogReturnSnapshotRef.current = null;
    lastFetchedRef.current = { query: "", page: 0 };

    setProducts([]);
    setTotal(0);
    setPage(1);
    setLoading(true);
    setLoadingMore(false);
    setError("");
  }, [catalogPage]);

  useEffect(() => {
    if (loading || scrollRestoredRef.current || typeof window === "undefined") return;

    const finishScrollRestore = () => {
      scrollRestoredRef.current = true;
    };

    const snap = catalogReturnSnapshotRef.current;
    if (!snap || snap.scrollApplied) {
      finishScrollRestore();
      return;
    }
    if (snap.catalogPage !== catalogPage) {
      finishScrollRestore();
      catalogReturnSnapshotRef.current = null;
      clearCatalogScrollPayload();
      return;
    }

    scrollRestoredRef.current = true;
    snap.scrollApplied = true;
    const targetY = snap.scrollY;
    if (Number.isFinite(targetY) && targetY > 0) {
      window.scrollTo({ top: targetY, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top: targetY, behavior: "auto" }));
    }
    clearCatalogScrollPayload();
    catalogReturnSnapshotRef.current = null;
  }, [loading, catalogPage]);

  useEffect(() => {
    const shell = initialShellRef.current;
    if (
      shell &&
      !skippedInitialPagesRef.current &&
      useInitialRef.current &&
      catalogPage === shell.catalogPage &&
      shell.catalogPages.length > 0
    ) {
      skippedInitialPagesRef.current = true;
      setCatalogPages(shell.catalogPages);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const pagesRes = await fetch("/api/products/catalog-pages");
      if (!pagesRes.ok) throw new Error("Не удалось загрузить разделы каталога");
      const safePages = normalizeCatalogPages(await pagesRes.json());
      if (cancelled) return;
      setCatalogPages(safePages);
      if (safePages.length && !safePages.some((p) => p.slug === catalogPage)) {
        const fallback = safePages.find((p) => p.isDefault) || safePages[0];
        setCatalogPage(fallback?.slug || "all");
      }
    };
    run().catch((err: Error) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogPage, initial?.catalogPage, setCatalogPage]);

  useEffect(() => {
    const shell = initialShellRef.current;
    if (
      shell &&
      !skippedInitialMetaRef.current &&
      useInitialRef.current &&
      catalogPage === shell.catalogPage
    ) {
      skippedInitialMetaRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/products/meta?catalogPage=${encodeURIComponent(catalogPage)}`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        const json = await res.json();
        if (cancelled) return;
        const nextMeta = normalizeCatalogMeta(json);
        setMeta(nextMeta);

        if (typeof window !== "undefined") {
          const raw = new URLSearchParams(window.location.search).get("catalogLabel");
          if (raw && nextMeta.labels.length > 0) {
            const id = Number(raw);
            const label = nextMeta.labels.find((l) => l.id === id);
            if (label) {
              setAttrSelections(applyLabelToSelections(label));
              setAttrRanges({});
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogPage, initial?.catalogPage, setAttrSelections, setAttrRanges, setMeta]);

  useEffect(() => {
    const shell = initialShellRef.current;
    const usingInitialShell = matchesInitialShell(shell, query, catalogPage);
    useInitialRef.current = usingInitialShell;

    if (usingInitialShell && shell) {
      setProducts(shell.products);
      setTotal(shell.total);
      setPage(1);
      setLoading(false);
      setLoadingMore(false);
      setError("");
      lastFetchedRef.current = { query: shell.queryString, page: 1 };
      restoreCheckDoneRef.current = false;
      return;
    }

    setPage(1);
    lastFetchedRef.current = { query: "", page: 0 };
    restoreCheckDoneRef.current = false;
  }, [query, catalogPage]);

  useEffect(() => {
    if (lastFetchedRef.current.query === query && lastFetchedRef.current.page === page) {
      return;
    }

    const generation = ++fetchGenerationRef.current;
    let cancelled = false;

    (async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");

      try {
        if (!restoreCheckDoneRef.current && page === 1) {
          const snap = catalogReturnSnapshotRef.current;
          if (snap?.catalogPage === catalogPage && snap.loadedPages > 1) {
            const wantPages = snap.loadedPages;
            const hasInitialPage = matchesInitialShell(initialShellRef.current, query, catalogPage);
            const pageNumbers = hasInitialPage
                ? Array.from({ length: wantPages - 1 }, (_, index) => index + 2)
                : Array.from({ length: wantPages }, (_, index) => index + 1);

              if (pageNumbers.length > 0) {
                setLoadingMore(true);
                const responses = await Promise.all(
                  pageNumbers.map(async (pageNumber) => {
                    const params = new URLSearchParams(query);
                    params.set("page", String(pageNumber));
                    params.set("limit", String(CATALOG_PAGE_LIMIT));
                    const response = await fetch(`/api/products?${params.toString()}`);
                    if (!response.ok) throw new Error("Не удалось загрузить данные каталога");
                    return (await response.json()) as { total?: number };
                  }),
                );
                if (cancelled || generation !== fetchGenerationRef.current) return;

                const extraItems = dedupeProductsById(
                  responses.flatMap((json) => normalizeProductsResponse(json)),
                );
                setProducts((prev) =>
                  hasInitialPage ? dedupeProductsById([...prev, ...extraItems]) : extraItems,
                );
                const lastTotal = Number(responses[responses.length - 1]?.total) || 0;
                if (lastTotal > 0) setTotal(lastTotal);
                lastFetchedRef.current = { query, page: wantPages };
                setPage(wantPages);
                restoreCheckDoneRef.current = true;
                return;
              }
          }
          restoreCheckDoneRef.current = true;
        }

        const params = new URLSearchParams(query);
        params.set("page", String(page));
        params.set("limit", String(CATALOG_PAGE_LIMIT));
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Не удалось загрузить данные каталога");
        const json = (await res.json()) as { total?: number };
        if (cancelled || generation !== fetchGenerationRef.current) return;

        const items = normalizeProductsResponse(json);
        setTotal(Number(json?.total) || 0);
        setProducts((prev) =>
          dedupeProductsById(page === 1 ? items : [...prev, ...items]),
        );
        lastFetchedRef.current = { query, page };
      } catch (err) {
        if (!cancelled && generation === fetchGenerationRef.current) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled && generation === fetchGenerationRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, page, catalogPage]);

  return {
    catalogPages,
    products,
    total,
    page,
    setPage,
    loading,
    loadingMore,
    error,
  };
}
