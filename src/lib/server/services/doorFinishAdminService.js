const doorFinishRepository = require("../repositories/doorFinishRepository");
const doorFinishPickerSettingsRepository = require("../repositories/doorFinishPickerSettingsRepository");
const {
  FINISH_GROUP_LABELS,
  FINISH_GROUP_ORDER,
  resolveGroupKey,
} = require("../domain/doorFinishes");
const {
  listDoorFinishPickerTemplates,
  normalizeDoorFinishPickerSettings,
} = require("../domain/doorFinishPickerSettings");
const { getCsvRowValue } = require("../domain/doorFinishCsv");

const normalizeGroupKey = (value) => resolveGroupKey(value);

const KNOWN_FINISH_MANUFACTURERS = ["Аэлита"];

const mergeManufacturers = (fromDb) => {
  const seen = new Map();
  for (const name of [...KNOWN_FINISH_MANUFACTURERS, ...fromDb]) {
    const trimmed = String(name || "").trim();
    if (!trimmed) continue;
    seen.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "ru"));
};

const listAdminDoorFinishes = async (query = {}) => {
  const manufacturer = String(query.manufacturer || "").trim();
  const activeOnly = String(query.activeOnly || "").trim() === "1";

  const [manufacturers, finishes, pickerSettings] = await Promise.all([
    doorFinishRepository.listManufacturers(),
    doorFinishRepository.listFinishes({
      manufacturerName: manufacturer,
      activeOnly,
    }),
    doorFinishPickerSettingsRepository.getDoorFinishPickerSettings(),
  ]);

  return {
    ok: true,
    manufacturers: mergeManufacturers(manufacturers),
    groupOrder: FINISH_GROUP_ORDER,
    groupLabels: FINISH_GROUP_LABELS,
    finishes,
    selectedManufacturer: manufacturer,
    pickerTemplates: listDoorFinishPickerTemplates(),
    pickerSettings,
  };
};

const validateFinishPayload = (body, { requireName = true } = {}) => {
  const manufacturerName = String(body?.manufacturerName || "").trim();
  const name = String(body?.name || "").trim();
  const groupKey = normalizeGroupKey(body?.groupKey);
  const imageUrl = String(body?.imageUrl || "").trim();
  const priceDelta = Math.round(Number(body?.priceDelta) || 0);
  const sortOrder = Number(body?.sortOrder) || 0;
  const isActive = body?.isActive !== false;

  if (!manufacturerName) {
    return { ok: false, status: 400, message: "Укажите производителя" };
  }
  if (requireName && !name) {
    return { ok: false, status: 400, message: "Укажите название покрытия" };
  }

  return {
    ok: true,
    value: {
      manufacturerName,
      name,
      groupKey,
      imageUrl,
      priceDelta,
      sortOrder,
      isActive,
    },
  };
};

const createAdminDoorFinish = async (body) => {
  const validated = validateFinishPayload(body);
  if (!validated.ok) return validated;

  const finish = await doorFinishRepository.upsertFinish(validated.value);
  if (!finish) {
    return { ok: false, status: 400, message: "Не удалось создать покрытие" };
  }
  return { ok: true, finish };
};

const updateAdminDoorFinish = async (id, body) => {
  const existing = await doorFinishRepository.getById(id);
  if (!existing) {
    return { ok: false, status: 404, message: "Покрытие не найдено" };
  }

  const validated = validateFinishPayload(
    {
      manufacturerName: body?.manufacturerName ?? existing.manufacturerName,
      name: body?.name ?? existing.name,
      groupKey: body?.groupKey ?? existing.groupKey,
      imageUrl: body?.imageUrl ?? existing.imageUrl,
      priceDelta: body?.priceDelta ?? existing.priceDelta,
      sortOrder: body?.sortOrder ?? existing.sortOrder,
      isActive: body?.isActive ?? existing.isActive,
    },
    { requireName: true },
  );
  if (!validated.ok) return validated;

  const finish = await doorFinishRepository.updateById(id, validated.value);
  if (!finish) {
    return { ok: false, status: 400, message: "Не удалось сохранить покрытие" };
  }
  return { ok: true, finish };
};

