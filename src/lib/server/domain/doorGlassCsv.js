const { parseCsv, getCsvRowValue } = require("./doorFinishCsv");

const GLASS_CSV_COLUMNS = [
  "manufacturer",
  "parent_sku",
  "glass_name",
  "price_delta",
  "sort_order",
  "is_active",
];

const parseActiveFlag = (value, defaultValue = true) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  const raw = String(value).trim().toLowerCase();
  if (["0", "false", "no", "нет", "n"].includes(raw)) return false;
  if (["1", "true", "yes", "да", "y"].includes(raw)) return true;
  return defaultValue;
};

module.exports = {
  GLASS_CSV_COLUMNS,
  parseCsv,
  getCsvRowValue,
  parseActiveFlag,
};
