export type ProductsExportMode = "import" | "full";

export type ProductsExportFilters = {
  search?: string;
  categoryId?: number;
  subcategoryId?: number;
  manufacturer?: string;
  hit?: "yes" | "no" | "";
  sale?: "yes" | "no" | "";
  attrCode?: string;
  attrValue?: string;
};

const buildExportSearchParams = (
  filters: ProductsExportFilters,
  mode: ProductsExportMode,
  ids?: number[],
) => {
  const params = new URLSearchParams();
  params.set("mode", mode);

  if (ids && ids.length > 0) {
    params.set("ids", ids.join(","));
    return params;
  }

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters.subcategoryId) params.set("subcategoryId", String(filters.subcategoryId));
  if (filters.manufacturer?.trim()) params.set("manufacturer", filters.manufacturer.trim());
  if (filters.hit === "yes") params.set("hit", "1");
  else if (filters.hit === "no") params.set("hit", "0");
  if (filters.sale === "yes") params.set("onSale", "1");
  else if (filters.sale === "no") params.set("onSale", "0");
  if (filters.attrCode?.trim() && filters.attrValue?.trim()) {
    params.set(`attr_${filters.attrCode.trim()}`, filters.attrValue.trim());
  }

  return params;
};

const parseFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
};

export const downloadProductsCsv = async ({
  filters,
  mode,
  ids,
}: {
  filters?: ProductsExportFilters;
  mode: ProductsExportMode;
  ids?: number[];
}) => {
  const params = buildExportSearchParams(filters || {}, mode, ids);
  const response = await fetch(`/api/admin/products/export?${params.toString()}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload.message === "string" ? payload.message : `Ошибка экспорта (${response.status})`,
    );
  }

  const blob = await response.blob();
  const filename = parseFilename(
    response.headers.get("content-disposition"),
    `catalog-${mode}-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
