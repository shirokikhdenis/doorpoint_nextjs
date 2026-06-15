"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CATALOG_PAGE_LIMIT, emptyCatalogMeta } from "@/features/catalog/catalog-constants";
import { applyLabelToSelections, dedupeProductsById } from "@/features/catalog/catalog-filter-utils";
import { readCatalogScrollPayload } from "@/features/catalog/catalog-scroll-storage";
import type { CatalogReturnSnapshot } from "@/features/catalog/catalog-types";
import {
  CatalogMeta,
  CatalogPageItem,
  ProductCard,
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";

type UseCatalogProductsOptions = {
  catalogPage: string;
  setCatalogPage: (slug: string) => void;
  query: string;
  setAttrSelections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setAttrRanges: React.Dispatch<
    React.SetStateAction<Record<string, { min: string; max: string }>>
  >;
  setMeta: React.Dispatch<React.SetStateAction<CatalogMeta>>;
};

export function useCatalogProducts({
  catalogPage,
  setCatalogPage,
  query,
  setAttrSelections,
  setAttrRanges,
  setMeta,
}: UseCatalogProductsOptions) {
  const catalogReturnSnapshotRef = useRef<CatalogReturnSnapshot | null>(null);
  const scrollRestoredRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (catalogReturnSnapshotRef.current) return;
    const p = readCatalogScrollPayload();
    if (!p) return;
    const slug = String(p.catalogPage || "").trim();
    if (!slug) return;
    catalogReturnSnapshotRef.current = {
      catalogPage: slug,
      scrollY: Number(p.scrollY) || 0,
      loadedPages: Math.min(25, Math.max(1, Number(p.loadedPages) || 1)),
      scrollApplied: false,
    };
  }, []);

  const [catalogPages, setCatalogPages] = useState<CatalogPageItem[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const lastFetchedRef = useRef<{ query: string; page: number }>({ query: "", page: 0 });
  const restoreCheckDoneRef = useRef(false);

  useEffect(() => {
    if (loading || scrollRestoredRef.current || typeof window === "undefined") return;
    const snap = catalogReturnSnapshotRef.current;
    if (!snap || snap.scrollApplied) {
      scrollRestoredRef.current = true;
      return;
    }
    if (snap.catalogPage !== catalogPage) {
      scrollRestoredRef.current = true;
      catalogReturnSnapshotRef.current = null;
      try {
        window.sessionStorage.removeItem("catalogScroll");
      } catch {
        /* ignore */
      }
      return;
    }
    const targetY = snap.scrollY;
    if (!Number.isFinite(targetY) || targetY <= 0) {
      snap.scrollApplied = true;
      scrollRestoredRef.current = true;
    } else {
      scrollRestoredRef.current = true;
      snap.scrollApplied = true;
      window.scrollTo({ top: targetY, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top: targetY, behavior: "auto" }));
    }
    try {
      window.sessionStorage.removeItem("catalogScroll");
    } catch {
      /* ignore */
    }
    catalogReturnSnapshotRef.current = null;
  }, [loading, catalogPage]);

  useEffect(() => {
    const run = async () => {
      const pagesRes = await fetch("/api/products/catalog-pages");
      if (!pagesRes.ok) throw new Error("Не удалось загрузить разделы каталога");
      const safePages = normalizeCatalogPages(await pagesRes.json());
      setCatalogPages(safePages);
      if (safePages.length && !safePages.some((p) => p.slug === catalogPage)) {
        const fallback = safePages.find((p) => p.isDefault) || safePages[0];
        setCatalogPage(fallback?.slug || "all");
      }
    };
    run().catch((err: Error) => setError(err.message));
  }, [catalogPage, setCatalogPage]);

  useEffect(() => {
    let cancelled = false;
    setMeta(emptyCatalogMeta);
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
  }, [catalogPage, setAttrSelections, setAttrRanges, setMeta]);

  useEffect(() => {
    setPage(1);
    restoreCheckDoneRef.current = false;
  }, [query]);

  useEffect(() => {
    if (lastFetchedRef.current.query === query && lastFetchedRef.current.page === page) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        if (!restoreCheckDoneRef.current && page === 1) {
          const snap = catalogReturnSnapshotRef.current;
          if (snap?.catalogPage === catalogPage) {
            const wantPages = snap.loadedPages;
            if (wantPages > 1) {
              const numbers = Array.from({ length: wantPages }, (_, i) => i + 1);
              const responses = await Promise.all(
                numbers.map(async (p) => {
                  const params = new URLSearchParams(query);
                  params.set("page", String(p));
                  params.set("limit", String(CATALOG_PAGE_LIMIT));
                  const r = await fetch(`/api/products?${params.toString()}`);
                  if (!r.ok) throw new Error("Не удалось загрузить данные каталога");
                  return (await r.json()) as { total?: number };
                }),
              );
              if (cancelled) return;
              const all = dedupeProductsById(
                responses.flatMap((j) => normalizeProductsResponse(j)),
              );
              const lastTotal = Number(responses[responses.length - 1]?.total) || all.length;
              setTotal(lastTotal);
              setProducts(all);
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
        if (cancelled) return;
        const items = normalizeProductsResponse(json);
        setTotal(Number(json?.total) || 0);
        setProducts((prev) =>
          dedupeProductsById(page === 1 ? items : [...prev, ...items]),
        );
        lastFetchedRef.current = { query, page };
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) {
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
