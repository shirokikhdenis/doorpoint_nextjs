const normalizeHardwareNames = (hardwareServices) => {
  if (!hardwareServices) return "";
  if (typeof hardwareServices === "string") return hardwareServices.trim();
  if (!Array.isArray(hardwareServices)) return "";
  return hardwareServices
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") return String(entry.name || "").trim();
      return "";
    })
    .filter(Boolean)
    .join(", ");
};

const appendSuffix = (result, suffix, matchers = []) => {
  if (!suffix) return result;
  const resultLower = result.toLowerCase();
  const suffixLower = suffix.toLowerCase();
  if (resultLower.includes(suffixLower)) return result;
  for (const matcher of matchers) {
    if (matcher && resultLower.includes(String(matcher).toLowerCase())) return result;
  }
  return result ? `${result} · ${suffix}` : suffix;
};

const formatCartItemName = (
  name,
  color,
  finishName,
  glassOptionName,
  hardwareServices,
) => {
  const base = String(name || "").trim();
  const colorValue = String(color || "").trim();
  const finishValue = String(finishName || "").trim();
  const glassValue = String(glassOptionName || "").trim();
  const hardwareValue = normalizeHardwareNames(hardwareServices);

  let result = base;
  if (colorValue) {
    const baseLower = result.toLowerCase();
    const colorLower = colorValue.toLowerCase();
    if (!baseLower.endsWith(colorLower) && !baseLower.includes(` ${colorLower}`)) {
      result = result ? `${result} ${colorValue}` : colorValue;
    }
  }

  result = appendSuffix(result, finishValue ? `покрытие: ${finishValue}` : "", [
    finishValue,
    finishValue ? `покрытие: ${finishValue}` : "",
  ]);
  result = appendSuffix(result, glassValue ? `стекло: ${glassValue}` : "", [
    glassValue,
    glassValue ? `стекло: ${glassValue}` : "",
  ]);
  result = appendSuffix(result, hardwareValue ? `врезка: ${hardwareValue}` : "", [
    hardwareValue,
    hardwareValue ? `врезка: ${hardwareValue}` : "",
  ]);

  return result;
};

module.exports = {
  formatCartItemName,
};
