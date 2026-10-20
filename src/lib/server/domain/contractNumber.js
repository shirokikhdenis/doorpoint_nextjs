const DEFAULT_NEXT_CONTRACT_NUMBER = "Д-000001";

/** Parse `Д-000123` / `42` as prefix + trailing digits; otherwise not a number. */
const parseTrailingContractNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], digits: match[2] };
};

/**
 * Walk recent contract numbers (newest first); take the first with a trailing
 * number and return that number + 1, keeping prefix and zero-padding.
 */
const suggestNextContractNumber = (
  contractNumbers,
  fallback = DEFAULT_NEXT_CONTRACT_NUMBER,
) => {
  const list = Array.isArray(contractNumbers) ? contractNumbers : [];
  for (const value of list) {
    const parsed = parseTrailingContractNumber(value);
    if (!parsed) continue;
    const nextDigits = String(Number(parsed.digits) + 1).padStart(parsed.digits.length, "0");
    return `${parsed.prefix}${nextDigits}`;
  }
  return fallback;
};

module.exports = {
  DEFAULT_NEXT_CONTRACT_NUMBER,
  parseTrailingContractNumber,
  suggestNextContractNumber,
};
