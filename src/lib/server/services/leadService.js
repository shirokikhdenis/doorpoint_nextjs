const leadRepository = require("../repositories/leadRepository");
const interiorInstallRepository = require("../repositories/interiorInstallRepository");
const {
  validateAdminOrderPayload,
  validateCartLeadPayload,
  validateMeasureLeadPayload,
  validateLeadPatch,
  LEAD_TYPES,
} = require("../domain/leadValidation");

const createAdminOrder = async (body) => {
  const validation = validateAdminOrderPayload(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const createCartLead = async (body, meta = {}) => {
  const validation = validateCartLeadPayload(body, meta);
  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const createMeasureLead = async (body, meta = {}) => {
  const validation = validateMeasureLeadPayload(body, meta);
  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.message };
  }

  const lead = await leadRepository.createLeadWithItems(validation.data, validation.data.items);
  return { ok: true, lead };
};

const listLeads = async (query = {}) => {
  const status = query.status ? String(query.status).trim() : undefined;
  const type = query.type ? String(query.type).trim() : undefined;
  if (type && !LEAD_TYPES.includes(type)) {
    return { ok: false, status: 400, message: "Некорректный тип заявки" };
  }

  const limit = query.limit;
  const offset = query.offset;
  const search = query.search ? String(query.search).trim() : undefined;
  const hideEstimates =
    query.hideEstimates === "0" || query.hideEstimates === "false" ? false : true;
  const excludeStatuses =
    hideEstimates && status !== "estimate" ? ["estimate"] : undefined;
  const items = await leadRepository.listLeads({
    status,
    type,
    limit,
    offset,
    search,
    excludeStatuses,
  });
  if (type !== "admin_order" || items.length === 0) {
    return { ok: true, items };
  }

  const scheduleRows = await interiorInstallRepository.listScheduleDatesByLeadIds(
    items.map((item) => item.id),
  );
  const scheduleByLead = new Map();
  for (const row of scheduleRows) {
    const current = scheduleByLead.get(row.leadId) || {};
    if (row.kind === "delivery") {
      current.deliveryId = row.id;
      current.deliveryDate = row.installDate;
      current.deliveryEndDate = row.installEndDate;
    } else {
      current.installId = row.id;
      current.installDate = row.installDate;
      current.installEndDate = row.installEndDate;
    }
    scheduleByLead.set(row.leadId, current);
  }

  return {
    ok: true,
    items: items.map((item) => {
      const schedule = scheduleByLead.get(item.id) || {};
      return {
        ...item,
        installId: schedule.installId ?? null,
        installDate: schedule.installDate ?? null,
        installEndDate: schedule.installEndDate ?? null,
        deliveryId: schedule.deliveryId ?? null,
        deliveryDate: schedule.deliveryDate ?? null,
        deliveryEndDate: schedule.deliveryEndDate ?? null,
      };
    }),
  };
};

const getLeadById = async (id) => {
  const lead = await leadRepository.getLeadById(id);
  if (!lead) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, lead };
};

const updateLead = async (id, body) => {
  const validation = validateLeadPatch(body);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const lead = await leadRepository.updateLead(id, validation.data);
  if (!lead) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, lead };
};

const deleteLead = async (id) => {
  const deletedId = await leadRepository.deleteLead(id);
  if (!deletedId) return { ok: false, status: 404, message: "Заявка не найдена" };
  return { ok: true, id: deletedId };
};

module.exports = {
  createAdminOrder,
  createCartLead,
  createMeasureLead,
  listLeads,
  getLeadById,
  updateLead,
  deleteLead,
};
