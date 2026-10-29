export const DEFAULT_PRODUCT_FLAG_COLOR = "#f59e0b";
export const PRODUCT_FLAG_LABEL_MAX_LEN = 24;

export const PRODUCT_FLAG_COLOR_PRESETS = [
  "#f59e0b",
  "#e11d48",
  "#059669",
  "#0284c7",
  "#18181b",
] as const;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const normalizeClientFlagLabel = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PRODUCT_FLAG_LABEL_MAX_LEN)
    .trim();

export const normalizeClientFlagColor = (raw: unknown, fallback = DEFAULT_PRODUCT_FLAG_COLOR): string => {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  const withHash = value.startsWith("#") ? value : `#${value}`;
  if (!HEX_COLOR_RE.test(withHash)) return fallback;
  return withHash.toLowerCase();
};

export const parseProductFlag = (
  labelRaw: unknown,
  colorRaw: unknown,
): { flagLabel?: string; flagColor?: string } => {
  const flagLabel = normalizeClientFlagLabel(labelRaw);
  if (!flagLabel) return {};
  return {
    flagLabel,
    flagColor: normalizeClientFlagColor(colorRaw),
  };
};
