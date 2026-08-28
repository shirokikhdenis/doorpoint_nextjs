export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const DELIVERY_CHIP_COLOR = "#0f766e";

export const BRIGADE_COLOR_OPTIONS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const pad = (value: number) => String(value).padStart(2, "0");

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayIsoDate = () => toIsoDate(new Date());

export const monthBounds = (year: number, month: number) => {
  const last = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(last)}`,
  };
};

export const eachIsoDate = (from: string, to: string): string[] => {
  if (!from || !to || from > to) return from ? [from] : [];
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const formatDateRangeLabel = (from: string, to: string) => {
  if (!from || !to || from === to) return "";
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const startDay = start.getDate();
  const endDay = end.getDate();
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startDay}–${endDay}`;
  }
  return `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
};

export const formatUpcomingDateLabel = (from: string, to = "") => {
  if (!from) return "";
  const start = new Date(`${from}T00:00:00`);
  if (Number.isNaN(start.getTime())) return from;
  const endIso = to && to !== from ? to : "";
  if (!endIso) {
    return start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }
  const range = formatDateRangeLabel(from, endIso);
  const end = new Date(`${endIso}T00:00:00`);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${range} ${start.toLocaleDateString("ru-RU", { month: "short" })}`;
  }
  return range;
};

export const scheduleJobHref = (item: {
  id: number;
  installDate: string;
  installEndDate?: string;
}) => {
  const today = todayIsoDate();
  const start = item.installDate;
  const end = item.installEndDate || item.installDate;
  const date = today >= start && today <= end ? today : start;
  return `/admin/install-calendar?date=${encodeURIComponent(date)}&job=${item.id}`;
};

export const scheduleCreateHref = (kind: "install" | "delivery", leadId: number) =>
  `/admin/install-calendar?kind=${kind}&leadId=${leadId}`;

export const monthTitle = (year: number, month: number) => {
  const raw = new Date(year, month, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export type CalendarCell = {
  date: string;
  inMonth: boolean;
  day: number;
};

export const buildMonthGrid = (year: number, month: number): CalendarCell[] => {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: toIsoDate(date),
      inMonth: date.getMonth() === month,
      day: date.getDate(),
    };
  });
};
