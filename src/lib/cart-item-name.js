const { formatProductDisplayName } = require("./product-display-name");

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

const appendLabeledSuffix = (result, label, value, matchers = []) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return result;
  const suffix = `${label}: ${trimmed}`;
  const resultLower = result.toLowerCase();
  const suffixLower = suffix.toLowerCase();
  if (resultLower.includes(suffixLower)) return result;
  for (const matcher of matchers) {
    if (matcher && resultLower.includes(String(matcher).toLowerCase())) return result;
  }
  return result ? `${result} ${suffix}` : suffix;
};

const formatCartItemName = (
  name,
  color,
  finishName,
  glassOptionName,
  hardwareServices,
  productGlass,
) => {
  const finishValue = String(finishName || "").trim();
  const glassOptionValue = String(glassOptionName || "").trim();
  const hardwareValue = normalizeHardwareNames(hardwareServices);

  let result = formatProductDisplayName({
    name,
    color,
    glass: productGlass,
  });

  result = appendLabeledSuffix(result, "покрытие", finishValue, [
    finishValue,
    finishValue ? `покрытие: ${finishValue}` : "",
  ]);
  result = appendLabeledSuffix(result, "стекло", glassOptionValue, [
    glassOptionValue,
    glassOptionValue ? `стекло: ${glassOptionValue}` : "",
  ]);
  result = appendLabeledSuffix(result, "врезка", hardwareValue, [
    hardwareValue,
    hardwareValue ? `врезка: ${hardwareValue}` : "",
  ]);

  return result;
};

module.exports = {
  formatCartItemName,
};
