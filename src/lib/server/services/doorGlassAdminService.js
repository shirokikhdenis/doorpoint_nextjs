const doorGlassOptionRepository = require("../repositories/doorGlassOptionRepository");
const { getCsvRowValue, parseActiveFlag } = require("../domain/doorGlassCsv");

const KNOWN_MANUFACTURERS = ["Аэлита"];

const mergeManufacturers = (fromDb) => {
  const seen = new Map();
  for (const name of [...KNOWN_MANUFACTURERS, ...fromDb]) {
    const trimmed = String(name || "").trim();
    if (!trimmed) continue;
    seen.set(trimmed.toLowerCase(), trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "ru"));
};

const listAdminDoorGlassOptions = async (query = {}) => {
  const manufacturer = String(query.manufacturer || "").trim();
  const parentSku = String(query.parent_sku || query.parentSku || "").trim();
  const activeOnly = String(query.activeOnly || "").trim() === "1";

  const [manufacturers, options] = await Promise.all([
    doorGlassOptionRepository.listManufacturers(),
    doorGlassOptionRepository.listOptions({
      manufacturerName: manufacturer,
      parentSku,
      activeOnly,
    }),
  ]);

  return {
    ok: true,
    manufacturers: mergeManufacturers(manufacturers),
    options,
    selectedManufacturer: manufacturer,
    selectedParentSku: parentSku,
  };
};

const validateGlassPayload = (body, { requireGlassName = true, requireParentSku = true } = {}) => {
  const manufacturerName = String(body?.manufacturerName || "").trim();
  const parentSku = String(body?.parentSku || body?.parent_sku || "").trim();
  const glassName = String(body?.glassName || body?.glass_name || "").trim();
  const priceDelta = Math.round(Number(body?.priceDelta ?? body?.price_delta) || 0);
  const sortOrder = Number(body?.sortOrder ?? body?.sort_order) || 0;
  const isActive = body?.isActive !== false;

  if (!manufacturerName) {
    return { ok: false, status: 400, message: "Укажите производителя" };
  }
  if (requireParentSku && !parentSku) {
    return { ok: false, status: 400, message: "Укажите родительский SKU" };
  }
  if (requireGlassName && !glassName) {
    return { ok: false, status: 400, message: "Укажите название стекла" };
  }

  return {
    ok: true,
    value: {
      manufacturerName,
      parentSku,
      glassName,
      priceDelta,
      sortOrder,
      isActive,
    },
  };
};

const createAdminDoorGlassOption = async (body) => {
  const validated = validateGlassPayload(body);
  if (!validated.ok) return validated;

  const exists = await doorGlassOptionRepository.productParentSkuExists(validated.value.parentSku);
  if (!exists) {
    return { ok: false, status: 400, message: `Родительский SKU не найден: ${validated.value.parentSku}` };
  }

  const option = await doorGlassOptionRepository.upsertOption(validated.value);
  if (!option) {
    return { ok: false, status: 400, message: "Не удалось создать опцию стекла" };
  }
  return { ok: true, option };
};

const updateAdminDoorGlassOption = async (id, body) => {
  const existing = await doorGlassOptionRepository.getById(id);
  if (!existing) {
    return { ok: false, status: 404, message: "Опция стекла не найдена" };
  }

  const validated = validateGlassPayload(
    {
      manufacturerName: body?.manufacturerName ?? existing.manufacturerName,
      parentSku: body?.parentSku ?? body?.parent_sku ?? existing.parentSku,
      glassName: body?.glassName ?? body?.glass_name ?? existing.glassName,
      priceDelta: body?.priceDelta ?? body?.price_delta ?? existing.priceDelta,
      sortOrder: body?.sortOrder ?? body?.sort_order ?? existing.sortOrder,
      isActive: body?.isActive ?? existing.isActive,
    },
    { requireGlassName: true, requireParentSku: true },
  );
  if (!validated.ok) return validated;

  const exists = await doorGlassOptionRepository.productParentSkuExists(validated.value.parentSku);
  if (!exists) {
    return { ok: false, status: 400, message: `Родительский SKU не найден: ${validated.value.parentSku}` };
  }

  const option = await doorGlassOptionRepository.updateById(id, validated.value);
  if (!option) {
    return { ok: false, status: 400, message: "Не удалось сохранить опцию стекла" };
  }
  return { ok: true, option };
};

const deleteAdminDoorGlassOption = async (id) => {
  const deleted = await doorGlassOptionRepository.deleteById(id);
  if (!deleted) {
    return { ok: false, status: 404, message: "Опция стекла не найдена" };
  }
  return { ok: true };
};

const normalizeImportRow = async (row, { defaultManufacturer = "", rowIndex = 0 }) => {
  const manufacturerName = String(
    getCsvRowValue(row, "manufacturerName", "manufacturer", "manufacturer_name") ??
      defaultManufacturer ??
      "",
  ).trim();
  const parentSku = String(
    getCsvRowValue(row, "parentSku", "parent_sku", "parent sku") ?? "",
  ).trim();
  const glassName = String(
    getCsvRowValue(row, "glassName", "glass_name", "glass") ?? "",
  ).trim();
  const priceDelta = Math.round(
    Number(String(getCsvRowValue(row, "priceDelta", "price_delta") ?? "0").replace(/\s/g, "")) || 0,
  );
  const sortOrder = Number(getCsvRowValue(row, "sortOrder", "sort_order") ?? 0) || 0;
  const isActive = parseActiveFlag(getCsvRowValue(row, "isActive", "is_active"), true);

  if (!manufacturerName) {
    return { error: `Строка ${rowIndex + 1}: укажите manufacturer` };
  }
  if (!parentSku) {
    return { error: `Строка ${rowIndex + 1}: укажите parent_sku` };
  }
  if (!glassName) {
    return { error: `Строка ${rowIndex + 1}: укажите glass_name` };
  }

  const exists = await doorGlassOptionRepository.productParentSkuExists(parentSku);
  if (!exists) {
    return { error: `Строка ${rowIndex + 1}: parent_sku «${parentSku}» не найден в products.sku` };
  }

  return {
    value: {
      manufacturerName,
      parentSku,
      glassName,
      priceDelta,
      sortOrder,
      isActive,
    },
  };
};

const importDoorGlassOptionsFromRows = async (rows, options = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return { ok: false, status: 400, message: "Нет строк для импорта" };
  }

  const errors = [];
  let imported = 0;

  for (let index = 0; index < list.length; index += 1) {
    const normalized = await normalizeImportRow(list[index], {
      defaultManufacturer: options.defaultManufacturer || "",
      rowIndex: index,
    });
    if (normalized.error) {
      errors.push(normalized.error);
      continue;
    }

    const option = await doorGlassOptionRepository.upsertOption(normalized.value);
    if (!option) {
      errors.push(`Строка ${index + 1}: не удалось сохранить`);
      continue;
    }
    imported += 1;
  }

  return {
    ok: errors.length === 0 || imported > 0,
    imported,
    total: list.length,
    errors,
  };
};

module.exports = {
  listAdminDoorGlassOptions,
  validateGlassPayload,
  createAdminDoorGlassOption,
  updateAdminDoorGlassOption,
  deleteAdminDoorGlassOption,
  normalizeImportRow,
  importDoorGlassOptionsFromRows,
};
