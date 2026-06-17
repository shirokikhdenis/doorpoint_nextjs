const formatCartItemName = (name, color) => {
  const base = String(name || "").trim();
  const colorValue = String(color || "").trim();
  if (!colorValue) return base;
  if (!base) return colorValue;

  const baseLower = base.toLowerCase();
  const colorLower = colorValue.toLowerCase();
  if (baseLower.endsWith(colorLower) || baseLower.includes(` ${colorLower}`)) {
    return base;
  }

  return `${base} ${colorValue}`;
};

module.exports = {
  formatCartItemName,
};
