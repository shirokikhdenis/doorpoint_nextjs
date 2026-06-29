const leadRepository = require("../repositories/leadRepository");
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
  const items = await leadRepository.listLeads({ status, type, limit, offset, search });
  return { ok: true, items };
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
