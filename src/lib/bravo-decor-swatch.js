/** Normalize Bravo decor / color titles for lookup. */
const normalizeDecorKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[_./\\]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Replace color-chip door photos with Bravo coating texture URLs when known.
 * @param {Array<{ color?: string, image?: string }>} entries
 * @param {Map<string, string> | Record<string, string> | null | undefined} swatchByKey
 */
const applyBravoDecorSwatches = (entries, swatchByKey) => {
  if (!Array.isArray(entries) || entries.length === 0) return entries || [];
  if (!swatchByKey) return entries;

  const lookup =
    swatchByKey instanceof Map
      ? (key) => swatchByKey.get(key)
      : (key) => swatchByKey[key];

  return entries.map((entry) => {
    const key = normalizeDecorKey(entry?.color);
    if (!key) return entry;
    const image = String(lookup(key) || "").trim();
    if (!image) return entry;
    return { ...entry, image };
  });
};

/**
 * Keep product photo in `image`, put coating pictogram into `swatch`
 * (for catalog cards that switch the main photo).
 */
const withBravoSwatchField = (entries, swatchByKey) => {
  if (!Array.isArray(entries) || entries.length === 0) return entries || [];
  if (!swatchByKey) {
    return entries.map((entry) => ({ ...entry, swatch: String(entry?.image || "") }));
  }
  const lookup =
    swatchByKey instanceof Map
      ? (key) => swatchByKey.get(key)
      : (key) => swatchByKey[key];

  return entries.map((entry) => {
    const key = normalizeDecorKey(entry?.color);
    const pictogram = key ? String(lookup(key) || "").trim() : "";
    return {
      ...entry,
      swatch: pictogram || String(entry?.image || ""),
    };
  });
};

module.exports = {
  normalizeDecorKey,
  applyBravoDecorSwatches,
  withBravoSwatchField,
};
