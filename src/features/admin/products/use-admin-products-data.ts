"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HitFilter,
  ProductsTableResponse,
  SaleFilter,
} from "./types";

type UseAdminProductsDataOptions = {
  page: number;
  limit: number;
  appliedSearch: string;
  categoryId: number;
  subcategoryId: number;
  appliedManufacturer: string;
  appliedAttrCode: string;
  appliedAttrValue: string;
  hitFilter: HitFilter;
  saleFilter: SaleFilter;
  reloadToken: number;
};

export function useAdminProductsData({
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
}: UseAdminProductsDataOptions) {
  const [data, setData] = useState<ProductsTableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
      if (categoryId) params.set("categoryId", String(categoryId));
      if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
      if (appliedManufacturer.trim()) params.set("manufacturer", appliedManufacturer.trim());
      if (appliedAttrCode.trim() && appliedAttrValue.trim()) {
        params.set(`attr_${appliedAttrCode.trim()}`, appliedAttrValue.trim());
      }
      if (hitFilter === "yes") params.set("hit", "1");
      else if (hitFilter === "no") params.set("hit", "0");
      if (saleFilter === "yes") params.set("onSale", "1");
      else if (saleFilter === "no") params.set("onSale", "0");

      try {
        const response = await fetch(`/api/admin/products-table?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = (await response.json()) as ProductsTableResponse;
        if (!cancelled) setData(json);
      } catch (caught) {
        if (cancelled || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
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
  ]);

  const attributes = data?.attributes || [];
  const productAttributes = useMemo(
    () => attributes.filter((attribute) => !attribute.isVariantAxis),
    [attributes],
  );

  return {
    data,
    loading,
    error,
    attributes,
    productAttributes,
    rows: data?.rows || [],
  };
}
