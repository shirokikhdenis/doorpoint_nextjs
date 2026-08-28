const appendToken = (result, token) => {
  const value = String(token || "").trim();
  if (!value) return result;

  const resultLower = result.toLowerCase();
  const valueLower = value.toLowerCase();
  if (resultLower === valueLower) return result;
  if (resultLower.endsWith(` ${valueLower}`)) return result;
  if (resultLower.includes(` ${valueLower} `)) return result;

  return result ? `${result} ${value}` : value;
};

/** Наименование товара с цветом и стеклом через пробел: «Браво-50 Look Art Magic Fog». */
const formatProductDisplayName = ({ name, color, glass } = {}) => {
  let result = String(name || "").trim() || "—";
  result = appendToken(result, color);
  result = appendToken(result, glass);
  return result;
};

module.exports = {
  appendToken,
  formatProductDisplayName,
};
