const SERVICE_LINE_RE = /(монтаж|доставка)/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_BRIGADE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

const isServiceLineName = (name) => SERVICE_LINE_RE.test(String(name || ""));

const buildDoorsSummary = (items) => {
  if (!Array.isArray(items)) return "";
  return items
    .filter((item) => {
      if (item?.productId) return true;
      return !isServiceLineName(item?.name);
    })
    .map((item) => {
      const name = String(item.name || "").trim();
      const color = String(item.color || "").trim();
      const qty = Number(item.quantity) || 1;
      const label = [name, color].filter(Boolean).join(" ");
      if (!label) return "";
      return qty > 1 ? `${label} × ${qty}` : label;
    })
    .filter(Boolean)
    .join("\n");
};

const parseInstallDate = (value) => {
  const raw = String(value || "").trim();
  const match = DATE_RE.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return raw;
};

const resolveInstallEndDate = (startDate, endValue) => {
  const start = parseInstallDate(startDate);
  if (!start) return null;
  const raw = String(endValue || "").trim();
  if (!raw) return start;
  const end = parseInstallDate(raw);
  if (!end || end < start) return null;
  return end;
};

const parseBrigadeColor = (value, fallback = "#2563eb") => {
  const raw = String(value || "").trim();
  if (COLOR_RE.test(raw)) return raw.toLowerCase();
  return fallback;
};

const nextBrigadeColor = (index) =>
  DEFAULT_BRIGADE_COLORS[Math.abs(Number(index) || 0) % DEFAULT_BRIGADE_COLORS.length];

const parseCalendarEntryKind = (value, fallback = "install") => {
  const raw = String(value || "").trim();
  if (raw === "delivery" || raw === "install") return raw;
  return fallback;
};

module.exports = {
  DEFAULT_BRIGADE_COLORS,
  buildDoorsSummary,
  isServiceLineName,
  nextBrigadeColor,
  parseBrigadeColor,
  parseCalendarEntryKind,
  parseInstallDate,
  resolveInstallEndDate,
};
