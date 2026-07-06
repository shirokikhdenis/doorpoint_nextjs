import { stockToneClass } from "@/lib/promet-stock-utils";

export {
  extractGroups,
  formatDate,
  formatNum,
  getFilteredRows,
  getRowByProductId,
  getStockValue,
  getWarehouseBreakdown,
  getWarehouses,
  resolveDefaultGroup,
  resolveDefaultWarehouse,
  sortRows,
  warehouseLabel,
} from "@/lib/promet-stock-utils";

export function stockAdminToneClass(v: number): string {
  return stockToneClass(v, "text-admin-text-muted");
}

// Backward-compatible alias for admin table
export { stockAdminToneClass as stockToneClass };
