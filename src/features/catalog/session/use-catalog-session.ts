"use client";

import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { CATALOG_PAGE_LIMIT } from "@/features/catalog/catalog-constants";
import { dedupeProductsById } from "@/features/catalog/catalog-filter-utils";
import {
  clearCatalogReturnPayload,
  readCatalogReturnPayload,
} from "@/features/catalog/session/catalog-return-storage";
import { catalogSessionReducer } from "@/features/catalog/session/catalog-session-reducer.js";
import {
  createInitialCatalogSessionState,
  type CatalogRestoreTarget,
  type CatalogSessionState,
} from "@/features/catalog/session/catalog-session-types";
import {
  CatalogMeta,
  CatalogPageItem,
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";
import { scrollToInstant, scrollToTopInstant } from "@/lib/client/page-scroll";
import type { CatalogShellInitial } from "@/lib/server/catalog-shell";

type UseCatalogSessionOptions = {
  catalogPage: string;
  setCatalogPage: (slug: string) => void;
  query: string;
  setMeta: React.Dispatch<React.SetStateAction<CatalogMeta>>;
  initial?: CatalogShellInitial;
};

const normalizeQueryKey = (query: string) => new URLSearchParams(query).toString();

const matchesInitialShell = (
  initial: CatalogShellInitial | undefined,
  query: string,
  catalogPage: string,
) =>
  Boolean(
    initial &&
      catalogPage === initial.catalogPage &&
      normalizeQueryKey(query) === normalizeQueryKey(initial.queryString),
  );

const buildBootstrapState = (
  initial: CatalogShellInitial | undefined,
  catalogPage: string,
  query: string,
): CatalogSessionState => {
  if (matchesInitialShell(initial, query, catalogPage) && initial) {
    return {
      ...createInitialCatalogSessionState(catalogPage, initial.queryString),
      products: initial.products,
      total: initial.total,
      status: "idle",
    };
  }
  return createInitialCatalogSessionState(catalogPage, query);
};

export function useCatalogSession({
  catalogPage,
  setCatalogPage,
  query,
  setMeta,
  initial,
}: UseCatalogSessionOptions) {
  const initialShellRef = useRef(initial);

  const skippedInitialMetaRef = useRef(false);
  const skippedInitialPagesRef = useRef(false);
  const skippedInitialShellRef = useRef(false);
  const restoreTargetRef = useRef<CatalogRestoreTarget | null>(null);
  const restorePagesDoneRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const catalogPageRef = useRef(catalogPage);
  const queryRef = useRef(query);

  const [state, dispatch] = useReducer(
    catalogSessionReducer,
    { initial, catalogPage, query },
    ({ initial: shell, catalogPage: page, query: q }) =>
      buildBootstrapState(shell, page, q),
  );

  const lastFetchedRef = useRef<{ query: string; page: number }>({
    query: matchesInitialShell(initial, query, catalogPage) && initial
      ? initial.queryString
      : "",
    page: matchesInitialShell(initial, query, catalogPage) ? 1 : 0,
  });

  const isRestoringReturn =
    state.status === "restoring" && !state.restoreScrollApplied;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (restoreTargetRef.current) return;

    const payload = readCatalogReturnPayload();
    if (!payload || payload.catalogPage !== catalogPage) return;
    if (payload.searchKey && normalizeQueryKey(payload.searchKey) !== normalizeQueryKey(query)) {
      return;
    }

    const loadedPages = Math.min(25, Math.max(1, payload.loadedPages));
    const scrollY = Math.max(0, payload.scrollY);
    if (loadedPages <= 1 && scrollY <= 0) {
      clearCatalogReturnPayload();
      return;
    }

    restoreTargetRef.current = {
      catalogPage: payload.catalogPage,
      scrollY,
      loadedPages,
      searchKey: payload.searchKey || query,
    };
    restorePagesDoneRef.current = false;
    dispatch({ type: "RESTORE_BEGIN", restore: restoreTargetRef.current });
  }, [catalogPage, query]);

  useEffect(() => {
    if (catalogPageRef.current === catalogPage) return;
    catalogPageRef.current = catalogPage;

    skippedInitialMetaRef.current = false;
    skippedInitialPagesRef.current = false;
    restoreTargetRef.current = null;
    restorePagesDoneRef.current = false;
    lastFetchedRef.current = { query: "", page: 0 };

    dispatch({ type: "VITRINE_CHANGE", catalogPage, searchKey: query });
  }, [catalogPage, query]);

  useEffect(() => {
    if (queryRef.current === query) return;
    const prevQuery = queryRef.current;
    queryRef.current = query;

    if (restoreTargetRef.current?.searchKey === query && !restorePagesDoneRef.current) {
      return;
    }

    if (prevQuery !== query) {
      restoreTargetRef.current = null;
      restorePagesDoneRef.current = false;
      lastFetchedRef.current = { query: "", page: 0 };
      if (typeof window !== "undefined") scrollToTopInstant();
      dispatch({ type: "USER_FILTER_CHANGE", searchKey: query });
    }
  }, [query, catalogPage]);

  useEffect(() => {
    const shell = initialShellRef.current;
    if (
      shell &&
      !skippedInitialPagesRef.current &&
      matchesInitialShell(shell, query, catalogPage) &&
      shell.catalogPages.length > 0
    ) {
      skippedInitialPagesRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      const pagesRes = await fetch("/api/products/catalog-pages");
      if (!pagesRes.ok) return;
      const safePages = normalizeCatalogPages(await pagesRes.json());
      if (cancelled) return;
      if (safePages.length && !safePages.some((p) => p.slug === catalogPage)) {
        const fallback = safePages.find((p) => p.isDefault) || safePages[0];
        setCatalogPage(fallback?.slug || "all");
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [catalogPage, initial?.catalogPage, query, setCatalogPage]);

  useEffect(() => {
    const shell = initialShellRef.current;
    if (
      shell &&
      !skippedInitialMetaRef.current &&
      matchesInitialShell(shell, query, catalogPage)
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
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setMeta(normalizeCatalogMeta(json));
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogPage, initial?.catalogPage, query, setMeta]);

  useEffect(() => {
    const shell = initialShellRef.current;
    if (skippedInitialShellRef.current) return;
    if (!matchesInitialShell(shell, query, catalogPage) || !shell) return;

    skippedInitialShellRef.current = true;

    const pendingRestore =
      restoreTargetRef.current?.catalogPage === catalogPage &&
      (restoreTargetRef.current?.loadedPages ?? 0) > 1 &&
      !restorePagesDoneRef.current;

    dispatch({
      type: "INIT_FROM_SHELL",
      catalogPage: shell.catalogPage,
      searchKey: shell.queryString,
      products: shell.products,
      total: shell.total,
    });

    if (pendingRestore) {
      dispatch({
        type: "RESTORE_BEGIN",
        restore: restoreTargetRef.current!,
      });
    }

    lastFetchedRef.current = { query: shell.queryString, page: 1 };
  }, [query, catalogPage]);

  useEffect(() => {
    const page = state.page;
    const needsRestore =
      !restorePagesDoneRef.current &&
      page === 1 &&
      restoreTargetRef.current?.catalogPage === catalogPage &&
      (restoreTargetRef.current?.loadedPages ?? 0) > 1;

    const alreadyFetched =
      lastFetchedRef.current.query === query && lastFetchedRef.current.page === page;

    if (!needsRestore && alreadyFetched) {
      return;
    }

    const generation = ++fetchGenerationRef.current;
    let cancelled = false;

    (async () => {
      dispatch({ type: "FETCH_START", page });

      try {
        if (needsRestore) {
          const snap = restoreTargetRef.current!;
          const wantPages = snap.loadedPages;
          const hasInitialPage = matchesInitialShell(initialShellRef.current, query, catalogPage);
          const pageNumbers = hasInitialPage
            ? Array.from({ length: wantPages - 1 }, (_, index) => index + 2)
            : Array.from({ length: wantPages }, (_, index) => index + 1);

          if (pageNumbers.length > 0) {
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

            const shell = initialShellRef.current;
            const baseProducts = hasInitialPage && shell ? shell.products : [];
            const extraItems = dedupeProductsById(
              responses.flatMap((json) => normalizeProductsResponse(json)),
            );
            const merged = dedupeProductsById([...baseProducts, ...extraItems]);
            const responseTotals = responses
              .map((json) => Number(json?.total) || 0)
              .filter((value) => value > 0);
            const bestTotal = Math.max(
              merged.length,
              ...responseTotals,
              shell?.total ?? 0,
            );

            dispatch({
              type: "RESTORE_PAGES_LOADED",
              products: merged,
              total: bestTotal,
              page: wantPages,
              searchKey: query,
            });

            lastFetchedRef.current = { query, page: wantPages };
            restorePagesDoneRef.current = true;
            return;
          }
          restorePagesDoneRef.current = true;
        }

        const params = new URLSearchParams(query);
        params.set("page", String(page));
        params.set("limit", String(CATALOG_PAGE_LIMIT));
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Не удалось загрузить данные каталога");
        const json = (await res.json()) as { total?: number };
        if (cancelled || generation !== fetchGenerationRef.current) return;

        const items = normalizeProductsResponse(json);
        dispatch({
          type: "FETCH_SUCCESS",
          page,
          searchKey: query,
          products: items,
          total: Number(json?.total) || 0,
          append: page > 1,
        });
        lastFetchedRef.current = { query, page };
      } catch (err) {
        if (!cancelled && generation === fetchGenerationRef.current) {
          dispatch({ type: "FETCH_ERROR", message: (err as Error).message });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, state.page, catalogPage]);

  useLayoutEffect(() => {
    if (state.status !== "restoring" || state.restoreScrollApplied) return;
    if (!restorePagesDoneRef.current && (restoreTargetRef.current?.loadedPages ?? 0) > 1) {
      return;
    }

    const snap = restoreTargetRef.current;
    if (!snap || snap.catalogPage !== catalogPage) {
      return;
    }

    const scrollY = snap.scrollY;
    const finishRestore = () => {
      if (scrollY > 0) {
        scrollToInstant(scrollY);
        requestAnimationFrame(() => {
          scrollToInstant(scrollY);
          requestAnimationFrame(() => scrollToInstant(scrollY));
        });
      }
      clearCatalogReturnPayload();
      restoreTargetRef.current = null;
      dispatch({ type: "RESTORE_SCROLL_APPLIED" });
    };

    if (snap.loadedPages > 1) {
      requestAnimationFrame(() => requestAnimationFrame(finishRestore));
    } else {
      finishRestore();
    }
  }, [
    state.status,
    state.restoreScrollApplied,
    state.products.length,
    catalogPage,
  ]);

  const catalogPages: CatalogPageItem[] =
    initial && matchesInitialShell(initial, query, catalogPage)
      ? initial.catalogPages
      : [];

  const setPage = (next: number | ((current: number) => number)) => {
    const value = typeof next === "function" ? next(state.page) : next;
    if (value > state.page) {
      dispatch({ type: "LOAD_MORE" });
    }
  };

  return {
    catalogPages,
    products: state.products,
    total: state.total,
    page: state.page,
    setPage,
    loading: state.status === "loading",
    loadingMore: state.status === "loading_more",
    error: state.error,
    isRestoringReturn,
  };
}
