const doorHardwareServiceRepository = require("../repositories/doorHardwareServiceRepository");

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

const listAdminDoorHardwareServices = async (query = {}) => {
  const manufacturer = String(query.manufacturer || "").trim();
  const activeOnly = String(query.activeOnly || "").trim() === "1";

  const [manufacturers, services] = await Promise.all([
    doorHardwareServiceRepository.listManufacturers(),
    doorHardwareServiceRepository.listServices({
      manufacturerName: manufacturer,
      activeOnly,
    }),
  ]);

  return {
    ok: true,
    manufacturers: mergeManufacturers(manufacturers),
    services,
    selectedManufacturer: manufacturer,
  };
};

const validateHardwarePayload = (body, { requireName = true, requireCode = true } = {}) => {
  const manufacturerName = String(body?.manufacturerName || "").trim();
  const code = String(body?.code || "").trim();
  const name = String(body?.name || "").trim();
  const price = Math.round(Number(body?.price) || 0);
  const sortOrder = Number(body?.sortOrder) || 0;
  const isActive = body?.isActive !== false;

  if (!manufacturerName) {
    return { ok: false, status: 400, message: "Укажите производителя" };
  }
  if (requireCode && !code) {
    return { ok: false, status: 400, message: "Укажите код услуги" };
  }
  if (requireName && !name) {
    return { ok: false, status: 400, message: "Укажите название услуги" };
  }

  return {
    ok: true,
    value: {
      manufacturerName,
      code,
      name,
      price,
      sortOrder,
      isActive,
    },
  };
};

const createAdminDoorHardwareService = async (body) => {
  const validated = validateHardwarePayload(body);
  if (!validated.ok) return validated;

  const service = await doorHardwareServiceRepository.upsertService(validated.value);
  if (!service) {
    return { ok: false, status: 400, message: "Не удалось создать услугу" };
  }
  return { ok: true, service };
};

const updateAdminDoorHardwareService = async (id, body) => {
  const existing = await doorHardwareServiceRepository.getById(id);
  if (!existing) {
    return { ok: false, status: 404, message: "Услуга не найдена" };
  }

  const validated = validateHardwarePayload(
    {
      manufacturerName: body?.manufacturerName ?? existing.manufacturerName,
      code: body?.code ?? existing.code,
      name: body?.name ?? existing.name,
      price: body?.price ?? existing.price,
      sortOrder: body?.sortOrder ?? existing.sortOrder,
      isActive: body?.isActive ?? existing.isActive,
    },
    { requireName: true, requireCode: true },
  );
  if (!validated.ok) return validated;

  const service = await doorHardwareServiceRepository.updateById(id, validated.value);
  if (!service) {
    return { ok: false, status: 400, message: "Не удалось сохранить услугу" };
  }
  return { ok: true, service };
};

const deleteAdminDoorHardwareService = async (id) => {
  const deleted = await doorHardwareServiceRepository.deleteById(id);
  if (!deleted) {
    return { ok: false, status: 404, message: "Услуга не найдена" };
  }
  return { ok: true };
};

module.exports = {
  listAdminDoorHardwareServices,
  validateHardwarePayload,
  createAdminDoorHardwareService,
  updateAdminDoorHardwareService,
  deleteAdminDoorHardwareService,
};
