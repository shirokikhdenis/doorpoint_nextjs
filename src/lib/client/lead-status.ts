export const DEFAULT_LEAD_STATUS = "not_issued";

export const LEAD_STATUS_OPTIONS = [
  { value: "not_issued", label: "Не оформлена" },
  { value: "measure", label: "Замер" },
  { value: "issued", label: "Оформлена" },
  { value: "in_transit", label: "В пути" },
  { value: "in_stock", label: "На складе" },
  { value: "shipped", label: "Отгружена" },
] as const;

export type LeadStatus = (typeof LEAD_STATUS_OPTIONS)[number]["value"];

export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  LEAD_STATUS_OPTIONS.map((item) => [item.value, item.label]),
);

export const LEAD_STATUS_COLORS: Record<string, { background: string; color: string }> = {
  not_issued: { background: "#f4f4f5", color: "#3f3f46" },
  measure: { background: "#f3e8ff", color: "#6b21a8" },
  issued: { background: "#e0f2fe", color: "#075985" },
  in_transit: { background: "#ffedd5", color: "#9a3412" },
  in_stock: { background: "#fef9c3", color: "#854d0e" },
  shipped: { background: "#dcfce7", color: "#166534" },
};

export const LEAD_STATUS_BADGE: Record<string, string> = {
  not_issued: "bg-zinc-100 text-zinc-700",
  measure: "bg-purple-100 text-purple-800",
  issued: "bg-sky-100 text-sky-800",
  in_transit: "bg-orange-100 text-orange-800",
  in_stock: "bg-yellow-100 text-yellow-800",
  shipped: "bg-green-100 text-green-800",
};