const deleteAdminDoorFinish = async (id) => {
  const deleted = await doorFinishRepository.deleteById(id);
  if (!deleted) {
    return { ok: false, status: 404, message: "Покрытие не найдено" };
  }
  return { ok: true };
};

const deleteAdminDoorFinishesByManufacturer = async (query = {}) => {
  const manufacturerName = String(query.manufacturer || "").trim();
  if (!manufacturerName) {
    return { ok: false, status: 400, message: "Укажите производителя" };
  }

  const deleted = await doorFinishRepository.deleteByManufacturer(manufacturerName);
  return { ok: true, deleted, manufacturerName };
};

const normalizeImportRow = (row, { defaultManufacturer = "", rowIndex = 0 }) => {
  const manufacturerName = String(
    getCsvRowValue(row, "manufacturerName", "manufacturer", "manufacturer_name") ??
      defaultManufacturer ??
      "",
  ).trim();
  const name = String(getCsvRowValue(row, "name") ?? "").trim();
  const groupKey = normalizeGroupKey(
    getCsvRowValue(row, "groupKey", "group_key", "group", "группа"),
  );
  const imageUrl = String(getCsvRowValue(row, "imageUrl", "image_url", "image") ?? "").trim();
  const priceDelta = Math.round(
    Number(
      String(getCsvRowValue(row, "priceDelta", "price_delta") ?? "0").replace(/\s/g, ""),
    ) || 0,
  );
  const sortOrder = Number(getCsvRowValue(row, "sortOrder", "sort_order"));
  const isActiveRaw = getCsvRowValue(row, "isActive", "is_active");
  const isActive =
    isActiveRaw === undefined || isActiveRaw === null || isActiveRaw === ""
      ? true
      : !["0", "false", "no"].includes(String(isActiveRaw).trim().toLowerCase());

  if (!manufacturerName) {
    return { error: `Строка ${rowIndex + 1}: не указан manufacturer` };
  }
  if (!name) {
    return { error: `Строка ${rowIndex + 1}: не указано name` };
  }

  return {
    value: {
      manufacturerName,
      name,
      groupKey,
      imageUrl,
      priceDelta,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : rowIndex,
      isActive,
    },
  };
};

const importDoorFinishesFromRows = async (rows, options = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return { ok: false, status: 400, message: "Передайте непустой массив rows" };
  }

  const defaultManufacturer = String(options.defaultManufacturer || "").trim();
  const errors = [];
  let imported = 0;

  for (let index = 0; index < list.length; index += 1) {
    const normalized = normalizeImportRow(list[index], {
      defaultManufacturer,
      rowIndex: index,
    });
    if (normalized.error) {
      errors.push(normalized.error);
      continue;
    }

    try {
      const finish = await doorFinishRepository.upsertFinish(normalized.value);
      if (!finish) {
        errors.push(`Строка ${index + 1}: не удалось сохранить`);
        continue;
      }
      imported += 1;
    } catch (error) {
      errors.push(
        `Строка ${index + 1}: ${error instanceof Error ? error.message : "ошибка сохранения"}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    imported,
    total: list.length,
    errors,
  };
};

const updateAdminDoorFinishPickerSettings = async (body) => {
  const normalized = normalizeDoorFinishPickerSettings(body);
  const pickerSettings = await doorFinishPickerSettingsRepository.updateDoorFinishPickerSettings(
    normalized,
  );
  return { ok: true, pickerSettings };
};

module.exports = {
  listAdminDoorFinishes,
  createAdminDoorFinish,
  updateAdminDoorFinish,
  deleteAdminDoorFinish,
  deleteAdminDoorFinishesByManufacturer,
  normalizeImportRow,
  importDoorFinishesFromRows,
  updateAdminDoorFinishPickerSettings,
};
