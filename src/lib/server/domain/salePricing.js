const SALE_MODE_MINUS_PERCENT = "minus_percent";
const SALE_MODE_PLUS_PERCENT = "plus_percent";

const DEFAULT_SALE_SETTINGS = {
  mode: SALE_MODE_MINUS_PERCENT,
  percent: 10,
};

const clampPercent = (value) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_SALE_SETTINGS.percent;
  return Math.min(99, Math.max(1, n));
};

const normalizeMode = (mode) =>
  mode === SALE_MODE_PLUS_PERCENT ? SALE_MODE_PLUS_PERCENT : SALE_MODE_MINUS_PERCENT;

const normalizeSaleSettings = (raw) => ({
  mode: normalizeMode(raw?.mode),
  percent: clampPercent(raw?.percent ?? DEFAULT_SALE_SETTINGS.percent),
});

/**
 * Включение акции по правилам:
 * - minus_percent: текущая цена → compare_at, новая = base − N%
 * - plus_percent: compare_at = base + N%, цена на полке (price) = base
 */
const applySaleRulesOn = (basePrice, settings) => {
  const base = Math.round(Number(basePrice));
  if (!Number.isFinite(base) || base <= 0) {
    return { error: "Некорректная цена товара" };
  }

  const { mode, percent } = normalizeSaleSettings(settings);
  const factor = percent / 100;

  if (mode === SALE_MODE_PLUS_PERCENT) {
    const compareAtPrice = Math.max(base + 1, Math.round(base * (1 + factor)));
    return {
      price: base,
      compareAtPrice,
      saleBasePrice: base,
    };
  }

  const price = Math.max(1, Math.round(base * (1 - factor)));
  const compareAtPrice = base;
  if (compareAtPrice <= price) {
    return { error: "Скидка слишком большая — новая цена должна быть ниже старой" };
  }

  return {
    price,
    compareAtPrice,
    saleBasePrice: base,
  };
};

/** Снятие акции: восстанавливаем цену до акции (sale_base_price или compare_at). */
const applySaleRulesOff = ({ price, compareAtPrice, saleBasePrice }) => {
  const restored =
    saleBasePrice != null && Number.isFinite(Number(saleBasePrice))
      ? Math.round(Number(saleBasePrice))
      : compareAtPrice != null && Number.isFinite(Number(compareAtPrice))
        ? Math.round(Number(compareAtPrice))
        : Math.round(Number(price));

  return {
    price: Math.max(1, restored),
    compareAtPrice: null,
    saleBasePrice: null,
  };
};

const readSaleBasePrice = (attrs) => {
  if (!attrs || typeof attrs !== "object") return null;
  const raw = attrs.sale_base_price;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const withSaleBasePrice = (attrs, saleBasePrice) => {
  const next = { ...(attrs && typeof attrs === "object" ? attrs : {}) };
  if (saleBasePrice == null) {
    delete next.sale_base_price;
  } else {
    next.sale_base_price = saleBasePrice;
  }
  return next;
};

const describeSaleRule = (settings) => {
  const { mode, percent } = normalizeSaleSettings(settings);
  if (mode === SALE_MODE_PLUS_PERCENT) {
    return `Старая цена = текущая +${percent}%, новая цена = текущая`;
  }
  return `Старая цена = текущая, новая цена = текущая −${percent}%`;
};

module.exports = {
  SALE_MODE_MINUS_PERCENT,
  SALE_MODE_PLUS_PERCENT,
  DEFAULT_SALE_SETTINGS,
  normalizeSaleSettings,
  applySaleRulesOn,
  applySaleRulesOff,
  readSaleBasePrice,
  withSaleBasePrice,
  describeSaleRule,
};
