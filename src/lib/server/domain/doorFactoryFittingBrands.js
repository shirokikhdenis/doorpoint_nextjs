const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const FITTINGS_ROOT_SLUG = "fittings";

const normalizeName = (value) => String(value || "").trim();

const nameKey = (value) => normalizeName(value).toLowerCase();

const uniqueSortedNames = (names) => {
  const seen = new Map();
  for (const name of names || []) {
    const trimmed = normalizeName(name);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "ru"));
};

const buildAdminRows = ({ doorManufacturers, mappings }) => {
  const mapped = new Map(
    (mappings || []).map((row) => [
      nameKey(row.doorManufacturerName),
      normalizeName(row.fittingsManufacturerName),
    ]),
  );
  return uniqueSortedNames(doorManufacturers).map((doorManufacturerName) => ({
    doorManufacturerName,
    fittingsManufacturerName: mapped.get(nameKey(doorManufacturerName)) || "",
  }));
};

const normalizeSaveItems = ({ items, doorManufacturers, fittingsManufacturers }) => {
  const doorByKey = new Map(uniqueSortedNames(doorManufacturers).map((name) => [nameKey(name), name]));
  const fittingsByKey = new Map(
    uniqueSortedNames(fittingsManufacturers).map((name) => [nameKey(name), name]),
  );
  const seen = new Set();
  const result = [];

  for (const item of Array.isArray(items) ? items : []) {
    const doorKey = nameKey(item?.doorManufacturerName);
    const fittingsKey = nameKey(item?.fittingsManufacturerName);
    if (!doorKey || !doorByKey.has(doorKey) || seen.has(doorKey)) continue;
    seen.add(doorKey);
    if (!fittingsKey || !fittingsByKey.has(fittingsKey)) continue;
    result.push({
      doorManufacturerName: doorByKey.get(doorKey),
      fittingsManufacturerName: fittingsByKey.get(fittingsKey),
    });
  }

  return result;
};

module.exports = {
  INTERIOR_DOORS_CATEGORY_SLUG,
  FITTINGS_ROOT_SLUG,
  normalizeName,
  nameKey,
  uniqueSortedNames,
  buildAdminRows,
  normalizeSaveItems,
};
