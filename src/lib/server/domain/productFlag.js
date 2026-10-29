/** Произвольный флажок на карточке: текст + цвет (независим от badges hit/sale). */

const DEFAULT_FLAG_COLOR = "#f59e0b";
const FLAG_LABEL_MAX_LEN = 24;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const normalizeFlagLabel = (raw) => {
  const label = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, FLAG_LABEL_MAX_LEN)
    .trim();
  return label || null;
};

const normalizeFlagColor = (raw, { allowEmpty = false } = {}) => {
  const value = String(raw ?? "").trim();
  if (!value) return allowEmpty ? null : DEFAULT_FLAG_COLOR;
  const withHash = value.startsWith("#") ? value : `#${value}`;
  if (!HEX_COLOR_RE.test(withHash)) return allowEmpty ? null : DEFAULT_FLAG_COLOR;
  return withHash.toLowerCase();
};

/** Пустой текст → оба null. Иначе label + валидный цвет (или дефолт). */
const normalizeProductFlag = ({ flagLabel, flagColor } = {}) => {
  const label = normalizeFlagLabel(flagLabel);
  if (!label) {
    return { flagLabel: null, flagColor: null };
  }
  return {
    flagLabel: label,
    flagColor: normalizeFlagColor(flagColor),
  };
};

module.exports = {
  DEFAULT_FLAG_COLOR,
  FLAG_LABEL_MAX_LEN,
  normalizeFlagLabel,
  normalizeFlagColor,
  normalizeProductFlag,
};
