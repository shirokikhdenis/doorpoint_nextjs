const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";
const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";

const DEFAULT_HEADLINE = "Входные и межкомнатные двери";
const DEFAULT_SUBHEAD =
  "Бесплатный замер · Более 150 образцов в салоне · Доставка и монтаж под ключ";
const DEFAULT_COUPON_TEXT = "Скидка 5% на монтаж при предъявлении этого буклета";
const QR_HINT_TEXT = "Каталог и отзывы на сайте";
const MAX_HEADLINE_LEN = 80;
const MAX_SUBHEAD_LEN = 120;
const MAX_COUPON_LEN = 100;

const HEADLINE_PRESETS = [
  { id: "default", label: "Общий", headline: DEFAULT_HEADLINE },
  {
    id: "sale",
    label: "Сезонная распродажа",
    headline: "Сезонная распродажа дверей",
  },
  {
    id: "newcomers",
    label: "Для новоселов",
    headline: "Двери для новоселов в Архангельске",
  },
  {
    id: "thermo",
    label: "С терморазрывом",
    headline: "Входные двери с терморазрывом",
  },
  {
    id: "interior",
    label: "Межкомнатные",
    headline: "Межкомнатные двери в наличии и под заказ",
  },
];

const BOOKLET_FORMATS = [
  {
    id: "a4",
    label: "A4 листовка",
    description: "Одна страница 210×297 мм",
    widthMm: 210,
    heightMm: 297,
    maxEntry: 4,
    maxInterior: 4,
    kind: "flyer",
    productsPerPage: 0,
  },
  {
    id: "a5",
    label: "A5 листовка",
    description: "Одна страница 148×210 мм",
    widthMm: 148,
    heightMm: 210,
    maxEntry: 2,
    maxInterior: 2,
    kind: "flyer",
    productsPerPage: 0,
  },
  {
    id: "a5-booklet",
    label: "A5 буклет",
    description: "Несколько страниц 148×210 мм",
    widthMm: 148,
    heightMm: 210,
    maxEntry: 8,
    maxInterior: 8,
    kind: "booklet",
    productsPerPage: 4,
  },
];

const getFormatById = (id) => BOOKLET_FORMATS.find((item) => item.id === id) || null;

const clipText = (raw, maxLen) =>
  String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);

const clipHeadline = (raw) => clipText(raw, MAX_HEADLINE_LEN);
const clipSubhead = (raw) => clipText(raw, MAX_SUBHEAD_LEN);
const clipCoupon = (raw) => clipText(raw, MAX_COUPON_LEN);

const uniquePositiveInts = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const ids = [];
  const seen = new Set();
  for (const item of list) {
    const numeric = Number(item);
    if (!Number.isInteger(numeric) || numeric <= 0 || seen.has(numeric)) continue;
    seen.add(numeric);
    ids.push(numeric);
  }
  return ids;
};

const doorKindFromSlug = (slug) => {
  const value = String(slug || "").trim();
  if (value === ENTRY_DOORS_CATEGORY_SLUG) return "entry";
  if (value === INTERIOR_DOORS_CATEGORY_SLUG) return "interior";
  return null;
};

const chunkItems = (items, size) => {
  const list = Array.isArray(items) ? items : [];
  const chunkSize = Number(size);
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) return [];
  const out = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    out.push(list.slice(i, i + chunkSize));
  }
  return out;
};

const pad2 = (value) => String(value).padStart(2, "0");

const buildBookletFilename = (formatId, date = new Date()) => {
  const stamp = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const slug = String(formatId || "a4").replace(/[^a-z0-9-]+/gi, "") || "a4";
  return `buklet-${slug}-${stamp}.pdf`;
};

module.exports = {
  ENTRY_DOORS_CATEGORY_SLUG,
  INTERIOR_DOORS_CATEGORY_SLUG,
  DEFAULT_HEADLINE,
  DEFAULT_SUBHEAD,
  DEFAULT_COUPON_TEXT,
  QR_HINT_TEXT,
  MAX_HEADLINE_LEN,
  MAX_SUBHEAD_LEN,
  MAX_COUPON_LEN,
  HEADLINE_PRESETS,
  BOOKLET_FORMATS,
  getFormatById,
  clipText,
  clipHeadline,
  clipSubhead,
  clipCoupon,
  uniquePositiveInts,
  doorKindFromSlug,
  chunkItems,
  buildBookletFilename,
};
