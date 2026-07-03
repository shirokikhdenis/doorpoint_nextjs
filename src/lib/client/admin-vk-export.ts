import type { ProductsExportFilters } from "@/lib/client/admin-products-export";

export type VkExportScope = "filtered" | "selected";

export type VkExportRequest = {
  scope: VkExportScope;
  selectedIds?: number[];
  dryRun?: boolean;
  search?: string;
  categoryId?: number;
  subcategoryId?: number;
  manufacturer?: string;
  hit?: boolean;
  onSale?: boolean;
  attributeFilters?: Record<string, string>;
};

const buildVkExportBody = (
  filters: ProductsExportFilters,
  scope: VkExportScope,
  selectedIds?: number[],
): VkExportRequest => ({
  scope,
  selectedIds: scope === "selected" ? selectedIds : undefined,
  search: filters.search,
  categoryId: filters.categoryId,
  subcategoryId: filters.subcategoryId,
  manufacturer: filters.manufacturer,
  hit: filters.hit === "yes" ? true : filters.hit === "no" ? false : undefined,
  onSale: filters.sale === "yes" ? true : filters.sale === "no" ? false : undefined,
  attributeFilters:
    filters.attrCode?.trim() && filters.attrValue?.trim()
      ? { [filters.attrCode.trim()]: filters.attrValue.trim() }
      : undefined,
});

export type VkExportError = {
  productId: number;
  sku: string;
  reason: string;
};

export type VkExportResult = {
  ok?: boolean;
  operationId: string;
  dryRun: boolean;
  total: number;
  exportable: number;
  created: number;
  updated: number;
  skippedUnchanged: number;
  skippedInactive: number;
  skippedNoImage: number;
  failed: number;
  errors: VkExportError[];
  message?: string;
};

export const exportProductsToVk = async ({
  filters,
  scope,
  selectedIds,
  dryRun = false,
}: {
  filters: ProductsExportFilters;
  scope: VkExportScope;
  selectedIds?: number[];
  dryRun?: boolean;
}): Promise<VkExportResult> => {
  const response = await fetch("/api/admin/vk/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...buildVkExportBody(filters, scope, selectedIds),
      dryRun,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as VkExportResult & { message?: string };
  if (!response.ok) {
    throw new Error(typeof payload.message === "string" ? payload.message : `Ошибка VK (${response.status})`);
  }
  return payload;
};

export const formatVkExportSummary = (result: VkExportResult) => {
  const parts = [
    `к выгрузке: ${result.exportable}`,
    `создано: ${result.created}`,
    `обновлено: ${result.updated}`,
    `без изменений: ${result.skippedUnchanged}`,
    `ошибок: ${result.failed}`,
  ];
  if (result.skippedInactive > 0) parts.push(`неактивных: ${result.skippedInactive}`);
  if (result.skippedNoImage > 0) parts.push(`без фото: ${result.skippedNoImage}`);
  return parts.join(", ");
};
