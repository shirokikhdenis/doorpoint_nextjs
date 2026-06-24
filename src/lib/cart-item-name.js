const formatCartItemName = (name, color, finishName) => {
  const base = String(name || "").trim();
  const colorValue = String(color || "").trim();
  const finishValue = String(finishName || "").trim();

  let result = base;
  if (colorValue) {
    const baseLower = result.toLowerCase();
    const colorLower = colorValue.toLowerCase();
    if (!baseLower.endsWith(colorLower) && !baseLower.includes(` ${colorLower}`)) {
      result = result ? `${result} ${colorValue}` : colorValue;
    }
  }

  if (finishValue) {
    const resultLower = result.toLowerCase();
    const finishLower = finishValue.toLowerCase();
    const finishSuffix = `покрытие: ${finishValue}`;
    if (
      !resultLower.includes(finishLower) &&
      !resultLower.includes(`покрытие: ${finishLower}`)
    ) {
      result = result ? `${result} · ${finishSuffix}` : finishSuffix;
    }
  }

  return result;
};

module.exports = {
  formatCartItemName,
};
