const MOSCOW_TZ = "Europe/Moscow";
const EPOCH_MONDAY_UTC = Date.UTC(2020, 0, 6, 12);

const moscowCalendarParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: read("year"), month: read("month"), day: read("day") };
};

const getMoscowWeekIndex = (date = new Date()) => {
  const { year, month, day } = moscowCalendarParts(date);
  const current = Date.UTC(year, month - 1, day, 12);
  const days = Math.floor((current - EPOCH_MONDAY_UTC) / 86400000);
  return Math.floor(days / 7);
};

const pickCurrentProductId = (pool, now = new Date()) => {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const sorted = [...pool].sort(
    (left, right) =>
      (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0) ||
      (Number(left.productId) || 0) - (Number(right.productId) || 0),
  );
  const weekIndex = getMoscowWeekIndex(now);
  return Number(sorted[weekIndex % sorted.length]?.productId) || null;
};

const clampDiscountPercent = (value, fallback = 10) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, n));
};

const applyDoorOfWeekDiscount = (basePrice, discountPercent) => {
  const base = Math.max(0, Math.floor(Number(basePrice) || 0));
  const pct = clampDiscountPercent(discountPercent);
  const price = Math.round((base * (100 - pct)) / 100);
  return {
    price,
    compareAtPrice: base,
    isOnSale: true,
    discountPercent: pct,
  };
};

const getMoscowWeekday = (date = new Date()) => {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: MOSCOW_TZ,
    weekday: "short",
  }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[dayName] ?? 0;
};

const addCalendarDays = ({ year, month, day }, days) => {
  const next = new Date(Date.UTC(year, month - 1, day, 12));
  next.setUTCDate(next.getUTCDate() + days);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
};

const moscowLocalToUtcMs = (year, month, day, hour = 0, minute = 0, second = 0) => {
  const pad = (value) => String(value).padStart(2, "0");
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+03:00`;
  return new Date(iso).getTime();
};

const getNextMondayMoscowParts = (now = new Date()) => {
  const parts = moscowCalendarParts(now);
  const dow = getMoscowWeekday(now);
  const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow;
  return addCalendarDays(parts, daysUntilMonday);
};

const getNextMondayMoscowEndsAt = (now = new Date()) => {
  const target = getNextMondayMoscowParts(now);
  return moscowLocalToUtcMs(target.year, target.month, target.day, 0, 0, 0);
};

const getNextMondayMoscowLabel = (now = new Date()) => {
  const target = getNextMondayMoscowParts(now);
  return new Date(Date.UTC(target.year, target.month - 1, target.day, 12)).toLocaleDateString(
    "ru-RU",
    {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
};

const getNextMondayMoscowEndsAtIso = (now = new Date()) =>
  new Date(getNextMondayMoscowEndsAt(now)).toISOString();

const DOOR_OF_WEEK_SLOTS = [1, 2];

const normalizeDoorOfWeekSlot = (slot) => {
  const numeric = Number(slot);
  return DOOR_OF_WEEK_SLOTS.includes(numeric) ? numeric : null;
};

module.exports = {
  DOOR_OF_WEEK_SLOTS,
  normalizeDoorOfWeekSlot,
  getMoscowWeekIndex,
  pickCurrentProductId,
  clampDiscountPercent,
  applyDoorOfWeekDiscount,
  getNextMondayMoscowLabel,
  getNextMondayMoscowEndsAt,
  getNextMondayMoscowEndsAtIso,
};
