const doorManufacturerModulesRepository = require("../repositories/doorManufacturerModulesRepository");

const KNOWN_MANUFACTURERS = ["Аэлита"];

const mergeManufacturers = (fromDb) => {
  const seen = new Map();
  for (const name of [...KNOWN_MANUFACTURERS, ...fromDb.map((row) => row.manufacturerName)]) {
    const trimmed = String(name || "").trim();
    if (!trimmed) continue;
    seen.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "ru"));
};

const listAdminDoorManufacturerModules = async (query = {}) => {
  const manufacturer = String(query.manufacturer || "").trim();
  const rows = await doorManufacturerModulesRepository.listManufacturers();
  const manufacturers = mergeManufacturers(rows);
  const selected =
    rows.find((row) => row.manufacturerName.toLowerCase() === manufacturer.toLowerCase()) ||
    rows.find((row) => row.manufacturerName === "Аэлита") ||
    null;

  return {
    ok: true,
    manufacturers,
    modules: rows,
    selectedManufacturer: manufacturer || selected?.manufacturerName || manufacturers[0] || "",
    settings: selected,
  };
};

const updateAdminDoorManufacturerModules = async (body) => {
  const manufacturerName = String(body?.manufacturerName || "").trim();
  if (!manufacturerName) {
    return { ok: false, status: 400, message: "Укажите производителя" };
  }

  const settings = await doorManufacturerModulesRepository.upsertModules({
    manufacturerName,
    finishPickerEnabled: body?.finishPickerEnabled !== false,
    hardwareServicesEnabled: body?.hardwareServicesEnabled === true,
    glassOptionsEnabled: body?.glassOptionsEnabled === true,
  });

  if (!settings) {
    return { ok: false, status: 400, message: "Не удалось сохранить настройки модулей" };
  }

  return { ok: true, settings };
};

module.exports = {
  listAdminDoorManufacturerModules,
  updateAdminDoorManufacturerModules,
};
